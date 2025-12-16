// routes/vehicleRoutes.js
import express from "express";

import { assignVehicleToDriver } from "../controllers/driverController.js";
import {
  assignDriverToVehicle,
  createVehicle,
  deleteVehicle,
  getVehicleById,
  getVehicleLocationsForMap,
  getVehicleOverviewStats,
  getVehicles,
  listVehicles,
  updateVehicle,
  updateVehicleLocation,
  updateVehicleStatus,
} from "../controllers/vehicleController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();
router.use("/", requireAuth);
router.get("/", getVehicles);
router.get("/stats/overview", getVehicleOverviewStats);
router.get("/map/locations", getVehicleLocationsForMap);
router.get("/:id", getVehicleById);

router.post("/", createVehicle);

router.patch("/:id/status", updateVehicleStatus);
router.patch("/:id/location", updateVehicleLocation);
router.patch("/:id/assign-driver", assignDriverToVehicle);

// Admin only for create/update/delete/assign
router.get("/", requireAuth, listVehicles);
router.post("/", requireAuth, requireRole("admin"), createVehicle);
router.patch("/:id", requireAuth, requireRole("admin"), updateVehicle);
router.delete("/:id", requireAuth, requireRole("admin"), deleteVehicle);
router.patch(
  "/:id/assign",
  requireAuth,
  requireRole("admin"),
  assignVehicleToDriver
);
export default router;
