import Customer from "../models/Customer.js";
import Driver from "../models/Driver.js";
import Order from "../models/Order.js";
import Vehicle from "../models/Vehicle.js";

export async function getDashboard(req, res) {
  try {
    const { period = "7d" } = req.query;
    const now = new Date();

    // --- Build date filter (used by some detailed aggregations below) ---
    let dateFilter = {};
    switch (period) {
      case "24h":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        };
        break;
      case "7d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    // -------------------------
    // Lightweight summary (fast, simple aggregations)
    // -------------------------
    const last30Date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // total orders (all time)
    const totalOrdersAgg = await Order.aggregate([
      { $group: { _id: null, totalOrders: { $sum: 1 } } },
    ]);
    const totalOrders = totalOrdersAgg[0]?.totalOrders || 0;

    // orders in last 30 days
    const ordersLast30d = await Order.countDocuments({
      createdAt: { $gte: last30Date },
    });

    // vehicles counts
    const vehiclesTotal = await Vehicle.countDocuments();
    const vehiclesActive = await Vehicle.countDocuments({
      status: "available",
    });

    // drivers counts
    const driversTotal = await Driver.countDocuments();
    const driversActive = await Driver.countDocuments({ status: "active" });

    // revenue (sum of delivered orders totalAmount) - all time
    const revenueAgg = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, totalRevenue: { $sum: "$pricing.totalAmount" } } },
    ]);
    const revenue = revenueAgg[0]?.totalRevenue || 0;

    // currency - try to find a recent order's pricing.currency or fallback
    const lastOrderWithCurrency = await Order.findOne(
      { "pricing.currency": { $exists: true } },
      { "pricing.currency": 1 }
    )
      .sort({ createdAt: -1 })
      .lean();
    const currency = lastOrderWithCurrency?.pricing?.currency || "₹";

    const summary = {
      orders: totalOrders,
      ordersLast30d,
      vehicles: vehiclesTotal,
      vehiclesActive,
      drivers: driversTotal,
      driversActive,
      revenue,
      currency,
    };

    // -------------------------
    // Detailed analytics (keep your existing complex aggregations)
    // -------------------------
    const orderStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                "$pricing.totalAmount",
                0,
              ],
            },
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          averageOrderValue: { $avg: "$pricing.totalAmount" },
          averageDeliveryTime: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$actualDeliveryTime", null] },
                    { $ne: ["$createdAt", null] },
                  ],
                },
                { $subtract: ["$actualDeliveryTime", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const ordersByStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const ordersByVehicleType = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                "$pricing.totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const dailyTrends = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "delivered"] },
                "$pricing.totalAmount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const fleetStats = await Vehicle.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const driverStats = await Driver.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const customerStats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          averageOrderValue: { $avg: "$statistics.averageOrderValue" },
        },
      },
    ]);

    // Respond with both the lightweight summary (for top-cards) and full analytics payload
    res.json({
      summary, // <- frontend-friendly flattened numbers
      overview: {
        orders: orderStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          completedOrders: 0,
          averageOrderValue: 0,
          averageDeliveryTime: 0,
        },
        customers: customerStats[0] || {
          totalCustomers: 0,
          activeCustomers: 0,
          averageOrderValue: 0,
        },
      },
      ordersByStatus,
      ordersByVehicleType,
      dailyTrends,
      fleetStatus: fleetStats,
      driverStatus: driverStats,
    });
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getRevenue(req, res) {
  try {
    const { period = "30d" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1y":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    const revenueByTime = await Order.aggregate([
      { $match: { ...dateFilter, status: "delivered" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$pricing.totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const revenueByVehicleType = await Order.aggregate([
      { $match: { ...dateFilter, status: "delivered" } },
      {
        $group: {
          _id: "$vehicleType",
          revenue: { $sum: "$pricing.totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]);

    const revenueByDriver = await Order.aggregate([
      { $match: { ...dateFilter, status: "delivered" } },
      {
        $lookup: {
          from: "drivers",
          localField: "assignedDriver",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: "$driver" },
      {
        $group: {
          _id: "$assignedDriver",
          driverName: {
            $first: {
              $concat: [
                "$driver.personalInfo.firstName",
                " ",
                "$driver.personalInfo.lastName",
              ],
            },
          },
          revenue: { $sum: "$pricing.totalAmount" },
          orders: { $sum: 1 },
          averageRating: { $avg: "$rating.driverRating" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      revenueByTime,
      revenueByVehicleType,
      revenueByDriver,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getOperations(req, res) {
  try {
    const { period = "30d" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter.createdAt = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    const deliveryTimeByVehicle = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          status: "delivered",
          actualDeliveryTime: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$vehicleType",
          avgDeliveryTime: {
            $avg: { $subtract: ["$actualDeliveryTime", "$createdAt"] },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const completionRate = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          completionRate: {
            $cond: [
              { $eq: ["$totalOrders", 0] },
              0,
              { $divide: ["$completedOrders", "$totalOrders"] },
            ],
          },
          cancellationRate: {
            $cond: [
              { $eq: ["$totalOrders", 0] },
              0,
              { $divide: ["$cancelledOrders", "$totalOrders"] },
            ],
          },
        },
      },
    ]);

    const fleetUtilization = await Vehicle.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const customerSatisfaction = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          status: "delivered",
          "rating.customerRating": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating.customerRating" },
          totalRatings: { $sum: 1 },
          fiveStar: {
            $sum: { $cond: [{ $eq: ["$rating.customerRating", 5] }, 1, 0] },
          },
          fourStar: {
            $sum: { $cond: [{ $eq: ["$rating.customerRating", 4] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      deliveryTimeByVehicle,
      completionRate: completionRate[0] || {
        completionRate: 0,
        cancellationRate: 0,
      },
      fleetUtilization,
      customerSatisfaction: customerSatisfaction[0] || {
        averageRating: 0,
        totalRatings: 0,
        fiveStar: 0,
        fourStar: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
