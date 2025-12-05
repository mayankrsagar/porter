// server.js
import "dotenv/config";

import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import path, { dirname } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import analyticsRouter from "./routes/analytics.js";
import driversRouter from "./routes/drivers.js";
import ordersRouter from "./routes/orders.js";
import vehiclesRouter from "./routes/vehicles.js";

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure CORS origins
const devOrigins = ["http://localhost:3000", "http://localhost:5173"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    if (process.env.NODE_ENV === "production") {
      // Change this to your actual production origin(s)
      const prodOrigin = process.env.FRONTEND_ORIGIN;
      return callback(null, origin === prodOrigin);
    }
    // dev mode
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

// Serve frontend: in production serve built files, in dev skip or optionally proxy
if (process.env.NODE_ENV === "production") {
  // Vite builds into 'dist' by default
  const frontendDist = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendDist));

  // Serve index.html for SPA routes (keep API routes above)
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  // In dev, if you want a fallback static (optional)
  const frontendStatic = path.join(__dirname, "../frontend");
  app.use("/static-front", express.static(frontendStatic));
}

// MongoDB connection (async)

connectDB();

// Mount API routes (keep API prefix before the SPA wildcard)
app.use("/api/orders", ordersRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/analytics", analyticsRouter);

// Basic health check
app.get("/healthz", (req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
);

// Socket.io for real-time updates
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
});

// Global error handler
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
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

  // force exit after 10s
  setTimeout(() => {
    console.error("Forcing shutdown");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Export app/io/server for use in controllers/tests
export { app, io, server };
