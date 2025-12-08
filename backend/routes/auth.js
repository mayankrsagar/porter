import express from "express";

import {
  getMe,
  login,
  logout,
  register,
  updateProfile,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../utils/multerConfig.js"; // ✅ import multer setup

const router = express.Router();

router.post("/register", upload.single("avatar"), register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, upload.single("avatar"), updateProfile);

export default router;
