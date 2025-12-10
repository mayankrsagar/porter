// controllers/driverController.js
import Driver from "../models/Driver.js";
import Order from "../models/Order.js";
import { io } from "../server.js";

// Get all drivers
export async function getDrivers(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
    if (status) filter.status = status;

    const drivers = await Driver.find(filter)
      .populate("assignedVehicle", "registrationNumber type vehicleId status")
      .populate("currentOrder", "orderId status")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Driver.countDocuments(filter);

    res.json({
      drivers,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get single driver
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
    const driver = new Driver(req.body);
    await driver.save();

    // Emit real-time update
    io.to("fleet-updates").emit("driver-created", driver);

    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
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

// Update driver location
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

// Update driver performance
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
      driver.performance.onTimeDeliveries += 1; // Assuming on-time for now
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

// Get driver statistics
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

// Get drivers by location (for map view)
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

// Get currently logged-in driver's profile based on req.user.email
export async function getMyDriverProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // We expect User.email === Driver.personalInfo.email for the mapping
    const email = (req.user.email || "").toLowerCase();

    const driver = await Driver.findOne({
      "personalInfo.email": email,
    })
      .populate("assignedVehicle", "registrationNumber type vehicleId status")
      .populate(
        "currentOrder",
        "orderId status pickupLocation deliveryLocation"
      );

    if (!driver) {
      return res.status(404).json({ error: "Driver profile not found" });
    }

    return res.json({ driver });
  } catch (error) {
    console.error("getMyDriverProfile error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/drivers/jobs - available jobs (pending)
export async function getAvailableJobs(req, res) {
  try {
    // Optionally filter by area / vehicle type in future
    const jobs = await Order.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/drivers/jobs/:orderId/accept
export async function acceptJob(req, res) {
  try {
    const driverUser = req.user; // must exist (requireAuth)
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "pending")
      return res.status(400).json({ error: "Order already accepted" });

    // assign driver
    order.status = "ongoing";
    order.assignedDriver = driverUser._id;
    order.assignedAt = new Date();
    await order.save();

    // update driver record
    const driver = await Driver.findOne({
      "personalInfo.email": driverUser.email,
    });
    if (driver) {
      driver.currentOrder = order._id;
      driver.status = "busy";
      await driver.save();
      await driver.populate("assignedVehicle").execPopulate?.();
    }

    // emit real-time updates
    io.to("fleet-updates").emit("order-accepted", {
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

// POST /api/drivers/jobs/:orderId/complete
export async function completeJob(req, res) {
  try {
    const driverUser = req.user;
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (String(order.assignedDriver) !== String(driverUser._id))
      return res.status(403).json({ error: "Not assigned to you" });

    order.status = "delivered";
    order.completedAt = new Date();
    await order.save();

    // update driver performance & free up driver
    const driver = await Driver.findOne({
      "personalInfo.email": driverUser.email,
    });
    if (driver) {
      driver.currentOrder = null;
      driver.status = "available";
      driver.performance.totalDeliveries =
        (driver.performance.totalDeliveries || 0) + 1;
      // optionally increment distance and earnings if provided in req.body
      await driver.save();
    }

    io.to("fleet-updates").emit("order-completed", {
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
