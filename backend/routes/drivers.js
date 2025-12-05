// routes/driverRoutes.js
import express from "express";

import {
  assignVehicleToDriver,
  createDriver,
  getDriverById,
  getDriverLocationsForMap,
  getDriverOverviewStats,
  getDrivers,
  updateDriverLocation,
  updateDriverPerformance,
  updateDriverStatus,
} from "../controllers/driverController.js";

const router = express.Router();

// Order matters: specific paths first when needed,
// but here all are fine in this order.

router.get("/", getDrivers);
router.get("/stats/overview", getDriverOverviewStats);
router.get("/map/locations", getDriverLocationsForMap);
router.get("/:id", getDriverById);

router.post("/", createDriver);

router.patch("/:id/status", updateDriverStatus);
router.patch("/:id/location", updateDriverLocation);
router.patch("/:id/assign-vehicle", assignVehicleToDriver);
router.patch("/:id/performance", updateDriverPerformance);

export default router;
