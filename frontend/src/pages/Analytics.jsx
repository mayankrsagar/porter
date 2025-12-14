// src/pages/Analytics.jsx
import React, { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../services/api";

/* ---------- Small UI pieces ---------- */
function StatCard({ title, value, subtitle }) {
  return (
    <div className="p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs text-slate-400 uppercase tracking-wide">
        {title}
      </div>
      <div className="text-2xl font-semibold mt-1 text-slate-800">{value}</div>
      {subtitle && (
        <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

/* ---------- Fixed SVG line chart with area fill & visible markers ---------- */
function SimpleLineChart({ points = [], height = 120 }) {
  if (!points || points.length === 0)
    return (
      <div className="text-sm text-slate-500 italic">
        No chart data available
      </div>
    );

  const normalized = points.map((p) => ({
    label: p?.label ?? "",
    value: Number.isFinite(Number(p?.value)) ? Number(p.value) : 0,
  }));

  const values = normalized.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const len = normalized.length;
  const stepX = len === 1 ? 0 : 100 / (len - 1);

  const coords = normalized.map((p, i) => {
    const x = len === 1 ? 50 : i * stepX;
    const y = 100 - ((p.value - min) / range) * 100;
    return {
      x: Number.isFinite(x) ? +x.toFixed(2) : 0,
      y: Number.isFinite(y) ? +y.toFixed(2) : 100,
    };
  });

  const pointsAttr = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `0,100 ${pointsAttr} 100,100`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      {/* Grid lines */}
      <g className="opacity-20">
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#94a3b8"
            strokeWidth="0.5"
          />
        ))}
      </g>

      {/* Area fill */}
      <polyline fill="url(#chartGradient)" stroke="none" points={areaPoints} />

      {/* Line */}
      {coords.length > 1 && (
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="1.5"
          points={pointsAttr}
        />
      )}

      {/* Data markers - NOW VISIBLE */}
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r="1.8"
          fill="#4f46e5"
          stroke="#ffffff"
          strokeWidth="0.6"
        />
      ))}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ---------- Main page component ---------- */
export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [ordersDaily, setOrdersDaily] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch("/analytics/dashboard");

      const s = res?.summary ?? res ?? null;
      setSummary(s || null);

      const rawDaily = res?.dailyTrends || res?.daily || [];
      const daily = Array.isArray(rawDaily)
        ? rawDaily.map((d) => {
            const id = d?._id || {};
            const date = new Date(
              id.year || id.y || 0,
              (id.month || id.m || 1) - 1,
              id.day || id.d || 1
            );

            const label =
              date instanceof Date && !isNaN(date)
                ? date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : d?.day || d?.date || d?.label || "";

            return {
              label,
              value: d?.orders ?? d?.count ?? d?.value ?? 0,
            };
          })
        : [];

      setOrdersDaily(daily);
    } catch (e) {
      console.error("Analytics load error:", e);
      setErr(e?.message || "Failed to load analytics data");
      setSummary(null);
      setOrdersDaily([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chartPoints = useMemo(() => {
    return (ordersDaily || []).map((r) => ({
      label: r?.label ?? "",
      value: Number.isFinite(Number(r?.value)) ? Number(r.value) : 0,
    }));
  }, [ordersDaily]);

  /* Enhanced display helpers */
  const fmtNum = (n) => {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toLocaleString();
  };

  const fmtCurrency = (amt, currency = "₹") => {
    if (amt === null || amt === undefined || isNaN(amt)) return "—";
    return `${currency} ${Number(amt).toLocaleString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500">
            Overview of orders, fleet and driver performance
          </p>
        </div>
        <div>
          <button
            onClick={load}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              loading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Orders"
          value={fmtNum(
            summary?.orders ?? summary?.overview?.orders?.totalOrders
          )}
          subtitle={`Last 30 days: ${fmtNum(
            summary?.ordersLast30d ?? summary?.overview?.ordersLast30d
          )}`}
        />
        <StatCard
          title="Fleet Size"
          value={fmtNum(summary?.vehicles)}
          subtitle={`Active: ${fmtNum(summary?.vehiclesActive)}`}
        />
        <StatCard
          title="Driver Pool"
          value={fmtNum(summary?.drivers)}
          subtitle={`Active: ${fmtNum(summary?.driversActive)}`}
        />
        <StatCard
          title="Total Revenue"
          value={fmtCurrency(summary?.revenue, summary?.currency ?? "₹")}
          subtitle={summary?.currency ? `Currency: ${summary.currency}` : ""}
        />
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-slate-800">Order Trends</h3>
          <span className="text-xs text-slate-500">Last 14 days</span>
        </div>

        <div className="h-48 mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
              Loading chart...
            </div>
          ) : (
            <SimpleLineChart points={chartPoints.slice(-14)} height={192} />
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {(chartPoints && chartPoints.length > 0
            ? chartPoints.slice().reverse().slice(0, 4)
            : []
          ).map((p, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="font-semibold text-slate-800">
                {fmtNum(p.value)}
              </div>
              <div className="text-xs text-slate-500 mt-1">{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
