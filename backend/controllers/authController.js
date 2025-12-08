import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";

const createToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
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

    // If file was uploaded via multer, send to Cloudinary
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "porter/avatars",
      });
      userData.avatar = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
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
    res.status(500).json({ message: "Server error" });
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
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};

export const getMe = async (req, res) => {
  // requireAuth middleware attaches req.user
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

    if (req.file) {
      // remove previous avatar from Cloudinary if exists
      if (user.avatar?.public_id) {
        try {
          await cloudinary.uploader.destroy(user.avatar.public_id);
        } catch (e) {
          console.warn("Cloudinary destroy failed", e);
        }
      }
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "porter/avatars",
      });
      user.avatar = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
