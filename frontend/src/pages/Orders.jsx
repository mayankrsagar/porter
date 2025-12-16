import React, { useEffect, useMemo, useState } from "react";

import AssignDriverModal from "../components/orders/AssignDriverModal";
import OrderDetailsDrawer from "../components/orders/OrderDetailsDrawer";
import OrdersTable from "../components/orders/OrdersTable";
import { apiFetch } from "../services/api";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Assigned", value: "assigned" },
  { label: "Picked up", value: "picked-up" },
  { label: "In transit", value: "in-transit" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const limit = 12;
  const [total, setTotal] = useState(0);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState(null);
  const [assignMode, setAssignMode] = useState("both"); // driver | vehicle | both

  const [actionLoading, setActionLoading] = useState(false);

  /* -------------------- Load Orders -------------------- */
  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("q", search);
      params.append("page", page);
      params.append("limit", limit);

      const res = await apiFetch(`/orders?${params.toString()}`);
      const list = res?.orders || res || [];

      setOrders(Array.isArray(list) ? list : []);
      setTotal(res?.total || list.length || 0);
    } catch (err) {
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadOrders();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* -------------------- Drawer -------------------- */
  const openDetails = async (orderId) => {
    setDrawerOpen(true);
    setSelectedOrder(null); // important for null-safe drawer
    try {
      const res = await apiFetch(`/orders/${orderId}`);
      setSelectedOrder(res?.order || res || null);
    } catch {
      setSelectedOrder(null);
    }
  };

  /* -------------------- Status -------------------- */
  const changeStatus = async (orderId, status) => {
    if (!status) return;
    if (!confirm(`Change order status to "${status.replace("-", " ")}"?`))
      return;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/orders/${orderId}`, {
        method: "patch",
        body: { status },
      });
      const updated = res?.order || res;

      setOrders((prev) =>
        prev.map((o) => (o._id === updated._id ? updated : o))
      );

      setSelectedOrder((prev) => (prev?._id === updated._id ? updated : prev));
    } finally {
      setActionLoading(false);
    }
  };

  /* -------------------- Assign / Unassign -------------------- */
  const openAssign = (orderId, mode = "both") => {
    setAssignOrderId(orderId);
    setAssignMode(mode);
    setAssignModalOpen(true);
  };

  const handleAssigned = (updated) => {
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    setSelectedOrder((prev) => (prev?._id === updated._id ? updated : prev));
  };

  const unassignDriver = async () => {
    if (!selectedOrder) return;
    if (!confirm("Unassign driver from this order?")) return;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/orders/${selectedOrder._id}`, {
        method: "patch",
        body: { driverId: null },
      });
      handleAssigned(res?.order || res);
    } finally {
      setActionLoading(false);
    }
  };

  const unassignVehicle = async () => {
    if (!selectedOrder) return;
    if (!confirm("Unassign vehicle from this order?")) return;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/orders/${selectedOrder._id}`, {
        method: "patch",
        body: { vehicleId: null },
      });
      handleAssigned(res?.order || res);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => orders, [orders]);

  /* -------------------- Render -------------------- */
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-semibold mb-4">Orders</h1>

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border rounded"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders"
          className="p-2 border rounded w-64"
        />
      </div>

      <OrdersTable
        orders={filtered}
        loading={loading}
        onView={openDetails}
        onOpenAssign={(id) => openAssign(id, "both")}
        onChangeStatus={changeStatus}
        actionLoading={actionLoading}
      />

      {/* Drawer */}
      {drawerOpen && (
        <OrderDetailsDrawer
          order={selectedOrder}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedOrder(null);
          }}
          onOpenAssign={openAssign}
          onUnassignDriver={unassignDriver}
          onUnassignVehicle={unassignVehicle}
        />
      )}

      {/* Assign Modal */}
      <AssignDriverModal
        open={assignModalOpen}
        orderId={assignOrderId}
        mode={assignMode}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={handleAssigned}
      />
    </div>
  );
}
