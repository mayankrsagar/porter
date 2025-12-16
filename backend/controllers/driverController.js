import mongoose from "mongoose";

import Driver from "../models/Driver.js";
import { io } from "../server.js";

/**
 * Driver controller — fixes:
 * - enforce admin check for createDriver (recommended)
 * - align performance fields with schema (completedJobs, cancelledJobs, rating)
 * - status consistency: use active/inactive/busy/offline/suspended
 * - defensive checks and initializations
 */

// Get all drivers with pagination
export async function getDrivers(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    const drivers = await Driver.find(filter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select(
        "driverId personalInfo.firstName personalInfo.lastName status currentLocation assignedVehicle currentOrder"
      );

    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getDriverMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // req.user is a User document (see auth middleware). Drivers are linked via Driver.user -> User._id
    const userId = req.user._id;
    const driver = await Driver.findOne({ user: userId })
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
    res.status(500).json({ error: error.message });
  }
}

export async function getDriverById(req, res) {
  try {
    const requested = req.params.id;

    // If the client asked for "me", return the driver for the authenticated user
    if (requested === "me") {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Prefer to lookup by linked user id if driver.user was set, otherwise fall back to email
      const userId = req.user._id;
      let driver = null;

      if (userId) {
        driver = await Driver.findOne({ user: userId })
          .populate("assignedVehicle")
          .populate("currentOrder")
          .lean();
      }

      if (!driver) {
        const email = (req.user.email || "").toLowerCase();
        if (email) {
          driver = await Driver.findOne({ "personalInfo.email": email })
            .populate("assignedVehicle")
            .populate("currentOrder")
            .lean();
        }
      }

      if (!driver) {
        return res.status(404).json({ error: "Driver profile not found" });
      }

      return res.json(driver);
    }

    // For other ids ensure it's a valid ObjectId to avoid Mongoose casting exceptions
    if (!mongoose.isValidObjectId(requested)) {
      return res.status(400).json({ error: "Invalid driver id" });
    }

    const driver = await Driver.findById(requested)
      .populate("assignedVehicle")
      .populate("currentOrder");

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.json(driver);
  } catch (error) {
    console.error("getDriverById error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Create new driver (admin-only)
// Note: you already have adminController.createDriver — keep that as canonical.
// This function enforces admin check if accidentally called directly.
export async function createDriver(req, res) {
  try {
    // Require authenticated admin (routes should already enforce but double-check)
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: admin only" });
    }

    const payload = req.body || {};

    // Basic normalization
    if (payload.personalInfo && payload.personalInfo.email) {
      payload.personalInfo.email = payload.personalInfo.email
        .toLowerCase()
        .trim();
    }
    if (payload.personalInfo && payload.personalInfo.phone) {
      payload.personalInfo.phone = String(payload.personalInfo.phone).trim();
    }

    // Basic required fields
    const firstName =
      payload.personalInfo?.firstName || payload.firstName || payload.name;
    if (!firstName) {
      return res.status(400).json({ error: "Driver first name is required" });
    }

    // Prevent duplicate by email or phone
    const dupQueries = [];
    if (payload.personalInfo?.email) {
      dupQueries.push({ "personalInfo.email": payload.personalInfo.email });
    }
    if (payload.personalInfo?.phone) {
      dupQueries.push({ "personalInfo.phone": payload.personalInfo.phone });
    }

    if (dupQueries.length) {
      const existing = await Driver.findOne({ $or: dupQueries }).lean();
      if (existing) {
        return res.status(409).json({
          error: "Driver with same email or phone already exists",
          existingDriverId: existing.driverId,
        });
      }
    }

    // Ensure sensible defaults that match schema
    const driverData = {
      personalInfo: {
        firstName: payload.personalInfo?.firstName || firstName,
        lastName: payload.personalInfo?.lastName || payload.lastName || "",
        email: payload.personalInfo?.email || "",
        phone: payload.personalInfo?.phone || "",
      },
      license: payload.license || {},
      status: payload.status || "inactive", // admin could override if needed
      assignedVehicle: payload.assignedVehicle || null,
      currentOrder: null,
      meta: {
        createdBy: req.user._id,
        notes: payload.meta?.notes || "",
      },
    };

    // create driver
    const driver = new Driver(driverData);
    await driver.save();

    io.to("fleet-updates").emit("driver-created", driver);
    res.status(201).json({ driver });
  } catch (error) {
    console.error("createDriver error:", error);
    if (error && error.name === "ValidationError") {
      const details = {};
      for (const k in error.errors) details[k] = error.errors[k].message;
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

    // Validate status belongs to allowed enum (optional)
    const allowed = ["active", "inactive", "suspended", "busy", "offline"];
    if (status && !allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` });
    }

    if (status) driver.status = status;
    if (location) {
      driver.currentLocation = {
        coordinates:
          location.coordinates ||
          driver.currentLocation?.coordinates ||
          driver.currentLocation,
        address: location.address || driver.currentLocation?.address,
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
    res.json({ driver });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update driver location only
export async function updateDriverLocation(req, res) {
  try {
    const { coordinates, address } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    driver.currentLocation = {
      coordinates: coordinates || driver.currentLocation?.coordinates || [0, 0],
      address: address || driver.currentLocation?.address || "",
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

    res.json({ driver });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Assign vehicle to driver (admin)
export async function assignVehicleToDriver(req, res) {
  try {
    const { vehicleId } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    driver.assignedVehicle = vehicleId || null;
    await driver.save();

    await driver.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId status"
    );
    await driver.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("driver-updated", driver);
    res.json({ driver });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update driver performance metrics
export async function updateDriverPerformance(req, res) {
  try {
    const { deliveryCompleted, rating, distance, cancelled } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    // Ensure performance object exists and fields are numbers
    driver.performance = driver.performance || {};
    driver.performance.completedJobs = Number(
      driver.performance.completedJobs || 0
    );
    driver.performance.cancelledJobs = Number(
      driver.performance.cancelledJobs || 0
    );
    driver.performance.totalDistance = Number(
      driver.performance.totalDistance || 0
    );
    driver.performance.rating = Number(driver.performance.rating || 0);

    if (deliveryCompleted) {
      driver.performance.completedJobs += 1;
      driver.performance.totalDistance += Number(distance || 0);
    }

    if (cancelled) {
      driver.performance.cancelledJobs += 1;
    }

    if (rating != null) {
      // Simple running average approach: convert to a naive average if counts not stored
      // If you later add ratingCount, replace with exact average formula
      const prevAvg = Number(driver.performance.rating || 0);
      const prevCount = Number(driver.performance.ratingCount || 0) || 0;
      const newCount = prevCount + 1;
      driver.performance.rating =
        (prevAvg * prevCount + Number(rating)) / newCount;
      driver.performance.ratingCount = newCount;
      // optionally push to feedback array if you add it to schema later
    }

    await driver.save();
    await driver.populate(
      "assignedVehicle",
      "registrationNumber type vehicleId status"
    );
    await driver.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("driver-updated", driver);
    res.json({ driver });
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
          activeDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
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
          averageRating: { $avg: "$performance.rating" },
          totalCompletedJobs: { $sum: "$performance.completedJobs" },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalDrivers: 0,
        activeDrivers: 0,
        busyDrivers: 0,
        offlineDrivers: 0,
        suspendedDrivers: 0,
        averageRating: 0,
        totalCompletedJobs: 0,
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
      status: { $in: ["active", "busy"] }, // changed from 'available' to 'active'
      "currentLocation.coordinates.0": { $exists: true },
    })
      .populate("assignedVehicle", "registrationNumber type vehicleId status")
      .populate(
        "currentOrder",
        "orderId status pickupLocation deliveryLocation"
      )
      .select(
        "driverId personalInfo.firstName personalInfo.lastName status currentLocation assignedVehicle currentOrder"
      );

    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
