// src/pages/OrderDetails.jsx
import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import Spinner from "../components/Spinner"; // optional: if you have one
import { apiFetch } from "../services/api";

export default function OrderDetailsPageInner() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    apiFetch(`/orders/${id}`)
      .then((res) => {
        // backend returns order object directly
        if (!res || res.error) {
          const msg = res?.error || "Order not found";
          setError(msg);
          setOrder(null);
        } else {
          setOrder(res.order || res); // tolerate both shapes
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to load order");
        setOrder(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading)
    return (
      <div className="py-12">
        <Spinner />
      </div>
    );

  if (error) {
    return (
      <div className="py-12 max-w-4xl mx-auto text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-3">
          Could not load order
        </h2>
        <p className="mb-6">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 border rounded"
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded"
            onClick={() => navigate("/admin/orders")}
          >
            View orders list
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-semibold">Order not found</h2>
      </div>
    );
  }

  const driverName =
    order.assignedDriver &&
    (order.assignedDriver.personalInfo
      ? `${order.assignedDriver.personalInfo.firstName || ""} ${
          order.assignedDriver.personalInfo.lastName || ""
        }`
      : order.assignedDriver.driverId || order.assignedDriver._id);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order Details</h1>
          <div className="text-sm text-slate-500">
            #{order.orderId || order._id}
          </div>
        </div>

        <div className="space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded"
          >
            Back
          </button>
          <span className="px-3 py-2 bg-slate-100 rounded text-sm">
            {order.status}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Customer</h3>
          <div>{order.customer?.name}</div>
          <div className="text-sm text-slate-600">{order.customer?.phone}</div>
          {order.customer?.email && (
            <div className="text-sm">{order.customer.email}</div>
          )}
          {order.customer?.address && (
            <div className="text-sm mt-2">{order.customer.address}</div>
          )}
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Vehicle & Driver</h3>
          <div>Driver: {driverName || "Unassigned"}</div>
          <div className="text-sm text-slate-600">
            Vehicle: {order.assignedVehicle?.registrationNumber || "Unassigned"}
          </div>
          <div className="text-sm mt-2">Vehicle type: {order.vehicleType}</div>
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Pickup</h3>
          <div>{order.pickupLocation?.address}</div>
          {order.pickupLocation?.coordinates && (
            <div className="text-sm text-slate-600">
              {order.pickupLocation.coordinates.lat},{" "}
              {order.pickupLocation.coordinates.lng}
            </div>
          )}
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Delivery</h3>
          <div>{order.deliveryLocation?.address}</div>
          {order.deliveryLocation?.coordinates && (
            <div className="text-sm text-slate-600">
              {order.deliveryLocation.coordinates.lat},{" "}
              {order.deliveryLocation.coordinates.lng}
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 p-4 border rounded">
        <h3 className="font-semibold mb-2">Package</h3>
        <div>Weight: {order.packageDetails?.weight} kg</div>
        <div>
          Dimensions: {order.packageDetails?.dimensions?.length} ×{" "}
          {order.packageDetails?.dimensions?.width} ×{" "}
          {order.packageDetails?.dimensions?.height}
        </div>
        {order.packageDetails?.description && (
          <div className="text-sm mt-2">{order.packageDetails.description}</div>
        )}
        {order.packageDetails?.specialInstructions && (
          <div className="text-sm mt-1 text-slate-600">
            Note: {order.packageDetails.specialInstructions}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Pricing</h3>
          <div>
            Base fare: {order.pricing?.baseFare} {order.pricing?.currency}
          </div>
          <div>Distance: {order.pricing?.distance} km</div>
          <div className="font-semibold mt-2">
            Total: {order.pricing?.totalAmount} {order.pricing?.currency}
          </div>
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-2">Timeline</h3>
          <ul className="text-sm space-y-2 max-h-48 overflow-auto">
            {(order.timeline || []).map((t, i) => (
              <li key={i} className="border-b pb-2">
                <div className="text-xs text-slate-500">
                  {new Date(t.timestamp).toLocaleString()}
                </div>
                <div>
                  {t.status} — {t.notes || ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
