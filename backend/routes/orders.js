// routes/orderRoutes.js
import express from "express";

import {
  assignDriverToOrder,
  cancelOrder,
  createOrder,
  getOrderById,
  getOrderOverviewStats,
  getOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getOrders);
router.get("/stats/overview", getOrderOverviewStats);
router.get("/:id", getOrderById);

router.post("/", createOrder);

router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/assign-driver", assignDriverToOrder);
router.patch("/:id/cancel", cancelOrder);

export default router;
