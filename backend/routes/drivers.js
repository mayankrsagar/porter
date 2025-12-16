// backend/routes/drivers.js
import express from "express";

import {
  assignVehicleToDriver,
  createDriver,
  getDriverById,
  getDriverLocationsForMap,
  getDriverMe,
  getDriverOverviewStats,
  getDrivers,
  updateDriverLocation,
  updateDriverPerformance,
  updateDriverStatus,
} from "../controllers/driverController.js";
// job actions belong to orderController
import {
  acceptJob,
  completeJob,
  pickupJob,
} from "../controllers/orderController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

router.use("/", requireAuth);
// Admin/management endpoints
router.get("/", getDrivers);
router.get("/stats/overview", getDriverOverviewStats);
router.get("/map/locations", getDriverLocationsForMap);
router.get("/:id", getDriverById);

// Admin-only create/update/delete live in /api/admin (router there)
// If you want to keep an admin create here, ensure requireAuth + requireRole
router.post("/", requireAuth, requireRole("admin"), createDriver);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin"),
  updateDriverStatus
);
router.patch(
  "/:id/location",
  requireAuth,
  requireRole("admin"),
  updateDriverLocation
);
router.patch(
  "/:id/assign-vehicle",
  requireAuth,
  requireRole("admin"),
  assignVehicleToDriver
);
router.patch(
  "/:id/performance",
  requireAuth,
  requireRole("admin"),
  updateDriverPerformance
);

// Driver mobile app endpoints (driver role)
router.get("/me", requireAuth, requireRole("driver"), getDriverMe);
router.get("/jobs", requireAuth, requireRole("driver"), async (req, res) => {
  // you can forward to controller or place logic here
  // kept for backward compatibility: call driverController.getAvailableJobs if you have it
  res.status(204).end();
});

// Job lifecycle (driver-only)
router.post(
  "/jobs/:orderId/accept",
  requireAuth,
  requireRole("driver"),
  acceptJob
);
router.post(
  "/jobs/:orderId/picked-up",
  requireAuth,
  requireRole("driver"),
  pickupJob
);
router.post(
  "/jobs/:orderId/complete",
  requireAuth,
  requireRole("driver"),
  completeJob
);

export default router;
