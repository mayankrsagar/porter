import { useEffect, useState } from "react";

import { Link, useParams } from "react-router-dom";

import StatusPill from "../components/orders/StatusPill";
import { apiFetch } from "../services/api";

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/orders/${orderId}`);
      setOrder(res?.order || res || null);
    } catch (err) {
      console.error("fetchOrder error:", err);
      setError("Failed to load order tracking details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // optional auto-refresh every 10s
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-slate-500">
        Loading order tracking…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-red-600">
        {error || "Order not found"}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Tracking Order #{order.orderId}
          </h1>
          <p className="text-sm text-slate-500">
            Created on{" "}
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
          </p>
        </div>

        <Link
          to="/orders"
          className="text-sm px-3 py-1 border rounded hover:bg-slate-50"
        >
          Back to Orders
        </Link>
      </div>

      {/* Status */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Current Status</span>
          <StatusPill status={order.status || ""} />
        </div>
      </div>

      {/* Locations */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-2">Route</h2>
        <div className="text-sm text-slate-700">
          <div>
            <strong>Pickup:</strong> {order.pickupLocation?.address || "—"}
          </div>
          <div className="mt-1">
            <strong>Drop:</strong> {order.deliveryLocation?.address || "—"}
          </div>
        </div>
      </div>

      {/* Driver / Vehicle */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-2">Assigned</h2>
        <div className="text-sm text-slate-700">
          <div>
            <strong>Driver:</strong>{" "}
            {order.assignedDriver
              ? `${order.assignedDriver.personalInfo?.firstName || ""} ${
                  order.assignedDriver.personalInfo?.lastName || ""
                } (${order.assignedDriver.driverId})`
              : "Not assigned"}
          </div>
          <div className="mt-1">
            <strong>Vehicle:</strong>{" "}
            {order.assignedVehicle?.registrationNumber || "Not assigned"}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Order Timeline</h2>

        {order.timeline?.length ? (
          <ul className="space-y-3">
            {order.timeline.map((t, idx) => (
              <li key={idx} className="border-l-2 border-slate-200 pl-3">
                <div className="text-sm font-medium text-slate-800">
                  {t.status}
                </div>
                <div className="text-xs text-slate-500">
                  {t.timestamp ? new Date(t.timestamp).toLocaleString() : ""}
                </div>
                {t.notes && (
                  <div className="text-xs text-slate-600 mt-1">{t.notes}</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">No tracking updates yet.</div>
        )}
      </div>
    </div>
  );
}
