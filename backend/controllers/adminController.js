// backend/controllers/adminController.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';

import Driver from '../models/Driver.js';
import User from '../models/User.js';
import cloudinary from '../utils/cloudinary.js';

// Create driver (kept simple but compatible with your Driver schema)
export const createDriver = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      licenseNumber,
      licenseType,
    } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res
        .status(400)
        .json({ message: "firstName, lastName, email, phone are required" });
    }
    if (!licenseNumber || !licenseType) {
      return res
        .status(400)
        .json({ message: "licenseNumber and licenseType are required" });
    }

    const emailLower = email.toLowerCase();

    // check if user already exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const plainPassword = password || crypto.randomBytes(4).toString("hex");
    const hashed = await bcrypt.hash(plainPassword, 10);

    // Create User with role: driver
    const userData = {
      name: `${firstName} ${lastName}`.trim(),
      email: emailLower,
      password: hashed,
      role: "driver",
    };

    // avatar upload if provided
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "porter/avatars",
      });
      userData.avatar = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
      fs.unlink(req.file.path, () => {});
    }

    const user = await User.create(userData);

    // Create Driver document matching your schema
    const driver = await Driver.create({
      personalInfo: {
        firstName,
        lastName,
        email: emailLower,
        phone,
      },
      license: {
        number: licenseNumber,
        type: licenseType,
      },
      // Rest of fields will use defaults
      profileImage: user.avatar?.url,
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(201).json({
      message: "Driver created",
      user: safeUser,
      driver,
      // NOTE: only send plainPassword when admin did not supply password
      plainPassword: password ? undefined : plainPassword,
    });
  } catch (err) {
    console.error("createDriver error:", err);
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
