// backend/routes/admin.js
import express from 'express';

import {
  createDriver,
  listDrivers,
  updateDriver,
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../utils/multerConfig.js';

const router = express.Router();

// CREATE driver
router.post(
  "/drivers",
  requireAuth,
  requireRole("admin"),
  upload.single("avatar"),
  createDriver
);

// LIST drivers
router.get("/drivers", requireAuth, requireRole("admin"), listDrivers);

// UPDATE / EDIT driver
router.patch("/drivers/:id", requireAuth, requireRole("admin"), updateDriver);

export default router;
