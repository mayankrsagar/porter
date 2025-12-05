// routes/analyticsRoutes.js
import express from "express";

import {
  getDashboard,
  getOperations,
  getRevenue,
} from "../controllers/analyticsController.js";

const router = express.Router();

// prefix mounting is expected to be something like: app.use('/api/analytics', analyticsRoutes)
router.get("/dashboard", getDashboard);
router.get("/revenue", getRevenue);
router.get("/operations", getOperations);

export default router;
