// routes/vehicleRoutes.js
import express from "express";

import {
  assignDriverToVehicle,
  createVehicle,
  getVehicleById,
  getVehicleLocationsForMap,
  getVehicleOverviewStats,
  getVehicles,
  updateVehicleLocation,
  updateVehicleStatus,
} from "../controllers/vehicleController.js";

const router = express.Router();

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
router.patch("/:id/assign", requireAuth, requireRole("admin"), assignVehicle);
export default router;
