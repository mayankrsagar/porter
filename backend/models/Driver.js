import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: false, // initially optional; after migration you may make it required
    },

    driverId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "DRV-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substr(2, 4).toUpperCase(),
    },
    personalInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      dateOfBirth: Date,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: "US" },
      },
      emergencyContact: {
        name: String,
        phone: String,
        relationship: String,
      },
    },
    license: {
      number: { type: String, required: true },
      type: { type: String, required: true },
      issueDate: Date,
      expiryDate: Date,
      state: String,
      restrictions: [String],
    },
    documents: [
      {
        type: {
          type: String,
          enum: ["license", "id", "medical", "training", "background"],
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
    status: {
      type: String,
      enum: ["available", "busy", "offline", "suspended"],
      default: "available",
    },
    currentLocation: {
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
      lastUpdated: { type: Date, default: Date.now },
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    performance: {
      totalDeliveries: { type: Number, default: 0 },
      totalDistance: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      onTimeDeliveries: { type: Number, default: 0 },
      customerFeedback: [
        {
          orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
          rating: Number,
          comment: String,
          date: { type: Date, default: Date.now },
        },
      ],
    },
    availability: {
      schedule: [
        {
          day: {
            type: String,
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
          },
          startTime: String,
          endTime: String,
          available: { type: Boolean, default: true },
        },
      ],
      preferredAreas: [String],
      maxDistance: { type: Number, default: 50 },
    },
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      commissionRate: { type: Number, default: 0.15 },
    },
    profileImage: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
// driverSchema.index({ driverId: 1 }); // Unique index
driverSchema.index({ "personalInfo.phone": 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ "license.number": 1 });

const Driver = mongoose.models.Driver || mongoose.model("Driver", driverSchema);

export default Driver;
