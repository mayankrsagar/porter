// controllers/vehicleController.js
import Vehicle from "../models/Vehicle.js";
import { io } from "../server.js";

// Get all vehicles
export async function getVehicles(req, res) {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const filter = {};
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
    res.status(500).json({ error: error.message });
  }
}

// Get single vehicle
export async function getVehicleById(req, res) {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate("assignedDriver")
      .populate("currentOrder");

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create new vehicle
export async function createVehicle(req, res) {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();

    // Emit real-time update
    io.to("fleet-updates").emit("vehicle-created", vehicle);

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Update vehicle status
export async function updateVehicleStatus(req, res) {
  try {
    const { status, location } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    vehicle.status = status;
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
    res.status(400).json({ error: error.message });
  }
}

// Update vehicle location
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
    res.status(400).json({ error: error.message });
  }
}

// Assign driver to vehicle
export async function assignDriverToVehicle(req, res) {
  try {
    const { driverId } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    vehicle.assignedDriver = driverId;
    await vehicle.save();

    await vehicle.populate(
      "assignedDriver",
      "personalInfo.firstName personalInfo.lastName driverId status"
    );
    await vehicle.populate("currentOrder", "orderId status");

    io.to("fleet-updates").emit("vehicle-updated", vehicle);

    res.json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get vehicle statistics
export async function getVehicleOverviewStats(req, res) {
  try {
    const stats = await Vehicle.aggregate([
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
            // fixed: there was a nested $sum before
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
      overview: stats[0] || {
        totalVehicles: 0,
        availableVehicles: 0,
        busyVehicles: 0,
        maintenanceVehicles: 0,
        offlineVehicles: 0,
      },
      byType: typeStats,
    });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
}
