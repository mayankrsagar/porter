// controllers/driverController.js
import Driver from "../models/Driver.js";
import Order from "../models/Order.js";
import { io } from "../server.js";

// ==================== ADMIN & MANAGEMENT ENDPOINTS ====================

// Get all drivers with pagination
export async function getDrivers(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
    if (status) filter.status = status;
    const drivers = await Driver.find(filter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select(
        "driverId personalInfo.firstName personalInfo.lastName status currentLocation assignedVehicle currentOrder"
      );

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getDriverMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const email = (req.user.email || "").toLowerCase();
    const driver = await Driver.findOne({ "personalInfo.email": email })
      .populate("assignedVehicle", "registrationNumber type vehicleId status")
      .populate(
        "currentOrder",
        "orderId status pickupLocation deliveryLocation"
      );

    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get single driver by ID
export async function getDriverById(req, res) {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate("assignedVehicle")
      .populate("currentOrder");

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create new driver
export async function createDriver(req, res) {
  try {
    const payload = req.body || {};

    // Basic normalization
    if (payload.personalInfo && payload.personalInfo.email) {
      payload.personalInfo.email = payload.personalInfo.email
        .toLowerCase()
        .trim();
    }
    if (payload.personalInfo && payload.personalInfo.phone) {
      payload.personalInfo.phone = (payload.personalInfo.phone + "").trim();
    }

    // Prevent duplicate by email or phone
    const dupFilter = {};
    if (payload.personalInfo && payload.personalInfo.email) {
      dupFilter["personalInfo.email"] = payload.personalInfo.email;
    }
    if (payload.personalInfo && payload.personalInfo.phone) {
      dupFilter["personalInfo.phone"] = payload.personalInfo.phone;
    }

    if (Object.keys(dupFilter).length) {
      const existing = await Driver.findOne(dupFilter).lean();
      if (existing) {
        return res.status(409).json({
          error: "Driver with same email or phone already exists",
          existingDriverId: existing.driverId,
        });
      }
    }

    const driver = new Driver(payload);
    await driver.save();

    io.to("fleet-updates").emit("driver-created", driver);
    res.status(201).json(driver);
  } catch (error) {
    console.error("createDriver error:", error);
    // Return Mongoose validation messages when available
    if (error && error.name === "ValidationError") {
      const details = {};
      for (const k in error.errors) {
        details[k] = error.errors[k].message;
      }
      return res.status(400).json({ error: "Validation failed", details });
    }
    res.status(500).json({ error: error.message || String(error) });
  }
}

// Update driver status
export async function updateDriverStatus(req, res) {
  try {
    const { status, location } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    driver.status = status;
    if (location) {
      driver.currentLocation = {
        ...location,
        lastUpdated: new Date(),
      };
    }

    await driver.save();
    await driver.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId status"
    );
    await driver.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("driver-updated", driver);
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update driver location only
export async function updateDriverLocation(req, res) {
  try {
    const { coordinates, address } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    driver.currentLocation = {
      coordinates,
      address,
      lastUpdated: new Date(),
    };

    await driver.save();
    await driver.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId status"
    );
    await driver.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("driver-location-updated", {
      driverId: driver._id,
      location: driver.currentLocation,
    });

    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Assign vehicle to driver
export async function assignVehicleToDriver(req, res) {
  try {
    const { vehicleId } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    driver.assignedVehicle = vehicleId;
    await driver.save();

    await driver.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId status"
    );
    await driver.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("driver-updated", driver);
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update driver performance metrics
export async function updateDriverPerformance(req, res) {
  try {
    const { deliveryCompleted, rating, distance } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    if (deliveryCompleted) {
      driver.performance.totalDeliveries += 1;
      driver.performance.totalDistance += distance || 0;
      driver.performance.onTimeDeliveries += 1;
    }

    if (rating) {
      const totalRatings = driver.performance.customerFeedback.length;
      const currentTotal = driver.performance.averageRating * totalRatings;
      driver.performance.averageRating =
        (currentTotal + rating) / (totalRatings + 1);

      driver.performance.customerFeedback.push({
        rating,
        date: new Date(),
      });
    }

    await driver.save();
    await driver.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId status"
    );
    await driver.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("driver-updated", driver);
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get aggregated driver statistics
export async function getDriverOverviewStats(req, res) {
  try {
    const stats = await Driver.aggregate([
      {
        $group: {
          _id: null,
          totalDrivers: { $sum: 1 },
          availableDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
          },
          busyDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "busy"] }, 1, 0] },
          },
          offlineDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "offline"] }, 1, 0] },
          },
          suspendedDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
          },
          averageRating: { $avg: "$performance.averageRating" },
          totalDeliveries: { $sum: "$performance.totalDeliveries" },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalDrivers: 0,
        availableDrivers: 0,
        busyDrivers: 0,
        offlineDrivers: 0,
        suspendedDrivers: 0,
        averageRating: 0,
        totalDeliveries: 0,
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get drivers for map view
export async function getDriverLocationsForMap(req, res) {
  try {
    const drivers = await Driver.find({
      status: { $in: ["available", "busy"] },
      "currentLocation.coordinates.lat": { $ne: 0 },
      "currentLocation.coordinates.lng": { $ne: 0 },
    })
      .populate("assignedVehicle", "registrationNumber type vehicleId status")
      .populate(
        "currentOrder",
        "orderId status pickupLocation deliveryLocation"
      )
      .select(
        "driverId personalInfo.firstName personalInfo.lastName status currentLocation assignedVehicle currentOrder"
      );

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== DRIVER MOBILE APP ENDPOINTS ====================

// Get current driver's profile
export async function getMyDriverProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const email = (req.user.email || "").toLowerCase();
    const driver = await Driver.findOne({ "personalInfo.email": email })
      .populate("assignedVehicle", "registrationNumber type vehicleId status")
      .populate(
        "currentOrder",
        "orderId status pickupLocation deliveryLocation"
      );

    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    res.json({ driver });
  } catch (error) {
    console.error("getMyDriverProfile error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get available jobs for drivers
export async function getAvailableJobs(req, res) {
  try {
    const jobs = await Order.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    res.json({ jobs });
  } catch (err) {
    console.error("getAvailableJobs error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Accept a job
export async function acceptJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Order not available for acceptance" });
    }

    order.status = "assigned";
    order.assignedDriver = driverUser._id;
    order.assignedAt = new Date();
    await order.save();

    const driver = await Driver.findOne({
      "personalInfo.email": driverUser.email,
    });
    if (driver) {
      driver.currentOrder = order._id;
      driver.status = "busy";
      await driver.save();
    }

    io.to("fleet-updates").emit("order-assigned", {
      orderId: order._id,
      driverId: driver?._id,
    });
    io.to(`driver-${driverUser._id}`).emit("job-assigned", { order });

    res.json({ order, driver });
  } catch (err) {
    console.error("acceptJob error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Mark job as picked up
export async function pickupJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (
      !order.assignedDriver ||
      String(order.assignedDriver) !== String(driverUser._id)
    ) {
      return res
        .status(403)
        .json({ error: "This order is not assigned to you" });
    }

    order.status = "picked-up";
    order.pickedUpAt = new Date();
    await order.save();

    io.to("fleet-updates").emit("order-picked-up", {
      orderId: order._id,
      driverId: driverUser._id,
    });
    io.to(`driver-${driverUser._id}`).emit("job-picked-up", { order });

    res.json({ order });
  } catch (err) {
    console.error("pickupJob error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Complete a job
export async function completeJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (
      !order.assignedDriver ||
      String(order.assignedDriver) !== String(driverUser._id)
    ) {
      return res
        .status(403)
        .json({ error: "This order is not assigned to you" });
    }

    order.status = "delivered";
    order.actualDeliveryTime = new Date();
    await order.save();

    const driver = await Driver.findOne({
      "personalInfo.email": driverUser.email,
    });
    if (driver) {
      driver.currentOrder = null;
      driver.status = "available";
      driver.performance.totalDeliveries =
        (driver.performance.totalDeliveries || 0) + 1;
      await driver.save();
    }

    io.to("fleet-updates").emit("order-delivered", {
      orderId: order._id,
      driverId: driver?._id,
    });
    io.to(`driver-${driverUser._id}`).emit("job-completed", { order });

    res.json({ order, driver });
  } catch (err) {
    console.error("completeJob error:", err);
    res.status(500).json({ error: err.message });
  }
}
