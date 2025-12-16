import mongoose from "mongoose";

import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import { io } from "../server.js";

// ==================== ADMIN & MANAGEMENT ENDPOINTS ====================

// Get all vehicles with pagination and search
export async function getVehicles(req, res) {
  try {
    const { page = 1, limit = 20, q, status, type } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
    if (q) {
      filter.$or = [
        { registrationNumber: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
        { vehicleId: { $regex: q, $options: "i" } },
      ];
    }
    if (status) filter.status = status;
    if (type) filter.type = type;

    const vehicles = await Vehicle.find(filter)
      .populate(
        "assignedDriver",
        "personalInfo.firstName personalInfo.lastName driverId status"
      )
      .populate("currentOrder", "orderId status")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Vehicle.countDocuments(filter);

    res.json({
      vehicles,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
    });
  } catch (error) {
    console.error("getVehicles error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get single vehicle by ID
export async function getVehicleById(req, res) {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate(
        "assignedDriver",
        "personalInfo.firstName personalInfo.lastName driverId status"
      )
      .populate("currentOrder", "orderId status");

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (error) {
    console.error("getVehicleById error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Create new vehicle
export async function createVehicle(req, res) {
  try {
    const vehicle = await Vehicle.create(req.body);
    io.to("fleet-updates").emit("vehicle-created", vehicle);
    res.status(201).json(vehicle);
  } catch (error) {
    console.error("createVehicle error:", error);
    res.status(400).json({ error: error.message });
  }
}

export async function listVehicles(req, res) {
  try {
    const { page = 1, limit = 20, q, status, type } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
    if (q) {
      filter.$or = [
        { registrationNumber: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
        { vehicleId: { $regex: q, $options: "i" } },
      ];
    }
    if (status) filter.status = status;
    if (type) filter.type = type;

    const vehicles = await Vehicle.find(filter)
      .populate(
        "assignedDriver",
        "personalInfo.firstName personalInfo.lastName driverId status"
      )
      .populate("currentOrder", "orderId status")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Vehicle.countDocuments(filter);
    res.json({
      vehicles,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
    });
  } catch (err) {
    console.error("listVehicles:", err);
    res.status(500).json({ error: err.message });
  }
}

// Update vehicle (general update)
export async function updateVehicle(req, res) {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    io.to("fleet-updates").emit("vehicle-updated", vehicle);
    res.json(vehicle);
  } catch (error) {
    console.error("updateVehicle error:", error);
    res.status(400).json({ error: error.message });
  }
}

// Delete vehicle
export async function deleteVehicle(req, res) {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    io.to("fleet-updates").emit("vehicle-deleted", { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error("deleteVehicle error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Assign driver to vehicle. Accepts either Driver._id or Driver.driverId in body.driverId.
 * Also keeps driver.assignedVehicle in sync.
 */
export async function assignDriverToVehicle(req, res) {
  try {
    const { driverId: driverInput } = req.body;
    const vehicleId = req.params.id;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    let driver = null;
    if (driverInput) {
      if (mongoose.isValidObjectId(driverInput)) {
        driver = await Driver.findById(driverInput);
      }
      if (!driver) driver = await Driver.findOne({ driverId: driverInput });
      if (!driver) return res.status(404).json({ error: "Driver not found" });
    }

    // If vehicle already had an assignedDriver different than new one, clear old driver's assignedVehicle
    if (
      vehicle.assignedDriver &&
      (!driver || String(vehicle.assignedDriver) !== String(driver._id))
    ) {
      try {
        const oldDriver = await Driver.findById(vehicle.assignedDriver);
        if (oldDriver) {
          oldDriver.assignedVehicle = null;
          await oldDriver.save();
        }
      } catch (e) {
        console.warn("Failed to clear old driver.assignedVehicle", e.message);
      }
    }

    vehicle.assignedDriver = driver ? driver._id : null;
    await vehicle.save();

    // Set driver's assignedVehicle to this vehicle
    if (driver) {
      driver.assignedVehicle = vehicle._id;
      await driver.save();
    }

    await vehicle.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId status"
    );
    await vehicle.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("vehicle-updated", vehicle);
    res.json(vehicle);
  } catch (error) {
    console.error("assignDriverToVehicle error:", error);
    res.status(400).json({ error: error.message || String(error) });
  }
}

// Update vehicle status and optionally location
export async function updateVehicleStatus(req, res) {
  try {
    const { status, location } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (status) vehicle.status = status;
    if (location) {
      vehicle.currentLocation = {
        ...location,
        lastUpdated: new Date(),
      };
    }

    await vehicle.save();
    await vehicle.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId status"
    );
    await vehicle.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("vehicle-updated", vehicle);
    res.json(vehicle);
  } catch (error) {
    console.error("updateVehicleStatus error:", error);
    res.status(400).json({ error: error.message });
  }
}

// Update vehicle location only
export async function updateVehicleLocation(req, res) {
  try {
    const { coordinates, address } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    vehicle.currentLocation = {
      coordinates,
      address,
      lastUpdated: new Date(),
    };

    await vehicle.save();
    await vehicle.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId status"
    );
    await vehicle.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("vehicle-location-updated", {
      vehicleId: vehicle._id,
      location: vehicle.currentLocation,
    });

    res.json(vehicle);
  } catch (error) {
    console.error("updateVehicleLocation error:", error);
    res.status(400).json({ error: error.message });
  }
}

// ==================== STATISTICS & MAP ENDPOINTS ====================

// Get vehicle statistics
export async function getVehicleOverviewStats(req, res) {
  try {
    const overviewStats = await Vehicle.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          availableVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
          },
          busyVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "busy"] }, 1, 0] },
          },
          maintenanceVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] },
          },
          offlineVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "offline"] }, 1, 0] },
          },
        },
      },
    ]);

    const typeStats = await Vehicle.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      overview: overviewStats[0] || {
        totalVehicles: 0,
        availableVehicles: 0,
        busyVehicles: 0,
        maintenanceVehicles: 0,
        offlineVehicles: 0,
      },
      byType: typeStats,
    });
  } catch (error) {
    console.error("getVehicleOverviewStats error:", error);
    res.status(500).json({ error: error.message });
  }
}

// Get vehicles by location (for map view)
export async function getVehicleLocationsForMap(req, res) {
  try {
    const vehicles = await Vehicle.find({
      status: { $in: ["available", "busy"] },
      "currentLocation.coordinates.lat": { $ne: 0 },
      "currentLocation.coordinates.lng": { $ne: 0 },
    })
      .populate(
        "assignedDriver",
        "personalInfo.firstName personalInfo.lastName driverId status"
      )
      .populate(
        "currentOrder",
        "orderId status pickupLocation deliveryLocation"
      )
      .select(
        "vehicleId registrationNumber type status currentLocation assignedDriver currentOrder"
      );

    res.json(vehicles);
  } catch (error) {
    console.error("getVehicleLocationsForMap error:", error);
    res.status(500).json({ error: error.message });
  }
}
