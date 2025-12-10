import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
// ✅ Added: fs for tmp folder creation & auth routes
import fs from "fs";
import http from "http";
import mongoose from "mongoose";
import path, { dirname } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import adminRoutes from "./routes/admin.js";
import analyticsRouter from "./routes/analytics.js";
import authRoutes from "./routes/auth.js";
import driversRouter from "./routes/drivers.js";
import ordersRouter from "./routes/orders.js";
import vehiclesRouter from "./routes/vehicles.js";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

// ✅ Added: create tmp folder for multer if not exists
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

// Configure CORS origins
const devOrigins = ["http://localhost:3000", "http://localhost:5173"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === "production") {
      const prodOrigin = process.env.FRONTEND_ORIGIN;
      return callback(null, origin === prodOrigin);
    }
    return callback(null, devOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_ORIGIN
        : devOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Serve frontend
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  const frontendStatic = path.join(__dirname, "../frontend");
  app.use("/static-front", express.static(frontendStatic));
}

// MongoDB connection
connectDB();

// Mount API routes (✅ Added auth routes)
app.use("/api/orders", ordersRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/auth", authRoutes); // ✅ Auth routes integrated here

app.use("/api/admin", adminRoutes);

// Health check
app.get("/healthz", (req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
);

// Socket.io
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("join-order", (orderId) => {
    if (orderId) socket.join(`order-${orderId}`);
  });
  socket.on("join-fleet", () => {
    socket.join("fleet-updates");
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
  socket.on("join-driver-room", ({ userId }) =>
    socket.join(`driver-${userId}`)
  );
  socket.on("join-fleet", () => socket.join("fleet-updates"));

  socket.on("driver-location", (data) => {
    // broadcast to fleet or interested clients
    io.to("fleet-updates").emit("driver-location", data);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err?.stack || err);
  res.status(500).json({ error: err?.message || "Something went wrong!" });
});

const PORT = parseInt(process.env.PORT || "3000", 10);
server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (env=${
      process.env.NODE_ENV || "development"
    })`
  );
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down server...");
  await mongoose.connection.close(false);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forcing shutdown");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app, io, server };
