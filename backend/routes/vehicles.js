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

export default router;
