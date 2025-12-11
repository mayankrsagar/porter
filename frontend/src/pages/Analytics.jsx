// src/pages/Analytics.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch } from '../services/api';

/**
 * Expected endpoints (flexible):
 * - GET /analytics/summary -> { orders: 123, vehicles: 40, drivers: 30, revenue: 12345 }
 * - GET /analytics/orders/daily?days=14 -> [{ day: "2025-12-01", count: 10 }, ...]
 *
 * If your backend uses different endpoints, adjust the fetch paths below.
 */

function StatCard({ title, value, subtitle }) {
  return (
    <div className="p-4 bg-white border rounded-xl shadow-sm">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

function SimpleLineChart({ points = [], height = 120 }) {
  // points: [{label, value}]
  if (!points || points.length === 0)
    return <div className="text-sm text-slate-500">No chart data</div>;
  const values = points.map((p) => Number(p.value) || 0);
  const max = Math.max(...values, 1);
  const stepX = 100 / (points.length - 1);
  const coords = points
    .map((p, i) => {
      const x = i * stepX;
      const y = 100 - ((Number(p.value) || 0) / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  // For area/path we create an SVG polyline scaled to height
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-28"
    >
      <polyline
        fill="none"
        stroke="#4f46e5"
        strokeWidth="1.5"
        points={coords}
      />
      {points.map((p, i) => {
        const [xStr, yStr] = coords.split(" ")[i].split(",");
        return <circle key={i} cx={xStr} cy={yStr} r="1.2" fill="#4f46e5" />;
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [ordersDaily, setOrdersDaily] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const s = await apiFetch("/analytics/summary");
      const days = await apiFetch("/analytics/orders/daily?days=14");
      setSummary(s || null);
      setOrdersDaily(
        Array.isArray(days) ? days : days?.data || days?.orders || []
      );
    } catch (e) {
      console.error("analytics load err:", e);
      setErr(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chartPoints = useMemo(() => {
    // normalize to [{label, value}]
    return (ordersDaily || []).map((row) => {
      const label = row.day || row.date || (row._id || "").toString();
      const value = row.count || row.value || row.orders || 0;
      return { label, value };
    });
  }, [ordersDaily]);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-slate-500">
            Overview of orders, fleet and drivers performance.
          </p>
        </div>
        <div>
          <button onClick={load} className="px-3 py-2 rounded border">
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-4 py-2">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total orders"
          value={summary?.orders ?? "—"}
          subtitle={`Last 30d: ${summary?.ordersLast30d ?? "—"}`}
        />
        <StatCard
          title="Vehicles"
          value={summary?.vehicles ?? "—"}
          subtitle={`Active: ${summary?.vehiclesActive ?? "—"}`}
        />
        <StatCard
          title="Drivers"
          value={summary?.drivers ?? "—"}
          subtitle={`Active: ${summary?.driversActive ?? "—"}`}
        />
        <StatCard
          title="Revenue"
          value={summary?.revenue ? `₹ ${summary.revenue}` : "—"}
          subtitle={summary?.currency || ""}
        />
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-medium mb-2">Orders (last 14 days)</h3>
        <div className="mb-3 text-xs text-slate-500">Daily orders trend</div>
        <SimpleLineChart points={chartPoints} />
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600">
          {chartPoints
            .slice()
            .reverse()
            .slice(0, 4)
            .map((p, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded">
                <div className="font-semibold">{p.value}</div>
                <div className="text-xs text-slate-500">{p.label}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
