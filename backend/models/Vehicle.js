import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "VEH-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substr(2, 4).toUpperCase(),
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["mini-truck", "pickup", "3-wheeler", "truck", "van"],
    },
    make: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    capacity: {
      weight: { type: Number, required: true },
      volume: { type: Number, required: true },
    },
    fuelType: {
      type: String,
      enum: ["diesel", "petrol", "electric", "hybrid"],
      default: "diesel",
    },
    currentLocation: {
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
      address: String,
      lastUpdated: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ["available", "busy", "maintenance", "offline"],
      default: "available",
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    maintenanceSchedule: [
      {
        type: {
          type: String,
          enum: ["routine", "repair", "inspection"],
        },
        scheduledDate: Date,
        completedDate: Date,
        description: String,
        cost: Number,
        status: {
          type: String,
          enum: ["scheduled", "in-progress", "completed", "overdue"],
          default: "scheduled",
        },
      },
    ],
    insurance: {
      provider: String,
      policyNumber: String,
      expiryDate: Date,
      status: {
        type: String,
        enum: ["active", "expired", "pending"],
        default: "active",
      },
    },
    documents: [
      {
        type: {
          type: String,
          enum: ["registration", "insurance", "permit", "fitness"],
        },
        documentNumber: String,
        issueDate: Date,
        expiryDate: Date,
        status: {
          type: String,
          enum: ["valid", "expired", "pending"],
          default: "valid",
        },
      },
    ],
    mileage: {
      current: { type: Number, default: 0 },
      lastService: { type: Number, default: 0 },
    },
    fuelEfficiency: {
      average: Number,
      lastRecorded: Number,
    },
    images: [
      {
        type: String,
        url: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
// vehicleSchema.index({ vehicleId: 1 }); // no need as vehicleId is unique
// vehicleSchema.index({ registrationNumber: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ type: 1 });

const Vehicle =
  mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;
