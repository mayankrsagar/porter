import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "CUST-" +
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
      company: String,
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        label: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: "US" },
        coordinates: {
          lat: Number,
          lng: Number,
        },
        isDefault: { type: Boolean, default: false },
      },
    ],
    preferences: {
      preferredVehicleType: {
        type: String,
        enum: ["mini-truck", "pickup", "3-wheeler", "truck", "van"],
      },
      preferredPaymentMethod: {
        type: String,
        enum: ["cash", "card", "upi", "wallet"],
        default: "card",
      },
      specialInstructions: String,
      notificationPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
    orderHistory: [
      {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        date: Date,
        amount: Number,
        status: String,
        rating: Number,
      },
    ],
    statistics: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      lastOrderDate: Date,
      preferredVehicleType: String,
    },
    loyalty: {
      points: { type: Number, default: 0 },
      tier: {
        type: String,
        enum: ["bronze", "silver", "gold", "platinum"],
        default: "bronze",
      },
      benefits: [String],
    },
    paymentMethods: [
      {
        type: {
          type: String,
          enum: ["card", "upi", "wallet"],
        },
        isDefault: { type: Boolean, default: false },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    isActive: { type: Boolean, default: true },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
// customerSchema.index({ customerId: 1 }); no need as it's unique
customerSchema.index({ "personalInfo.email": 1 });
customerSchema.index({ "personalInfo.phone": 1 });
customerSchema.index({ isActive: 1 });

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default Customer;
