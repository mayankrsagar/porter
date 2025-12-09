// frontend/src/components/Dashboard.jsx
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import { apiFetch } from '../services/api';

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="flex-none w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-500">{title}</div>
          <div className="text-2xl font-bold text-gray-800">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-1/2 bg-gray-200 rounded" />
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || "pending").toString().toLowerCase();
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    ongoing: "bg-indigo-100 text-indigo-800",
    in_transit: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    default: "bg-slate-100 text-slate-800",
  };
  const cls = map[s] || map.default;
  const label = s
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeDrivers: 0,
    vehicles: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const formatNumber = (n) =>
    typeof n === "number" ? n.toLocaleString() : n ?? 0;

  const normalizeOrders = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.orders)) return raw.orders;
    if (Array.isArray(raw.data)) return raw.data;
    return [];
  };

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    setLoadingOrders(true);

    try {
      // ---- ANALYTICS ----
      const s = await apiFetch("/analytics/dashboard");

      const ordersOverview = s?.overview?.orders || {};
      const totalOrders =
        ordersOverview.totalOrders ?? ordersOverview.count ?? 0;

      const driverStatus = Array.isArray(s?.driverStatus) ? s.driverStatus : [];
      const activeDrivers = driverStatus
        .filter((d) => d?._id === "available" || d?._id === "busy")
        .reduce((sum, d) => sum + (d.count || 0), 0);

      const fleetStatus = Array.isArray(s?.fleetStatus) ? s.fleetStatus : [];
      const vehicles = fleetStatus.reduce((sum, v) => sum + (v.count || 0), 0);

      setStats({
        totalOrders,
        activeDrivers,
        vehicles,
      });

      // ---- RECENT ORDERS ----
      const o = await apiFetch("/orders");
      const ordersList = normalizeOrders(o);
      setOrders(ordersList.slice(0, 10));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard load error:", err);
      const message =
        err?.message || err?.data?.message || "Failed to load dashboard";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of orders, drivers and fleet.
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border text-sm hover:bg-gray-50"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h4l3-7 4 14 3-7h4"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total orders"
              value={formatNumber(stats.totalOrders)}
              icon={
                <svg
                  className="w-6 h-6 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7h18M3 12h18M3 17h18"
                  />
                </svg>
              }
            />
            <StatCard
              title="Active drivers"
              value={formatNumber(stats.activeDrivers)}
              icon={
                <svg
                  className="w-6 h-6 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12h14M12 5v14"
                  />
                </svg>
              }
            />
            <StatCard
              title="Vehicles"
              value={formatNumber(stats.vehicles)}
              icon={
                <svg
                  className="w-6 h-6 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12h18v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6zM5 10a4 4 0 0 1 8 0M19 10a4 4 0 0 1 0 0"
                  />
                </svg>
              }
            />
          </>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Recent orders
          </h2>
          <Link
            to="/orders"
            className="text-sm text-indigo-600 hover:underline"
          >
            View all orders
          </Link>
        </div>

        {loadingOrders ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-4 rounded shadow-sm border border-gray-100 animate-pulse h-20"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-slate-500">No recent orders.</div>
        ) : (
          <div className="grid gap-3">
            {orders.map((o, index) => {
              const id =
                o._id ||
                o.id ||
                o.orderId ||
                // fallback key: stable-ish but if possible use backend id
                `order-${index}`;
              const pickup =
                o.pickupLocation?.address ||
                o.pickup ||
                o.from ||
                "Unknown pickup";
              const drop =
                o.deliveryLocation?.address || o.drop || o.to || "Unknown drop";
              const status = o.status || "pending";

              return (
                <div
                  key={id}
                  className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-800">{pickup}</div>
                    <div className="text-sm text-slate-500">{drop}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Order ID: <span className="text-slate-600">{id}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={status} />
                    <Link
                      to={`/orders/${id}`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
