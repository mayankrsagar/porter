// backend/controllers/adminController.js
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";

import Driver from "../models/Driver.js";
import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";

// Create driver (kept simple but compatible with your Driver schema)
export const createDriver = async (req, res) => {
  try {
    // Accept either 'name' (single string) or firstName/lastName separately
    const {
      name,
      firstName: firstNameRaw,
      lastName: lastNameRaw,
      email: emailRaw,
      password: passwordRaw,
      phone: phoneRaw,
      licenseNumber,
      vehicleId,
      vehicleNumber,
    } = req.body || {};

    const firstName = (
      firstNameRaw ||
      (name || "").split(" ").slice(0, -1).join(" ") ||
      (name || "").split(" ")[0] ||
      ""
    ).trim();
    const lastName = (
      lastNameRaw ||
      (name || "").split(" ").slice(-1).join(" ") ||
      ""
    ).trim();

    const email = (emailRaw || "").toLowerCase().trim();
    const phone = (phoneRaw || "").trim();

    if (!firstName || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    // Check if user/email exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    // Generate password if not provided
    const plainPassword =
      (passwordRaw && passwordRaw.trim()) ||
      crypto.randomBytes(4).toString("hex"); // 8 hex chars

    const hashed = await bcrypt.hash(plainPassword, 10);

    const userData = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      password: hashed,
      role: "driver",
    };

    // avatar upload if provided (multer stores file at req.file.path)
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "porter/avatars",
        resource_type: "auto",
        transformation: [{ width: 300, height: 300, crop: "limit" }],
      });
      userData.avatar = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    const user = new User(userData);
    await user.save();

    // Build driver doc
    const driverData = {
      user: user._id,
      personalInfo: {
        firstName,
        lastName,
        email,
        phone,
      },
      license: {
        number: licenseNumber || "",
      },
      status: "active",
    };

    if (vehicleId) {
      driverData.assignedVehicle = vehicleId;
    } else if (vehicleNumber) {
      // if UI provides only vehicleNumber, leave vehicle assignment to admin update
      driverData.meta = driverData.meta || {};
      driverData.meta.assignedVehicleNumber = vehicleNumber;
    }

    const driver = new Driver(driverData);
    await driver.save();

    // clean up uploaded file from local disk if present
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn("Failed to remove temp file:", e.message);
      }
    }

    // Return plain password so admin can share it with the driver (optional)
    return res.json({
      message: "Driver created",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      driver,
      plainPassword,
    });
  } catch (err) {
    console.error("createDriver error:", err);

    // Cleanup temp file
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        /* ignore */
      }
    }

    // If email duplicate error (unique index) or validation errors
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate key error", error: err.keyValue });
    }

    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// List drivers (with optional status & search)
export const listDrivers = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { "personalInfo.firstName": regex },
        { "personalInfo.lastName": regex },
        { "personalInfo.email": regex },
        { "personalInfo.phone": regex },
        { driverId: regex },
      ];
    }

    const drivers = await Driver.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ drivers });
  } catch (err) {
    console.error("listDrivers error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Update / edit driver (simple: name/phone/status/notes)
export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, status, notes } = req.body;

    const $set = {};
    if (firstName !== undefined) $set["personalInfo.firstName"] = firstName;
    if (lastName !== undefined) $set["personalInfo.lastName"] = lastName;
    if (phone !== undefined) $set["personalInfo.phone"] = phone;
    if (status !== undefined) $set.status = status;
    if (notes !== undefined) $set.notes = notes;

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const driver = await Driver.findByIdAndUpdate(id, { $set }, { new: true });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json({ message: "Driver updated", driver });
  } catch (err) {
    console.error("updateDriver error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// DELETE driver (admin) - remove driver and linked user; cleans up cloudinary avatar if present
export const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Driver id required" });

    const driver = await Driver.findById(id).lean();
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Remove driver document
    await Driver.findByIdAndDelete(id);

    // Remove associated user if exists
    if (driver.user) {
      const user = await User.findById(driver.user);
      if (user) {
        // delete avatar from Cloudinary if present
        try {
          if (user.avatar && user.avatar.public_id) {
            await cloudinary.uploader.destroy(user.avatar.public_id);
          }
        } catch (e) {
          console.warn("Failed to delete avatar from cloudinary:", e.message);
        }
        await User.findByIdAndDelete(user._id);
      }
    }

    return res.json({ message: "Driver and associated user deleted" });
  } catch (err) {
    console.error("deleteDriver error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
