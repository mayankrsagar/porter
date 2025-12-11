import mongoose from 'mongoose';

function genDriverId() {
  const r = Math.floor(Math.random() * 90000) + 10000;
  return `DRV-${Date.now().toString(36)}-${r}`;
}

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: false,
    },

    driverId: {
      type: String,
      required: true,
      unique: true,
      default: genDriverId,
    },

    personalInfo: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true, index: true },
      phone: { type: String, trim: true, index: true },
    },

    license: {
      number: { type: String, trim: true, index: true },
      expiry: { type: Date },
      issuedBy: { type: String, trim: true },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "busy", "offline"],
      default: "inactive",
      index: true,
    },

    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: false,
    },

    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },

    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    performance: {
      rating: { type: Number, min: 0, max: 5, default: 0 },
      completedJobs: { type: Number, default: 0 },
      cancelledJobs: { type: Number, default: 0 },
    },

    meta: {
      notes: { type: String },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
  }
);

// Geo index for location if used
driverSchema.index({ currentLocation: "2dsphere" });

const Driver = mongoose.models.Driver || mongoose.model("Driver", driverSchema);

export default Driver;
