import mongoose from "mongoose";

import Driver from "../models/Driver.js";
import Order from "../models/Order.js";
/**
 * Helper: resolveDriverIdentifier(identifier)
 * Accepts:
 *  - ObjectId string -> findById
 *  - DRV-xxxxx driverId -> findOne({ driverId })
 *  - email-like (contains '@') -> findOne({"personalInfo.email": email})
 *  - phone-like (digits) -> findOne({"personalInfo.phone": phone})
 * Falls back to null if not found.
 */
import Vehicle from "../models/Vehicle.js"; // add this import
import { io } from "../server.js";

// Add this helper (place it near resolveDriverIdentifier / resolveOrderIdentifier)
async function resolveVehicleIdentifier(identifier) {
  if (!identifier) return null;
  identifier = String(identifier).trim();

  // If it's an ObjectId
  if (mongoose.isValidObjectId(identifier)) {
    const byId = await Vehicle.findById(identifier).lean();
    if (byId) return byId;
  }

  // Exact vehicleId (human-friendly)
  const byVehicleId = await Vehicle.findOne({ vehicleId: identifier }).lean();
  if (byVehicleId) return byVehicleId;

  // Registration number (normalize spaces/case)
  const normalized = identifier.replace(/\s+/g, "").toUpperCase();
  const byReg = await Vehicle.findOne({
    registrationNumber: { $regex: `^${normalized}$`, $options: "i" },
  }).lean();
  if (byReg) return byReg;

  // Fallback: partial regex match on registrationNumber or vehicleId
  const maybe = await Vehicle.findOne({
    $or: [
      { registrationNumber: { $regex: identifier, $options: "i" } },
      { vehicleId: { $regex: `^${identifier}`, $options: "i" } },
    ],
  }).lean();

  return maybe || null;
}

async function resolveDriverIdentifier(identifier) {
  if (!identifier) return null;
  identifier = String(identifier).trim();

  // If it's an ObjectId string
  if (mongoose.isValidObjectId(identifier)) {
    const byId = await Driver.findById(identifier).lean();
    if (byId) return byId;
  }

  // DRV- prefixed user-facing id
  if (identifier.startsWith("DRV-")) {
    const byDriverId = await Driver.findOne({ driverId: identifier }).lean();
    if (byDriverId) return byDriverId;
  }

  // email-like
  if (identifier.includes("@")) {
    const byEmail = await Driver.findOne({
      "personalInfo.email": identifier.toLowerCase().trim(),
    }).lean();
    if (byEmail) return byEmail;
  }

  // numeric-ish -> phone
  const digits = identifier.replace(/\D/g, "");
  if (digits.length >= 6) {
    const byPhone = await Driver.findOne({
      "personalInfo.phone": { $regex: digits, $options: "i" },
    }).lean();
    if (byPhone) return byPhone;
  }

  // as a last attempt, search driverId or personal name
  const byDriverId2 = await Driver.findOne({ driverId: identifier }).lean();
  if (byDriverId2) return byDriverId2;

  return null;
}

async function resolveOrderIdentifier(identifier) {
  if (!identifier) return null;
  identifier = String(identifier).trim();

  // If valid ObjectId -> use findById (returns Document)
  if (mongoose.isValidObjectId(identifier)) {
    const byId = await Order.findById(identifier);
    if (byId) return byId;
  }

  // Try orderId field (human-friendly order id)
  const byOrderId = await Order.findOne({ orderId: identifier });
  if (byOrderId) return byOrderId;

  // fallback: try regex partial match on orderId
  const maybe = await Order.findOne({
    orderId: { $regex: `^${identifier}`, $options: "i" },
  });
  if (maybe) return maybe;

  return null;
}

/* -------------------
   Controllers
   ------------------- */

// Get all orders with optional filters and paging
export async function getOrders(req, res) {
  try {
    const {
      status,
      customerPhone,
      vehicleType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      q,
      mine, // optional query flag
    } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
    if (status) filter.status = status;
    if (customerPhone) filter["customer.phone"] = customerPhone;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    if (q && q.trim()) {
      const qq = q.trim();
      filter.$or = [
        { orderId: { $regex: qq, $options: "i" } },
        { "customer.name": { $regex: qq, $options: "i" } },
        { "customer.phone": { $regex: qq, $options: "i" } },
      ];
    }

    // support mine=true to fetch only the authenticated user's orders
    // NOTE: requires req.user to be set by your auth middleware (if not present, returns 401)
    if (String(mine) === "true") {
      if (!req.user) {
        return res
          .status(401)
          .json({ error: "Authentication required for mine=true" });
      }

      // If the logged-in user is a driver, return orders assigned to that driver
      if (req.user.role === "driver") {
        // find driver record for this user
        const drv = await Driver.findOne({ user: req.user._id }).lean();
        if (drv) {
          filter.assignedDriver = drv._id;
        } else {
          // no driver profile -> empty
          return res.json({
            orders: [],
            total: 0,
            totalPages: 0,
            currentPage: pageNum,
          });
        }
      } else {
        // assume normal customer user - orders stored under customer.user
        filter["customer.user"] = req.user._id;
      }
    }

    const orders = await Order.find(filter)
      .populate(
        "assignedDriver",
        "personalInfo.firstName personalInfo.lastName driverId"
      )
      .populate("assignedVehicle", "registrationNumber type vehicleId")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
    });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get orders for current user (explicit route /orders/my)
export async function getMyOrders(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { page = 1, limit = 20, q } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    let filter = {};

    // DRIVER FLOW
    if (req.user.role === "driver") {
      const driver = await Driver.findOne({ user: req.user._id });
      if (!driver) {
        return res.json({
          orders: [],
          total: 0,
          totalPages: 0,
          currentPage: pageNum,
        });
      }
      filter.assignedDriver = driver._id;
    }
    // CUSTOMER FLOW
    else {
      filter.createdBy = req.user._id;
    }

    if (q?.trim()) {
      filter.$or = [
        { orderId: new RegExp(q, "i") },
        { "customer.name": new RegExp(q, "i") },
        { "customer.phone": new RegExp(q, "i") },
      ];
    }

    const orders = await Order.find(filter)
      .populate(
        "assignedDriver",
        "personalInfo.firstName personalInfo.lastName driverId"
      )
      .populate("assignedVehicle", "registrationNumber type vehicleId")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Order.countDocuments(filter);

    return res.json({
      orders,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("getMyOrders error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get single order
// New - uses resolveOrderIdentifier to accept ObjectId or human orderId
export async function getOrderById(req, res) {
  try {
    const order = await resolveOrderIdentifier(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    await order.populate("assignedDriver");
    await order.populate("assignedVehicle");
    await order.populate("customer");

    res.json(order);
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Create order
export async function createOrder(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const order = new Order({
      ...req.body,
      createdBy: req.user._id, // 🔑 LINK ORDER TO USER
    });

    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "pending",
      location: order.pickupLocation?.address,
      notes: "Order created",
      timestamp: new Date(),
    });

    await order.save();

    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    io.to("fleet-updates").emit("order-created", order);

    res.status(201).json(order);
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(400).json({ error: error.message });
  }
}

// Update order status (patch /orders/:id/status)
export async function updateOrderStatus(req, res) {
  try {
    const { status, location, notes } = req.body;
    const order = await resolveOrderIdentifier(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    order.timeline = order.timeline || [];
    order.timeline.push({
      status,
      location: location || order.pickupLocation?.address,
      notes: notes || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    if (status === "delivered") {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("order-status-changed", order);

    res.json(order);
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(400).json({ error: error.message });
  }
}

// Assign driver to order (admin-friendly endpoint) - accepts driverId, vehicleId in flexible formats
export async function assignDriverToOrder(req, res) {
  try {
    const { driverId: driverIdent, vehicleId: vehicleIdent } = req.body;
    const order = await resolveOrderIdentifier(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // resolve driver
    let driverDoc = null;
    if (driverIdent) {
      driverDoc = await resolveDriverIdentifier(driverIdent);
      if (!driverDoc) {
        return res
          .status(400)
          .json({ error: `Driver not found for identifier: ${driverIdent}` });
      }
    }

    // resolve vehicle
    let vehicleDoc = null;
    if (vehicleIdent) {
      vehicleDoc = await resolveVehicleIdentifier(vehicleIdent);
      if (!vehicleDoc) {
        return res
          .status(400)
          .json({ error: `Vehicle not found for identifier: ${vehicleIdent}` });
      }
    }

    // Apply assignment
    if (driverDoc) order.assignedDriver = driverDoc._id;
    if (vehicleDoc) order.assignedVehicle = vehicleDoc._id;
    order.status = "assigned";
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "assigned",
      location: order.pickupLocation?.address,
      notes: `Driver assigned: ${
        driverDoc ? driverDoc.driverId || driverDoc._id : "unknown"
      }`,
      timestamp: new Date(),
    });

    await order.save();

    // Update driver: set currentOrder and status if driver found (best-effort)
    if (driverDoc) {
      try {
        await Driver.findByIdAndUpdate(
          driverDoc._id,
          { currentOrder: order._id, status: "busy" },
          { new: true }
        );
      } catch (e) {
        console.warn("Failed to update driver after assignment:", e.message);
      }
    }

    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("driver-assigned", order);

    res.json(order);
  } catch (error) {
    console.error("assignDriverToOrder error:", error);
    res.status(400).json({ error: error.message || String(error) });
  }
}

// Cancel order
export async function cancelOrder(req, res) {
  try {
    const { reason } = req.body;
    const order = await resolveOrderIdentifier(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "cancelled";
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "cancelled",
      location: order.pickupLocation?.address,
      notes: reason || "Order cancelled",
      timestamp: new Date(),
    });

    await order.save();

    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("order-cancelled", order);

    res.json(order);
  } catch (error) {
    console.error("cancelOrder error:", error);
    res.status(400).json({ error: error.message });
  }
}

// Patch order - supports assignment and status updates in one endpoint
export async function patchOrder(req, res) {
  try {
    const {
      driverId: driverIdent,
      vehicleId: vehicleIdent,
      status,
      location,
      notes,
    } = req.body;
    const orderId = req.params.id;

    const order = await resolveOrderIdentifier(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // If frontend sent driverId or vehicleId => assignment flow (resolve them)
    let driverDoc = null;
    let vehicleDoc = null;

    if (driverIdent) {
      driverDoc = await resolveDriverIdentifier(driverIdent);
      if (!driverDoc)
        return res
          .status(400)
          .json({ error: `Driver not found for identifier: ${driverIdent}` });
      order.assignedDriver = driverDoc._id;
    }

    if (vehicleIdent) {
      vehicleDoc = await resolveVehicleIdentifier(vehicleIdent);
      if (!vehicleDoc)
        return res
          .status(400)
          .json({ error: `Vehicle not found for identifier: ${vehicleIdent}` });
      order.assignedVehicle = vehicleDoc._id;
    }

    // if we performed assignment but status wasn't explicitly provided, set to 'assigned'
    if ((driverDoc || vehicleDoc) && !status) {
      order.status = "assigned";
      order.timeline = order.timeline || [];
      order.timeline.push({
        status: "assigned",
        location: location || order.pickupLocation?.address,
        notes:
          notes ||
          `Driver assigned: ${
            driverDoc ? driverDoc.driverId || driverDoc._id : "unknown"
          }`,
        timestamp: new Date(),
      });
    }

    // If status explicitly provided, apply status update
    if (status) {
      order.status = status;
      order.timeline = order.timeline || [];
      order.timeline.push({
        status,
        location: location || order.pickupLocation?.address,
        notes: notes || `Status updated to ${status}`,
        timestamp: new Date(),
      });

      if (status === "delivered") {
        order.actualDeliveryTime = new Date();
      }
    }

    await order.save();

    // Update driver (mark busy / assign currentOrder) if driver assigned
    if (driverDoc) {
      try {
        await Driver.findByIdAndUpdate(
          driverDoc._id,
          { currentOrder: order._id, status: "busy" },
          { new: true }
        );
      } catch (e) {
        console.warn("Failed to update driver after patch:", e.message);
      }
    }

    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("order-status-changed", order);

    if (driverDoc || vehicleDoc) {
      io.to("fleet-updates").emit("driver-assigned", order);
    }

    res.json(order);
  } catch (error) {
    console.error("patchOrder error:", error);
    res.status(400).json({ error: error.message || String(error) });
  }
}

// Stats (overview)
export async function getOrderOverviewStats(req, res) {
  try {
    const { dateFrom, dateTo } = req.query;
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    const stats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          activeOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["confirmed", "assigned", "picked-up", "in-transit"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                "$pricing.totalAmount",
                0,
              ],
            },
          },
          averageOrderValue: { $avg: "$pricing.totalAmount" },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalOrders: 0,
        pendingOrders: 0,
        activeOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      }
    );
  } catch (error) {
    console.error("getOrderOverviewStats error:", error);
    res.status(500).json({ error: error.message });
  }
}

/* -------------------
   Driver job lifecycle endpoints
   ------------------- */

export async function acceptJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;
    const order = await resolveOrderIdentifier(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "pending")
      return res
        .status(400)
        .json({ error: "Order not available for acceptance" });

    const driver = await Driver.findOne({ user: driverUser._id });
    if (!driver)
      return res
        .status(404)
        .json({ error: "Driver profile not found for this user" });

    order.status = "assigned";
    order.assignedDriver = driver._id;
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "assigned",
      location: order.pickupLocation?.address,
      notes: `Assigned to driver ${driver.driverId}`,
      timestamp: new Date(),
    });

    await order.save();

    driver.currentOrder = order._id;
    driver.status = "busy";
    await driver.save();

    io.to("fleet-updates").emit("order-assigned", {
      orderId: order._id,
      driverId: driver._id,
    });
    io.to(`driver-${driverUser._id}`).emit("job-assigned", { order });

    res.json({ order, driver });
  } catch (err) {
    console.error("acceptJob error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function pickupJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;
    const order = await resolveOrderIdentifier(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const driver = await Driver.findOne({ user: driverUser._id });
    if (!driver)
      return res.status(404).json({ error: "Driver profile not found" });

    if (
      !order.assignedDriver ||
      String(order.assignedDriver) !== String(driver._id)
    ) {
      return res
        .status(403)
        .json({ error: "This order is not assigned to you" });
    }

    order.status = "picked-up";
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "picked-up",
      location: order.pickupLocation?.address,
      notes: "Package picked up",
      timestamp: new Date(),
    });

    await order.save();

    io.to("fleet-updates").emit("order-picked-up", {
      orderId: order._id,
      driverId: driver._id,
    });
    io.to(`driver-${driverUser._id}`).emit("job-picked-up", { order });

    res.json({ order });
  } catch (err) {
    console.error("pickupJob error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function completeJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;
    const order = await resolveOrderIdentifier(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const driver = await Driver.findOne({ user: driverUser._id });
    if (!driver)
      return res.status(404).json({ error: "Driver profile not found" });

    if (
      !order.assignedDriver ||
      String(order.assignedDriver) !== String(driver._id)
    ) {
      return res
        .status(403)
        .json({ error: "This order is not assigned to you" });
    }

    order.status = "delivered";
    order.actualDeliveryTime = new Date();
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "delivered",
      location: order.deliveryLocation?.address || "",
      notes: "Delivered",
      timestamp: new Date(),
    });

    await order.save();

    // Update driver
    driver.currentOrder = null;
    driver.status = "active";
    driver.performance = driver.performance || {};
    driver.performance.completedJobs =
      (driver.performance.completedJobs || 0) + 1;
    await driver.save();

    io.to("fleet-updates").emit("order-delivered", {
      orderId: order._id,
      driverId: driver._id,
    });
    io.to(`driver-${driverUser._id}`).emit("job-completed", { order });

    res.json({ order, driver });
  } catch (err) {
    console.error("completeJob error:", err);
    res.status(500).json({ error: err.message });
  }
}

/* Convenience assign/unassign endpoints */
export const assignDriver = async (req, res) => {
  const order = await resolveOrderIdentifier(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const driver = await resolveDriverIdentifier(req.body.driverId);
  if (!driver) return res.status(400).json({ error: "Driver not found" });

  order.assignedDriver = driver._id;

  if (!order.status || ["confirmed"].includes(order.status)) {
    order.status = "assigned";
  }

  await order.save();
  await order.populate("assignedDriver assignedVehicle");

  res.json(order);
};

export const unassignDriver = async (req, res) => {
  const order = await resolveOrderIdentifier(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.assignedDriver = null;

  if (!order.assignedVehicle) {
    order.status = "confirmed";
  }

  await order.save();
  res.json(order);
};

export const assignVehicle = async (req, res) => {
  const order = await resolveOrderIdentifier(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const vehicle = await resolveVehicleIdentifier(req.body.vehicleId);
  if (!vehicle) return res.status(400).json({ error: "Vehicle not found" });

  order.assignedVehicle = vehicle._id;

  if (!order.status || ["confirmed"].includes(order.status)) {
    order.status = "assigned";
  }

  await order.save();
  await order.populate("assignedDriver assignedVehicle");

  res.json(order);
};

export const unassignVehicle = async (req, res) => {
  const order = await resolveOrderIdentifier(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.assignedVehicle = null;

  if (!order.assignedDriver) {
    order.status = "confirmed";
  }

  await order.save();
  res.json(order);
};

export const assignDriverAndVehicle = async (req, res) => {
  const order = await resolveOrderIdentifier(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.body.driverId) {
    const driver = await resolveDriverIdentifier(req.body.driverId);
    if (!driver) return res.status(400).json({ error: "Driver not found" });
    order.assignedDriver = driver._id;
  }

  if (req.body.vehicleId) {
    const vehicle = await resolveVehicleIdentifier(req.body.vehicleId);
    if (!vehicle) return res.status(400).json({ error: "Vehicle not found" });
    order.assignedVehicle = vehicle._id;
  }

  order.status = "assigned";

  await order.save();
  await order.populate("assignedDriver assignedVehicle");

  res.json(order);
};
