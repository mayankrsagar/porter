import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch } from '../../services/api';

const STATUS_OPTIONS = ["all", "available", "busy", "offline", "suspended"];

function StatusPill({ status }) {
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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotCls}`} />
      {label}
    </span>
  );
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    status: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/admin/drivers", {
        method: "get",
      });
      setDrivers(res.drivers || []);
    } catch (err) {
      console.error("load drivers error:", err);
      setError(err?.message || "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...drivers];
    if (statusFilter !== "all") {
      list = list.filter(
        (d) => (d.status || "").toLowerCase() === statusFilter
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => {
        const pi = d.personalInfo || {};
        const name = `${pi.firstName || ""} ${pi.lastName || ""}`.trim();
        return (
          name.toLowerCase().includes(q) ||
          (pi.email || "").toLowerCase().includes(q) ||
          (pi.phone || "").toLowerCase().includes(q) ||
          (d.driverId || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [drivers, statusFilter, search]);

  const startEdit = (driver) => {
    const pi = driver.personalInfo || {};
    setEditId(driver._id);
    setEditData({
      firstName: pi.firstName || "",
      lastName: pi.lastName || "",
      phone: pi.phone || "",
      status: driver.status || "available",
      notes: driver.notes || "",
    });
    setInfo("");
    setError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({
      firstName: "",
      lastName: "",
      phone: "",
      status: "",
      notes: "",
    });
  };

  const saveEdit = async (id) => {
    setSavingId(id);
    setError("");
    setInfo("");
    try {
      const body = {
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        phone: editData.phone.trim(),
        status: editData.status,
        notes: editData.notes,
      };
      const res = await apiFetch(`/admin/drivers/${id}`, {
        method: "patch",
        body,
      });

      setDrivers((prev) => prev.map((d) => (d._id === id ? res.driver : d)));
      setInfo("Driver updated");
      cancelEdit();
    } catch (err) {
      console.error("saveEdit error:", err);
      setError(err?.message || "Failed to update driver");
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (driver) => {
    const id = driver._id;
    const nextStatus =
      driver.status === "suspended" ? "available" : "suspended";

    setSavingId(id);
    setError("");
    setInfo("");
    try {
      const res = await apiFetch(`/admin/drivers/${id}`, {
        method: "patch",
        body: { status: nextStatus },
      });
      setDrivers((prev) => prev.map((d) => (d._id === id ? res.driver : d)));
      setInfo(
        nextStatus === "suspended" ? "Driver deactivated" : "Driver activated"
      );
    } catch (err) {
      console.error("toggleActive error:", err);
      setError(err?.message || "Failed to update driver status");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Drivers</h1>
          <p className="text-sm text-slate-500">
            Manage driver accounts, statuses and basic details.
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium ${
                statusFilter === s
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-72">
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
              placeholder="Search by name, email, phone or ID"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-4 py-2">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded px-4 py-2">
          {info}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  Contact
                </th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  License
                </th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Loading drivers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No drivers match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const pi = d.personalInfo || {};
                  const name = `${pi.firstName || ""} ${
                    pi.lastName || ""
                  }`.trim();
                  const license = d.license || {};
                  const isEditing = editId === d._id;

                  return (
                    <tr
                      key={d._id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {name || "Unnamed"}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {d.driverId}
                        </div>
                        {isEditing && (
                          <div className="mt-2 space-y-1">
                            <input
                              className="w-full px-2 py-1 border rounded text-xs"
                              value={editData.firstName}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  firstName: e.target.value,
                                }))
                              }
                              placeholder="First name"
                            />
                            <input
                              className="w-full px-2 py-1 border rounded text-xs"
                              value={editData.lastName}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  lastName: e.target.value,
                                }))
                              }
                              placeholder="Last name"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-slate-700">
                          {pi.email || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {pi.phone || "No phone"}
                        </div>
                        {isEditing && (
                          <input
                            className="mt-2 w-full px-2 py-1 border rounded text-xs"
                            value={editData.phone}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="Phone"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-slate-700">
                          {license.number || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {license.type || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="px-2 py-1 border rounded text-xs"
                            value={editData.status}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                status: e.target.value,
                              }))
                            }
                          >
                            <option value="available">Available</option>
                            <option value="busy">Busy</option>
                            <option value="offline">Offline</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        ) : (
                          <StatusPill status={d.status} />
                        )}
                        {isEditing && (
                          <textarea
                            className="mt-2 w-full px-2 py-1 border rounded text-xs"
                            rows={2}
                            value={editData.notes}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Internal notes"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                disabled={savingId === d._id}
                                onClick={() => saveEdit(d._id)}
                                className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                              >
                                {savingId === d._id ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 py-1 text-xs rounded border"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(d)}
                              className="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            disabled={savingId === d._id}
                            onClick={() => toggleActive(d)}
                            className={`px-2 py-1 text-xs rounded border ${
                              d.status === "suspended"
                                ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                                : "text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
                            } disabled:opacity-60`}
                          >
                            {d.status === "suspended"
                              ? "Activate"
                              : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
