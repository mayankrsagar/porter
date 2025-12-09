// routes/driverRoutes.js
import express from 'express';

import {
  assignVehicleToDriver,
  createDriver,
  getDriverById,
  getDriverLocationsForMap,
  getDriverOverviewStats,
  getDrivers,
  getMyDriverProfile,
  updateDriverLocation,
  updateDriverPerformance,
  updateDriverStatus,
} from '../controllers/driverController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.get("/", getDrivers);
router.get("/stats/overview", getDriverOverviewStats);
router.get("/map/locations", getDriverLocationsForMap);

// CURRENT DRIVER (protected)
router.get(
  "/me",
  requireAuth,
  requireRole("driver", "admin"),
  getMyDriverProfile
);

router.get("/:id", getDriverById);
router.post("/", createDriver);

router.patch("/:id/status", updateDriverStatus);
router.patch("/:id/location", updateDriverLocation);
router.patch("/:id/assign-vehicle", assignVehicleToDriver);
router.patch("/:id/performance", updateDriverPerformance);

export default router;
