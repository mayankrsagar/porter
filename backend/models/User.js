import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar: {
      url: { type: String },
      public_id: { type: String },
    },
    role: { type: String, enum: ["user", "driver", "admin"], default: "user" },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
