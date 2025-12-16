import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "ORD-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substr(2, 4).toUpperCase(),
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String },
    },
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    deliveryLocation: {
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ["mini-truck", "pickup", "3-wheeler", "truck", "van"],
    },
    packageDetails: {
      weight: { type: Number, required: true },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      description: String,
      specialInstructions: String,
    },
    pricing: {
      baseFare: { type: Number, required: true },
      distance: { type: Number, required: true },
      totalAmount: { type: Number, required: true },
      currency: { type: String, default: "USD" },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "assigned",
        "picked-up",
        "in-transit",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        location: String,
        notes: String,
      },
    ],
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "wallet"],
      default: "card",
    },
    rating: {
      customerRating: Number,
      driverRating: Number,
      feedback: String,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
// orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
