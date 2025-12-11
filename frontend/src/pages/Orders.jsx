import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch } from '../services/api';

/**
 * Orders page
 *
 * API expectations (flexible):
 * - GET /orders?status=&q=&page=&limit=   -> returns either an array OR { orders: [...], total }
 * - GET  /orders/:id                       -> returns order object
 * - PATCH /orders/:id                      -> accepts { status } or { assignedDriver }
 *
 * If your endpoints differ, edit the paths accordingly.
 */

const STATUS_OPTIONS = [
  "all",
  "pending",
  "accepted",
  "in_transit",
  "delivered",
  "cancelled",
];

function StatusPill({ status }) {
  const s = (status || "pending").toLowerCase();
  const map = {
    pending: "bg-yellow-50 text-yellow-800",
    accepted: "bg-indigo-50 text-indigo-700",
    in_transit: "bg-blue-50 text-blue-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        map[s] || "bg-slate-50 text-slate-700"
      }`}
    >
      {s.replace("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // drawer / details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // load orders from API (server side paging)
  const loadOrders = async ({
    page = 1,
    limit = 12,
    status = "all",
    q = "",
  } = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.append("status", status);
      if (q && q.trim()) params.append("q", q.trim());
      params.append("page", page);
      params.append("limit", limit);

      const path = `/orders?${params.toString()}`;
      const res = await apiFetch(path);

      // Accept multiple shapes: array or { orders, total } or { data: { orders, total } }
      if (Array.isArray(res)) {
        setOrders(res);
        setTotal(res.length);
      } else if (res && Array.isArray(res.orders)) {
        setOrders(res.orders);
        setTotal(typeof res.total === "number" ? res.total : res.orders.length);
      } else if (res && Array.isArray(res.data)) {
        setOrders(res.data);
        setTotal(res.total || res.data.length);
      } else {
        // fallback: treat res as single-page array-like
        setOrders([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("loadOrders error:", err);
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders({ page, limit, status: statusFilter, q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter]);

  // search (debounced simple version)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadOrders({ page: 1, limit, status: statusFilter, q });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openDetails = async (orderId) => {
    setDrawerOpen(true);
    setSelectedOrder(null);
    try {
      const res = await apiFetch(`/orders/${orderId}`);
      setSelectedOrder(res.order || res || null);
    } catch (err) {
      console.error("fetch order details:", err);
      setError(err?.message || "Failed to load order details");
      setSelectedOrder(null);
    }
  };

  const changeStatus = async (orderId, nextStatus) => {
    if (!confirm(`Change order status to "${nextStatus}"?`)) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/orders/${orderId}`, {
        method: "patch",
        body: { status: nextStatus },
      });
      const updated = res.order || res;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder._id === orderId)
        setSelectedOrder(updated);
    } catch (err) {
      console.error("changeStatus error:", err);
      setError(err?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const assignDriver = async (orderId) => {
    const driverId = prompt("Enter driver id to assign (Driver._id):");
    if (!driverId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/orders/${orderId}`, {
        method: "patch",
        body: { assignedDriver: driverId },
      });
      const updated = res.order || res;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder._id === orderId)
        setSelectedOrder(updated);
    } catch (err) {
      console.error("assignDriver error:", err);
      setError(err?.message || "Failed to assign driver");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => orders, [orders]);

  // pagination helpers
  const totalPages = Math.max(
    1,
    Math.ceil((total || filtered.length || 0) / limit)
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-slate-500">
            Manage and track orders — filter, assign drivers and change status.
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
                {s === "all"
                  ? "All"
                  : s
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search id / name / phone / email"
            className="p-2 border rounded text-sm w-64"
          />

          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="p-2 border rounded text-sm"
          >
            {[6, 12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setQ("");
              setStatusFilter("all");
              setPage(1);
              loadOrders({ page: 1, limit, status: "all", q: "" });
            }}
            className="px-3 py-2 bg-slate-100 rounded text-sm"
          >
            Reset
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
                <th className="px-4 py-2 text-left">Order</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  Customer
                </th>
                <th className="px-4 py-2 text-left">Pickup → Drop</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const cust = o.customer || {};
                  return (
                    <tr
                      key={o._id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          #{o.orderId || o._id}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(
                            o.createdAt || o.createdAt || Date.now()
                          ).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          Type: {o.type || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-sm text-slate-700">
                          {cust.name || cust.fullName || cust.email || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {cust.phone || cust.mobile || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700">
                          {o.pickupLocation?.address || o.pickupAddress || "—"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          →{" "}
                          {o.deliveryLocation?.address ||
                            o.deliveryAddress ||
                            "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <StatusPill status={o.status} />
                        <div className="text-xs text-slate-400 mt-1">
                          Driver:{" "}
                          {o.assignedDriver?.driverId ||
                            o.assignedDriver?.name ||
                            "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetails(o._id)}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => assignDriver(o._id)}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50"
                          >
                            Assign
                          </button>
                          <div className="relative inline-block">
                            <select
                              disabled={actionLoading}
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value)
                                  changeStatus(o._id, e.target.value);
                                e.target.value = "";
                              }}
                              className="px-2 py-1 text-xs rounded border bg-white"
                            >
                              <option value="">Change status</option>
                              {STATUS_OPTIONS.filter((s) => s !== "all").map(
                                (s) => (
                                  <option key={s} value={s}>
                                    {s
                                      .replace("_", " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing page {page} of {totalPages} — {total || filtered.length}{" "}
            orders
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border"
              disabled={page <= 1}
            >
              Prev
            </button>
            <div className="px-2 text-sm">
              {page}/{totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded border"
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details drawer */}
      {drawerOpen && (
        <div className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white shadow-lg z-50 overflow-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Order details</h2>
            <div>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedOrder(null);
                }}
                className="px-3 py-1 rounded border"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-4">
            {!selectedOrder ? (
              <div className="text-sm text-slate-500">Loading details...</div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="text-xs text-slate-500">Order</div>
                  <div className="font-medium">
                    #{selectedOrder.orderId || selectedOrder._id}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedOrder.createdAt &&
                      new Date(selectedOrder.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-slate-500">Customer</div>
                  <div className="font-medium">
                    {selectedOrder.customer?.name ||
                      selectedOrder.customer?.email ||
                      "-"}
                  </div>
                  <div className="text-xs">{selectedOrder.customer?.phone}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-slate-500">Pickup</div>
                  <div className="text-sm">
                    {selectedOrder.pickupLocation?.address ||
                      selectedOrder.pickupAddress}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-slate-500">Delivery</div>
                  <div className="text-sm">
                    {selectedOrder.deliveryLocation?.address ||
                      selectedOrder.deliveryAddress}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-slate-500">Status</div>
                  <StatusPill status={selectedOrder.status} />
                </div>

                <div className="mb-6">
                  <div className="text-xs text-slate-500">Assigned driver</div>
                  <div className="text-sm">
                    {selectedOrder.assignedDriver?.name ||
                      selectedOrder.assignedDriver?.driverId ||
                      "—"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => assignDriver(selectedOrder._id)}
                    className="px-3 py-2 rounded border"
                  >
                    Assign Driver
                  </button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value)
                        changeStatus(selectedOrder._id, e.target.value);
                      e.target.value = "";
                    }}
                    className="px-3 py-2 rounded border"
                  >
                    <option value="">Change status</option>
                    {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                      <option key={s} value={s}>
                        {s
                          .replace("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
