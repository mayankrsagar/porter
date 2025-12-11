// src/pages/driver/DriverDashboard.jsx (frontend)
import React, { useEffect, useRef, useState } from "react";

import io from "socket.io-client";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export default function DriverDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  async function loadAll() {
    setLoading(true);
    try {
      const me = await apiFetch("/drivers/me");
      setDriver(me.driver || null);

      const j = await apiFetch("/drivers/jobs");
      setJobs(j.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadAll();

    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current.emit("join-driver-room", { userId: user._id });
    socketRef.current.emit("join-fleet");

    socketRef.current.on("job-assigned", ({ order }) => {
      // show the assigned job
      setDriver((d) => ({ ...d, currentOrder: order }));
      // remove from available jobs if present
      setJobs((prev) =>
        prev.filter((p) => String(p._id) !== String(order._id))
      );
    });

    socketRef.current.on("order-assigned", () => loadAll());
    socketRef.current.on("order-delivered", () => loadAll());

    return () => socketRef.current?.disconnect();
  }, [user]);

  async function acceptJob(orderId) {
    try {
      await apiFetch(`/drivers/jobs/${orderId}/accept`, { method: "post" });
      await loadAll();
    } catch (err) {
      alert(err?.message || "Failed to accept job");
    }
  }

  async function markPickedUp(orderId) {
    try {
      await apiFetch(`/drivers/jobs/${orderId}/picked-up`, { method: "post" });
      await loadAll();
    } catch (err) {
      alert(err?.message || "Failed to mark picked-up");
    }
  }

  async function completeJob(orderId) {
    try {
      await apiFetch(`/drivers/jobs/${orderId}/complete`, { method: "post" });
      await loadAll();
    } catch (err) {
      alert(err?.message || "Failed to complete job");
    }
  }

  async function updateLocationFromDevice() {
    if (!navigator.geolocation) return alert("Geolocation unsupported");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          await apiFetch(`/drivers/${driver._id}/location`, {
            method: "patch",
            body: { coordinates: coords },
          });
          socketRef.current?.emit("driver-location", {
            driverId: driver._id,
            coords,
          });
          loadAll();
        } catch (err) {
          alert("Failed to update location");
        }
      },
      (err) => alert("Geolocation error: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Driver Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={loadAll} className="px-3 py-2 border rounded">
            Refresh
          </button>
          <button
            onClick={updateLocationFromDevice}
            className="px-3 py-2 bg-slate-50 border rounded"
          >
            Update location
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Assigned</h2>
            {driver?.currentOrder ? (
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-slate-500">
                  Order ID:{" "}
                  <span className="font-mono">
                    {driver.currentOrder.orderId}
                  </span>
                </div>
                <div className="mt-2">
                  Status: <strong>{driver.currentOrder.status}</strong>
                </div>
                <div className="mt-2">
                  Pickup: {driver.currentOrder.pickupLocation?.address}
                </div>
                <div>Drop: {driver.currentOrder.deliveryLocation?.address}</div>
                <div className="mt-3 flex gap-2">
                  {driver.currentOrder.status === "assigned" && (
                    <button
                      onClick={() => markPickedUp(driver.currentOrder._id)}
                      className="px-3 py-2 bg-indigo-600 text-white rounded"
                    >
                      Mark picked-up
                    </button>
                  )}
                  <button
                    onClick={() => completeJob(driver.currentOrder._id)}
                    className="px-3 py-2 bg-green-600 text-white rounded"
                  >
                    Mark delivered
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No assigned order</div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Available jobs</h2>
            {jobs.length === 0 ? (
              <div className="text-sm text-slate-500">No available jobs</div>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div
                    key={j._id}
                    className="bg-white p-3 rounded shadow flex justify-between"
                  >
                    <div>
                      <div className="font-medium">{j.orderId}</div>
                      <div className="text-sm text-slate-500">
                        {j.pickupLocation?.address} →{" "}
                        {j.deliveryLocation?.address}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => acceptJob(j._id)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
