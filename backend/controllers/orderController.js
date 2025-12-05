// controllers/orderController.js
import Order from "../models/Order.js";
import { io } from "../server.js";

// Get all orders with filtering
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
    res.status(500).json({ error: error.message });
  }
}

// Get single order
export async function getOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("assignedDriver")
      .populate("assignedVehicle")
      .populate("customer");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create new order
export async function createOrder(req, res) {
  try {
    const order = new Order(req.body);

    // Add initial timeline entry
    order.timeline.push({
      status: "pending",
      location: order.pickupLocation?.address,
      notes: "Order created",
      // timestamp optional here to match original behaviour
    });

    await order.save();

    // Populate related data
    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    // Emit real-time update
    io.to("fleet-updates").emit("order-created", order);

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update order status
export async function updateOrderStatus(req, res) {
  try {
    const { status, location, notes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;
    order.timeline.push({
      status,
      location: location || order.pickupLocation?.address,
      notes: notes || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    // Update delivery time if delivered
    if (status === "delivered") {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    // Populate related data
    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    // Emit real-time update
    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("order-status-changed", order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Assign driver to order
export async function assignDriverToOrder(req, res) {
  try {
    const { driverId, vehicleId } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.assignedDriver = driverId;
    order.assignedVehicle = vehicleId;
    order.status = "assigned";

    order.timeline.push({
      status: "assigned",
      location: order.pickupLocation?.address,
      notes: `Driver assigned: ${driverId}`,
      timestamp: new Date(),
    });

    await order.save();

    // Populate related data
    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    // Emit real-time update
    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("driver-assigned", order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Cancel order
export async function cancelOrder(req, res) {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = "cancelled";
    order.timeline.push({
      status: "cancelled",
      location: order.pickupLocation?.address,
      notes: reason || "Order cancelled",
      timestamp: new Date(),
    });

    await order.save();

    // Populate related data
    await order.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId"
    );
    await order.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId"
    );

    // Emit real-time update
    io.to(`order-${order._id}`).emit("order-updated", order);
    io.to("fleet-updates").emit("order-cancelled", order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get order statistics
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
    res.status(500).json({ error: error.message });
  }
}
