// backend/routes/admin.js
import express from 'express';

import {
  createDriver,
  deleteDriver,
  listDrivers,
  updateDriver,
} from '../controllers/adminController.js';
import {
  deleteUser,
  listUsers,
  updateUser,
} from '../controllers/adminUsersController.js'; // <--- new
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../utils/multerConfig.js';

const router = express.Router();

// DRIVER routes (existing)
router.post(
  "/drivers",
  requireAuth,
  requireRole("admin"),
  upload.single("avatar"),
  createDriver
);
router.get("/drivers", requireAuth, requireRole("admin"), listDrivers);
router.patch("/drivers/:id", requireAuth, requireRole("admin"), updateDriver);
router.delete("/drivers/:id", requireAuth, requireRole("admin"), deleteDriver);

// USER routes
router.get("/users", requireAuth, requireRole("admin"), listUsers);
router.patch("/users/:id", requireAuth, requireRole("admin"), updateUser);
router.delete("/users/:id", requireAuth, requireRole("admin"), deleteUser);

export default router;
