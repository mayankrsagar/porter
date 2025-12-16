import React from "react";

import StatusPill from "./StatusPill";

export default function OrderDetailsDrawer({
  order,
  onClose,
  onOpenAssign,
  onUnassignDriver,
  onUnassignVehicle,
}) {
  if (!order) {
    return (
      <div className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white shadow-lg z-50">
        <div className="p-4 border-b flex justify-between">
          <h2 className="font-semibold">Order details</h2>
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Close
          </button>
        </div>
        <div className="p-6 text-sm text-slate-500">Loading order details…</div>
      </div>
    );
  }

  const {
    _id,
    orderId,
    createdAt,
    customer,
    pickupLocation,
    pickupAddress,
    deliveryLocation,
    deliveryAddress,
    status,
    assignedDriver,
    assignedVehicle,
  } = order;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-1/3 bg-white shadow-lg z-50 overflow-auto">
      <div className="p-4 border-b flex justify-between">
        <h2 className="font-semibold">Order details</h2>
        <button onClick={onClose} className="px-3 py-1 border rounded">
          Close
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-slate-500">Order</div>
          <div className="font-medium">#{orderId || _id}</div>
          <div className="text-xs text-slate-500">
            {createdAt && new Date(createdAt).toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Customer</div>
          <div className="font-medium">
            {customer?.name || customer?.email || "—"}
          </div>
          <div className="text-xs">{customer?.phone || "—"}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Pickup</div>
          <div>{pickupLocation?.address || pickupAddress || "—"}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Delivery</div>
          <div>{deliveryLocation?.address || deliveryAddress || "—"}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Status</div>
          <StatusPill status={status} />
        </div>

        <div>
          <div className="text-xs text-slate-500">Assigned driver</div>
          <div>{assignedDriver?.driverId || "—"}</div>
          <div className="text-xs text-slate-400">
            Vehicle:{" "}
            {assignedVehicle?.registrationNumber ||
              assignedVehicle?.vehicleId ||
              "—"}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-2 pt-3">
          <button
            onClick={() => onOpenAssign(_id, "driver")}
            className="px-3 py-2 border rounded"
          >
            Change / Assign Driver
          </button>

          <button
            onClick={() => onOpenAssign(_id, "vehicle")}
            className="px-3 py-2 border rounded"
          >
            Change / Assign Vehicle
          </button>

          <button
            onClick={() => onOpenAssign(_id, "both")}
            className="px-3 py-2 border rounded"
          >
            Assign Both
          </button>

          {assignedDriver && (
            <button
              onClick={onUnassignDriver}
              className="px-3 py-2 border rounded text-red-600"
            >
              Unassign Driver
            </button>
          )}

          {assignedVehicle && (
            <button
              onClick={onUnassignVehicle}
              className="px-3 py-2 border rounded text-red-600"
            >
              Unassign Vehicle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
