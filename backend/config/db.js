import mongoose from "mongoose";

async function connectDB() {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/porter-clone";
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
export default connectDB;
