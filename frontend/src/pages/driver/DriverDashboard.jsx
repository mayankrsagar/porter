// src/pages/driver/DriverDashboard.jsx
import React, { useEffect, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";

function StatusBadge({ status }) {
  const s = (status || "offline").toLowerCase();
  const map = {
    available: "bg-green-100 text-green-800",
    busy: "bg-indigo-100 text-indigo-800",
    offline: "bg-slate-100 text-slate-700",
    suspended: "bg-red-100 text-red-800",
    default: "bg-slate-100 text-slate-700",
  };
  const dotMap = {
    available: "bg-green-500",
    busy: "bg-indigo-500",
    offline: "bg-slate-400",
    suspended: "bg-red-500",
  };
  const cls = map[s] || map.default;
  const dotCls = dotMap[s] || dotMap.offline;
  const label = s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotCls}`} />
      {label}
    </span>
  );
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const loadDriver = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/drivers/me", { method: "get" });
      setDriver(res.driver || res);
    } catch (err) {
      console.error("loadDriver error:", err);
      setError(err?.message || "Failed to load driver profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriver();
  }, []);

  const changeStatus = async (status) => {
    if (!driver?._id) return;
    setUpdatingStatus(true);
    setError("");
    setInfo("");
    try {
      const res = await apiFetch(`/drivers/${driver._id}/status`, {
        method: "patch",
        body: { status },
      });
      setDriver(res);
      setInfo(`Status updated to ${status}`);
    } catch (err) {
      console.error("changeStatus error:", err);
      setError(err?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateLocation = () => {
    if (!driver?._id) return;
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setUpdatingLocation(true);
    setError("");
    setInfo("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          const res = await apiFetch(`/drivers/${driver._id}/location`, {
            method: "patch",
            body: { coordinates: coords },
          });

          setDriver(res);
          setInfo("Location updated from device.");
        } catch (err) {
          console.error("updateLocation error:", err);
          setError(err?.message || "Failed to update location");
        } finally {
          setUpdatingLocation(false);
        }
      },
      (err) => {
        console.error(err);
        setError("Unable to get current location: " + err.message);
        setUpdatingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const pi = driver?.personalInfo || {};
  const perf = driver?.performance || {};
  const vehicle = driver?.assignedVehicle;
  const order = driver?.currentOrder;
  const currentCoords = driver?.currentLocation?.coordinates;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Driver Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Welcome,{" "}
            <span className="font-medium">
              {pi.firstName || user?.name || "Driver"} {pi.lastName || ""}
            </span>
          </p>
        </div>
        {driver && (
          <div className="flex items-center gap-3">
            <StatusBadge status={driver.status} />
            <div className="text-xs text-slate-500">
              ID: <span className="font-mono">{driver.driverId}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-4 py-2">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded px-4 py-2">
          {info}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/2" />
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
        </div>
      ) : !driver ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-600">
            No driver profile found for your account. Please contact admin.
          </p>
        </div>
      ) : (
        <>
          {/* Quick status + location */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Current status</div>
                <div className="mt-1 flex items-center gap-3">
                  <StatusBadge status={driver.status} />
                  <span className="text-xs text-slate-500">
                    Last location update:{" "}
                    {driver.currentLocation?.lastUpdated
                      ? new Date(
                          driver.currentLocation.lastUpdated
                        ).toLocaleTimeString()
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={updatingStatus}
                  onClick={() => changeStatus("available")}
                  className="px-3 py-1.5 text-xs rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60"
                >
                  Set Available
                </button>
                <button
                  disabled={updatingStatus}
                  onClick={() => changeStatus("busy")}
                  className="px-3 py-1.5 text-xs rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  Set Busy
                </button>
                <button
                  disabled={updatingStatus}
                  onClick={() => changeStatus("offline")}
                  className="px-3 py-1.5 text-xs rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Set Offline
                </button>
                <button
                  disabled={updatingLocation}
                  onClick={updateLocation}
                  className="px-3 py-1.5 text-xs rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 flex items-center gap-1"
                >
                  {updatingLocation && (
                    <span className="w-3 h-3 rounded-full border-b-2 border-indigo-600 animate-spin" />
                  )}
                  Update location
                </button>
              </div>
            </div>

            {currentCoords && (
              <div className="mt-3 text-xs text-slate-500">
                Current coordinates:{" "}
                <span className="font-mono">
                  {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                </span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Total deliveries"
              value={perf.totalDeliveries ?? 0}
              subtitle="All time"
            />
            <StatCard
              title="Average rating"
              value={
                perf.averageRating?.toFixed
                  ? perf.averageRating.toFixed(1)
                  : (perf.averageRating || 0).toString()
              }
              subtitle="Out of 5"
            />
            <StatCard
              title="Total distance"
              value={`${perf.totalDistance ?? 0} km`}
              subtitle="Estimated"
            />
          </div>

          {/* Vehicle + current order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Vehicle */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">
                Assigned vehicle
              </h2>
              {vehicle ? (
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="font-medium">
                    {vehicle.registrationNumber ||
                      vehicle.vehicleId ||
                      "Vehicle"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Type: {vehicle.type || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Status: {vehicle.status || "—"}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No vehicle assigned. Please contact dispatch/admin.
                </div>
              )}
            </div>

            {/* Current order */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">
                Current order
              </h2>
              {order ? (
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      Order ID:{" "}
                      <span className="font-mono">
                        {order.orderId || order._id}
                      </span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  {order.pickupLocation && (
                    <div className="text-xs text-slate-500">
                      Pickup: {order.pickupLocation.address || "—"}
                    </div>
                  )}
                  {order.deliveryLocation && (
                    <div className="text-xs text-slate-500">
                      Drop:&nbsp;{order.deliveryLocation.address || "—"}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No active order assigned right now.
                </div>
              )}
            </div>
          </div>

          {/* Feedback (simple view) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Recent feedback
            </h2>
            {perf.customerFeedback && perf.customerFeedback.length > 0 ? (
              <ul className="space-y-2 max-h-48 overflow-auto text-sm">
                {perf.customerFeedback
                  .slice(-5)
                  .reverse()
                  .map((fb, idx) => (
                    <li
                      key={fb._id || idx}
                      className="flex justify-between items-start border-b last:border-b-0 border-slate-100 pb-1"
                    >
                      <div>
                        <div className="font-medium text-slate-800">
                          Rating: {fb.rating ?? "—"}/5
                        </div>
                        {fb.comment && (
                          <div className="text-xs text-slate-500">
                            {fb.comment}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {fb.date ? new Date(fb.date).toLocaleDateString() : ""}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500">
                No feedback recorded yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-xl font-bold text-slate-800 mt-1">{value}</div>
      {subtitle && (
        <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
