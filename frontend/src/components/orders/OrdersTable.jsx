import React from "react";

import StatusPill from "./StatusPill";

export default function OrdersTable({
  orders = [],
  loading,
  onView,
  onOpenAssign,
  onChangeStatus,
  actionLoading,
}) {
  return (
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
                  Loading orders…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const cust = o.customer || {};
                const createdAt = o.createdAt
                  ? new Date(o.createdAt).toLocaleString()
                  : "—";

                return (
                  <tr key={o._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        #{o.orderId || o._id}
                      </div>
                      <div className="text-xs text-slate-500">{createdAt}</div>
                      <div className="text-xs text-slate-500">
                        Type: {o.type || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-slate-700">
                        {cust.name || cust.email || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {cust.phone || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700">
                        {o.pickupLocation?.address || "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        → {o.deliveryLocation?.address || "—"}
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
                      <div className="text-xs text-slate-400">
                        Vehicle:{" "}
                        {o.assignedVehicle?.registrationNumber ||
                          o.assignedVehicle?.vehicleId ||
                          "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onView(o._id)}
                          className="px-2 py-1 text-xs border rounded"
                        >
                          View
                        </button>

                        <button
                          onClick={() => onOpenAssign(o._id)}
                          className="px-2 py-1 text-xs border rounded"
                        >
                          Assign
                        </button>

                        <select
                          disabled={actionLoading}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onChangeStatus(o._id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="px-2 py-1 text-xs border rounded"
                        >
                          <option value="">Change status</option>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="assigned">Assigned</option>
                          <option value="picked-up">Picked up</option>
                          <option value="in-transit">In transit</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
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
  );
}
