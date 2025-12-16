import React, { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";

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

function CopyButton({ text, label = "Copy", small = false }) {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("copy failed", err);
      setCopied(false);
    }
  };

  return (
    <button
      onClick={doCopy}
      title={copied ? "Copied" : `Copy ${text || "value"}`}
      className={`ml-2 inline-flex items-center gap-2 px-2 py-1 rounded text-xs border hover:bg-slate-50 ${
        small ? "text-xs" : ""
      }`}
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="1.5" />
        <path
          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
          strokeWidth="1.5"
        />
      </svg>
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function DriverRow({
  driver,
  onStartEdit,
  onToggleActive,
  onDelete,
  savingId,
  onSaveEdit,
}) {
  const pi = driver.personalInfo || {};
  const name = `${pi.firstName || ""} ${pi.lastName || ""}`.trim() || "Unnamed";

  return (
    <tr key={driver._id} className="border-t border-slate-100 align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{name}</div>
        <div className="text-xs text-slate-500">
          ID: {driver.driverId}
          <CopyButton text={driver.driverId} label="Copy ID" small />
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Created:{" "}
          {new Date(driver.createdAt || Date.now()).toLocaleDateString()}
        </div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <div className="text-xs text-slate-700">{pi.email || "—"}</div>
        <div className="text-xs text-slate-500">{pi.phone || "No phone"}</div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <div className="text-xs text-slate-700">
          {driver.license?.number || "—"}
        </div>
        <div className="text-xs text-slate-500">
          {driver.license?.type || ""}
        </div>
      </td>

      <td className="px-4 py-3">
        <StatusPill status={driver.status} />
      </td>

      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => onStartEdit(driver)}
            className="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50"
          >
            Edit
          </button>

          <button
            disabled={savingId === driver._id}
            onClick={() => onToggleActive(driver)}
            className={`px-2 py-1 text-xs rounded border ${
              driver.status === "suspended"
                ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                : "text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
            } disabled:opacity-60`}
          >
            {driver.status === "suspended" ? "Activate" : "Deactivate"}
          </button>

          <button
            disabled={savingId === driver._id}
            onClick={() => onDelete(driver._id)}
            className="px-2 py-1 text-xs rounded border bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditForm({ driver, data, setData, onCancel, onSave, savingId }) {
  return (
    <tr className="bg-slate-50 border-t">
      <td colSpan={5} className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <input
              className="w-full px-2 py-1 border rounded text-sm"
              value={data.firstName}
              onChange={(e) =>
                setData((p) => ({ ...p, firstName: e.target.value }))
              }
              placeholder="First name"
            />
            <input
              className="mt-2 w-full px-2 py-1 border rounded text-sm"
              value={data.lastName}
              onChange={(e) =>
                setData((p) => ({ ...p, lastName: e.target.value }))
              }
              placeholder="Last name"
            />
          </div>

          <div>
            <input
              className="w-full px-2 py-1 border rounded text-sm"
              value={data.phone}
              onChange={(e) =>
                setData((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="Phone"
            />
            <input
              className="mt-2 w-full px-2 py-1 border rounded text-sm"
              value={data.notes}
              onChange={(e) =>
                setData((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Notes"
            />
          </div>

          <div>
            <select
              className="w-full px-2 py-1 border rounded text-sm"
              value={data.status}
              onChange={(e) =>
                setData((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
              <option value="suspended">Suspended</option>
            </select>

            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-3 py-2 rounded border text-sm"
              >
                Cancel
              </button>
              <button
                disabled={savingId === driver._id}
                onClick={() => onSave(driver._id)}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
              >
                {savingId === driver._id ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AdminDriversPage() {
  const { user } = useAuth();

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

  // load drivers
  const load = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await apiFetch("/admin/drivers");
      setDrivers(res.drivers || res || []);
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
          (name || "").toLowerCase().includes(q) ||
          (pi.email || "").toLowerCase().includes(q) ||
          (pi.phone || "").toLowerCase().includes(q) ||
          (d.driverId || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [drivers, statusFilter, search]);

  // editing helpers
  const startEdit = (driver) => {
    const pi = driver.personalInfo || {};
    setEditId(driver._id);
    setEditData({
      firstName: pi.firstName || "",
      lastName: pi.lastName || "",
      phone: pi.phone || "",
      status: driver.status || "available",
      notes: driver.meta?.notes || "",
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
      const updated = res.driver || res;
      setDrivers((prev) => prev.map((d) => (d._id === id ? updated : d)));
      setInfo("Driver updated");
      cancelEdit();
    } catch (err) {
      console.error("saveEdit error:", err);
      setError(err?.message || "Failed to update driver");
    } finally {
      setSavingId(null);
    }
  };

  // toggle suspended/active
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
      const updated = res.driver || res;
      setDrivers((prev) => prev.map((d) => (d._id === id ? updated : d)));
      setInfo(
        nextStatus === "suspended" ? "Driver deactivated" : "Driver activated"
      );
      if (editId === id) cancelEdit();
    } catch (err) {
      console.error("toggleActive error:", err);
      setError(err?.message || "Failed to update driver status");
    } finally {
      setSavingId(null);
    }
  };

  // delete driver
  const deleteDriver = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this driver? This action cannot be undone."
      )
    )
      return;
    setSavingId(id);
    setError("");
    setInfo("");
    try {
      await apiFetch(`/admin/drivers/${id}`, { method: "delete" });
      setDrivers((prev) => prev.filter((d) => d._id !== id));
      setInfo("Driver deleted");
      if (editId === id) cancelEdit();
    } catch (err) {
      console.error("delete driver error:", err);
      setError(err?.message || err?.data?.message || "Failed to delete driver");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Drivers</h1>
          {user && user.role === "admin" && (
            <div className="mt-3 flex gap-2">
              <Link
                to="/admin/drivers/create"
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm"
              >
                Create driver
              </Link>
            </div>
          )}
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
                filtered.map((d) => (
                  <React.Fragment key={d._id}>
                    <DriverRow
                      driver={d}
                      onStartEdit={startEdit}
                      onToggleActive={toggleActive}
                      onDelete={deleteDriver}
                      savingId={savingId}
                    />
                    {editId === d._id && (
                      <EditForm
                        driver={d}
                        data={editData}
                        setData={setEditData}
                        onCancel={cancelEdit}
                        onSave={saveEdit}
                        savingId={savingId}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
