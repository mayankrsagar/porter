import bcrypt from 'bcryptjs';
import fs from 'fs';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import cloudinary, { deleteFromCloudinary } from '../utils/cloudinary.js';

const createToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Helper to safely delete local files
const deleteLocalFile = (path) => {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const userData = { name, email, password: hashed };

    // Handle avatar upload
    if (req.file) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "porter/avatars",
          resource_type: "auto",
          transformation: [
            { width: 300, height: 300, crop: "fill", gravity: "face" },
          ],
        });

        userData.avatar = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };

        // Clean up local file AFTER successful upload
        deleteLocalFile(req.file.path);
      } catch (uploadError) {
        // Clean up file even on upload failure
        deleteLocalFile(req.file.path);
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          message: "Avatar upload failed",
          error: uploadError.message,
        });
      }
    }

    const user = await User.create(userData);
    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json({ user: safeUser });
  } catch (err) {
    console.error("Register error:", err);

    // Clean up file if it exists
    if (req.file) {
      deleteLocalFile(req.file.path);
    }

    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, password } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);

    // Handle new avatar upload
    if (req.file) {
      // Delete old avatar from Cloudinary if it exists
      if (user.avatar?.public_id) {
        await deleteFromCloudinary(user.avatar.public_id);
      }

      try {
        // Upload new avatar
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "porter/avatars",
          resource_type: "auto",
          transformation: [
            { width: 300, height: 300, crop: "fill", gravity: "face" },
          ],
        });

        user.avatar = {
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        };

        // Clean up local file AFTER successful upload
        deleteLocalFile(req.file.path);
      } catch (uploadError) {
        // Clean up file even on upload failure
        deleteLocalFile(req.file.path);
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          message: "Avatar upload failed",
          error: uploadError.message,
        });
      }
    }

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Update profile error:", err);

    // Clean up file if it exists
    if (req.file) {
      deleteLocalFile(req.file.path);
    }

    res.status(500).json({ message: "Server error", error: err.message });
  }
};
