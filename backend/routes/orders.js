import express from "express";

import {
  acceptJob,
  assignDriver,
  assignDriverAndVehicle,
  assignDriverToOrder,
  assignVehicle,
  cancelOrder,
  completeJob,
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderOverviewStats,
  getOrders,
  patchOrder,
  pickupJob,
  unassignDriver,
  unassignVehicle,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use("/", requireAuth);

// list (general) and helper endpoints
router.get("/", getOrders);
router.get("/my", getMyOrders); // <- new user-specific endpoint (must be before /:id)
router.get("/stats/overview", getOrderOverviewStats);
router.get("/:id", getOrderById);

router.post("/", createOrder);

// status / assignment helpers
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/assign-driver", assignDriverToOrder);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id", patchOrder);

// extra convenience endpoints (optional admin/driver flows)
router.patch("/:id/assign", assignDriver);
router.patch("/:id/unassign-driver", unassignDriver);
router.patch("/:id/assign-vehicle", assignVehicle);
router.patch("/:id/unassign-vehicle", unassignVehicle);
router.patch("/:id/assign-both", assignDriverAndVehicle);

// driver job lifecycle (expects auth middleware in real app)
router.post("/:orderId/accept", acceptJob);
router.post("/:orderId/pickup", pickupJob);
router.post("/:orderId/complete", completeJob);

export default router;
