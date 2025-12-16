// /src/pages/MyOrders.jsx
import React, { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import OrderDetailsDrawer from "../components/orders/OrderDetailsDrawer";
import StatusPill from "../components/orders/StatusPill";
import { apiFetch } from "../services/api";

/**
 * MyOrders page
 * - shows only orders belonging to current user
 * - read-only: no assign/status controls
 * - supports pagination (page/limit)
 * - tries GET /orders/my then falls back to GET /orders?mine=true
 */

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Try two common endpoints (most backends use one of these patterns)
  const fetchOrdersForUser = async (pageNum = 1, lim = 12) => {
    setLoading(true);
    setError("");
    try {
      // Primary (preferred) endpoint
      const path1 = `/orders/my?page=${pageNum}&limit=${lim}`;
      try {
        const res = await apiFetch(path1);
        console.log("thisis inside the MyOrder");
        console.log(res);
        // Accept both array or { orders, total, ... }
        if (Array.isArray(res)) {
          setOrders(res);
          setTotal(res.length);
        } else if (res && Array.isArray(res.orders)) {
          setOrders(res.orders);
          setTotal(
            typeof res.total === "number" ? res.total : res.orders.length
          );
        } else if (res && Array.isArray(res.data)) {
          setOrders(res.data);
          setTotal(res.total || res.data.length);
        } else {
          // unexpected shape -> set empty
          setOrders([]);
          setTotal(0);
        }
        return;
      } catch (err) {
        // primary failed, try fallback
        // (don't treat as fatal yet)
      }

      // Fallback: /orders?mine=true
      const params = new URLSearchParams();
      params.append("mine", "true");
      params.append("page", pageNum);
      params.append("limit", lim);
      const path2 = `/orders?${params.toString()}`;
      const res2 = await apiFetch(path2);
      if (Array.isArray(res2)) {
        setOrders(res2);
        setTotal(res2.length);
      } else if (res2 && Array.isArray(res2.orders)) {
        setOrders(res2.orders);
        setTotal(
          typeof res2.total === "number" ? res2.total : res2.orders.length
        );
      } else if (res2 && Array.isArray(res2.data)) {
        setOrders(res2.data);
        setTotal(res2.total || res2.data.length);
      } else {
        setOrders([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("fetchOrdersForUser error:", err);
      setError(err?.message || "Failed to load your orders");
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersForUser(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const openDetails = async (orderId) => {
    setDrawerOpen(true);
    setSelectedOrder(null);
    try {
      const res = await apiFetch(`/orders/${orderId}`);
      setSelectedOrder(res?.order || res || null);
    } catch (err) {
      console.error("openDetails error:", err);
      setSelectedOrder(null);
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil((total || orders.length || 0) / limit)
  );
  const filtered = useMemo(() => orders, [orders]);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">My Orders</h1>
          <p className="text-sm text-slate-500">
            Orders you have placed — view status and track delivery.
          </p>
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
                    You have no orders.
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
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleString()
                            : "—"}
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
                            o.assignedDriver?.personalInfo?.firstName ||
                            "—"}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Vehicle:{" "}
                          {o.assignedVehicle?.registrationNumber ||
                            o.assignedVehicle?.vehicleId ||
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

                          <Link
                            to={`/tracking/${o._id}`}
                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-slate-50"
                          >
                            Track
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

      {drawerOpen && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedOrder(null);
          }}
          // read-only handlers (no assign for user)
          onOpenAssign={() => {}}
          onUnassignDriver={() => {}}
          onUnassignVehicle={() => {}}
        />
      )}
    </div>
  );
}
