// frontend/src/components/Fleet.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch } from '../services/api';

function StatusPill({ status }) {
  const s = (status || "unknown").toLowerCase();
  const map = {
    available: "bg-green-100 text-green-800",
    busy: "bg-indigo-100 text-indigo-800",
    assigned: "bg-indigo-100 text-indigo-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    offline: "bg-slate-100 text-slate-700",
    unknown: "bg-slate-100 text-slate-700",
  };
  const cls = map[s] || map.unknown;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          s === "available"
            ? "bg-green-500"
            : s === "busy" || s === "assigned"
            ? "bg-indigo-500"
            : s === "maintenance"
            ? "bg-yellow-500"
            : "bg-slate-400"
        }`}
      />
      {status || "Unknown"}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
      <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
      <div className="h-6 w-1/2 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-200 rounded" />
    </div>
  );
}

export default function Fleet() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setLoadingStats(true);
      setError("");

      const res = await apiFetch("/vehicles");
      // res expected: { vehicles: [...], totalPages, currentPage, total }
      const list = Array.isArray(res?.vehicles) ? res.vehicles : [];
      setVehicles(list);
    } catch (e) {
      console.error("Fleet load error:", e);
      const message = e?.message || e?.data?.message || "Failed to load fleet.";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingStats(false);
    }
  }

  const stats = useMemo(() => {
    const total = vehicles.length;
    const byStatus = vehicles.reduce(
      (acc, v) => {
        const s = (v.status || "unknown").toLowerCase();
        if (s === "available") acc.available += 1;
        else if (s === "busy" || s === "assigned") acc.busy += 1;
        else if (s === "maintenance") acc.maintenance += 1;
        else acc.other += 1;
        return acc;
      },
      { total, available: 0, busy: 0, maintenance: 0, other: 0 }
    );
    return byStatus;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    let list = [...vehicles];

    if (statusFilter !== "all") {
      list = list.filter(
        (v) => (v.status || "").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((v) => {
        const driverName =
          v.driverName || v.driver?.name || v.assignedDriver?.name || "";
        const vehicleNumber = v.vehicleNumber || v.plate || v.number || "";
        const type = v.type || v.category || "";
        return (
          driverName.toLowerCase().includes(q) ||
          vehicleNumber.toLowerCase().includes(q) ||
          type.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [vehicles, statusFilter, search]);

  const filterTabs = [
    { key: "all", label: `All (${stats.total})` },
    { key: "available", label: `Available (${stats.available})` },
    { key: "busy", label: `Busy (${stats.busy})` },
    { key: "maintenance", label: `Maintenance (${stats.maintenance})` },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fleet</h1>
          <p className="text-sm text-slate-500">
            Monitor vehicle availability, assignments and health across your
            Porter fleet.
          </p>
        </div>
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
              d="M4.5 4.5v6h6M19.5 19.5v-6h-6M5 13a7 7 0 0112-4"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        {loadingStats ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500">Total vehicles</div>
              <div className="text-xl font-semibold text-slate-800">
                {stats.total}
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500">Available</div>
              <div className="text-xl font-semibold text-emerald-600">
                {stats.available}
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500">Busy / Assigned</div>
              <div className="text-xl font-semibold text-indigo-600">
                {stats.busy}
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500">Maintenance / Other</div>
              <div className="text-xl font-semibold text-amber-600">
                {stats.maintenance + stats.other}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium ${
                statusFilter === tab.key
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-64">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
                <path d="M16 16l4 4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vehicle / driver / type"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-sm text-slate-500 bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center">
          No vehicles match the current filters. Try changing the status filter
          or clearing the search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredVehicles.map((v) => {
            const id = v._id || v.id || v.vehicleId;
            const driverName =
              v.driverName ||
              v.driver?.name ||
              v.assignedDriver?.name ||
              "Unassigned";
            const vehicleNumber = v.vehicleNumber || v.plate || v.number || "—";
            const type = v.type || v.category || "Vehicle";
            const capacity = v.capacity || v.loadCapacity || v.maxLoad || null;
            const currentLoad = v.currentLoad || v.load || null;
            const location =
              v.lastLocation?.address ||
              v.location?.address ||
              v.location ||
              "Location not available";

            return (
              <div
                key={id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      {type}
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {vehicleNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      Driver:{" "}
                      <span className="font-medium text-gray-700">
                        {driverName}
                      </span>
                    </div>
                  </div>
                  <StatusPill status={v.status} />
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {capacity && (
                    <span className="mr-3">
                      Capacity:{" "}
                      <span className="font-medium text-gray-700">
                        {capacity}
                      </span>
                    </span>
                  )}
                  {currentLoad && (
                    <span>
                      Load:{" "}
                      <span className="font-medium text-gray-700">
                        {currentLoad}
                      </span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Last known location:{" "}
                  <span className="font-medium text-gray-700">{location}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
