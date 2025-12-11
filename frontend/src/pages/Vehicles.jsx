import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import CreateVehicleModal from '../components/CreateVehicleModal ';
import { apiFetch } from '../services/api';

const STATUS_OPTIONS = ["all", "active", "inactive", "maintenance", "retired"];

/* small pill */
function SmallPill({ children }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-50 text-slate-700">
      {children}
    </span>
  );
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // details drawer
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);

  const loadVehicles = async ({
    page = 1,
    limit = 12,
    status = "all",
    q = "",
  } = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (status && status !== "all") params.append("status", status);
      if (q && q.trim()) params.append("q", q.trim());
      const res = await apiFetch(`/vehicles?${params.toString()}`);
      if (Array.isArray(res)) {
        setVehicles(res);
        setTotal(res.length);
      } else if (res && Array.isArray(res.vehicles)) {
        setVehicles(res.vehicles);
        setTotal(
          typeof res.total === "number" ? res.total : res.vehicles.length
        );
      } else {
        setVehicles([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("loadVehicles:", err);
      setError(err?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles({ page, limit, status: statusFilter, q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter]);

  // search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadVehicles({ page: 1, limit, status: statusFilter, q });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openDetails = async (id) => {
    setDrawerOpen(true);
    setSelected(null);
    try {
      const res = await apiFetch(`/vehicles/${id}`);
      setSelected(res.vehicle || res || null);
    } catch (err) {
      console.error("vehicle details err:", err);
      setError(err?.message || "Failed to load vehicle");
      setSelected(null);
    }
  };

  const onVehicleCreated = (created) => {
    if (!created) return;
    setVehicles((p) => [created, ...p]);
    setTotal((t) => (typeof t === "number" ? t + 1 : t));
  };

  const deleteVehicle = async (id) => {
    if (!confirm("Delete vehicle? This cannot be undone.")) return;
    try {
      await apiFetch(`/vehicles/${id}`, { method: "delete" });
      setVehicles((p) => p.filter((v) => v._id !== id));
      setTotal((t) => (typeof t === "number" ? Math.max(0, t - 1) : t));
      if (selected?._id === id) {
        setSelected(null);
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error("deleteVehicle:", err);
      setError(err?.message || "Failed to delete");
    }
  };

  const assignDriver = async (vehicleId) => {
    const driverId = prompt(
      "Driver id to assign to this vehicle (Driver._id):"
    );
    if (!driverId) return;
    try {
      const res = await apiFetch(`/vehicles/${vehicleId}`, {
        method: "patch",
        body: { assignedDriver: driverId },
      });
      const updated = res.vehicle || res;
      setVehicles((prev) =>
        prev.map((v) => (v._id === vehicleId ? updated : v))
      );
      if (selected?._id === vehicleId) setSelected(updated);
    } catch (err) {
      console.error("assignDriver:", err);
      setError(err?.message || "Failed to assign driver");
    }
  };

  const filtered = useMemo(() => vehicles, [vehicles]);
  const totalPages = Math.max(
    1,
    Math.ceil((total || filtered.length || 0) / limit)
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Vehicles</h1>
          <p className="text-sm text-slate-500">
            Manage your vehicle fleet — create, assign drivers and view details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="p-2 border rounded text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by reg, model or id"
            className="p-2 border rounded text-sm"
          />
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="p-2 border rounded text-sm"
          >
            {[8, 12, 24].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded bg-indigo-600 text-white"
          >
            Create
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-4 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Vehicle</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  Registration
                </th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    Loading vehicles...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No vehicles found.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {v.make} {v.model}
                      </div>
                      <div className="text-xs text-slate-500">
                        ID: {v.vehicleId || v._id}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div>{v.registrationNumber || "—"}</div>
                      <div className="text-xs text-slate-500">
                        {v.year || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SmallPill>
                        {(v.status || "unknown").toString()}
                      </SmallPill>
                      <div className="text-xs text-slate-400 mt-1">
                        Driver:{" "}
                        {v.assignedDriver?.name ||
                          v.assignedDriver?.driverId ||
                          "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetails(v._id)}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          View
                        </button>
                        <button
                          onClick={() => assignDriver(v._id)}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => deleteVehicle(v._id)}
                          className="px-2 py-1 rounded border text-xs bg-red-600 text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page {page} — {total || filtered.length} vehicles
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border"
            >
              Prev
            </button>
            <div className="px-2 text-sm">{page}</div>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* details drawer */}
      {drawerOpen && (
        <div className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white shadow-lg z-50 overflow-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Vehicle details</h2>
            <button
              onClick={() => {
                setDrawerOpen(false);
                setSelected(null);
              }}
              className="px-3 py-1 rounded border"
            >
              Close
            </button>
          </div>
          <div className="p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Vehicle</div>
                  <div className="font-medium">
                    {selected.make} {selected.model}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selected.registrationNumber}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="text-sm">{selected.status}</div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Assigned driver</div>
                  <div className="text-sm">
                    {selected.assignedDriver?.name ||
                      selected.assignedDriver?.driverId ||
                      "—"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => assignDriver(selected._id)}
                    className="px-3 py-2 rounded border"
                  >
                    Assign Driver
                  </button>
                  <button
                    onClick={() => deleteVehicle(selected._id)}
                    className="px-3 py-2 rounded bg-red-600 text-white"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* create vehicle modal */}
      <CreateVehicleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onVehicleCreated}
      />
    </div>
  );
}
