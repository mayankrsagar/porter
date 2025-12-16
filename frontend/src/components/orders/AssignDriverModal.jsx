// /src/components/orders/AssignDriverModal.jsx
import React, { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../services/api";

/**
 * AssignDriverModal (fixed)
 *
 * Improvements:
 * - Allows assigning vehicle-only (button no longer requires a driver)
 * - Prefills selectedDriverId / selectedVehicleId from the order (if orderId passed)
 * - Keeps existing behavior: loads available drivers & vehicles, fetches full driver when selected
 * - Resets state on open/close
 *
 * Props:
 *  - open (bool)
 *  - onClose()
 *  - orderId (string)        // used to prefill existing assignment
 *  - onAssigned(updatedOrder)
 */
export default function AssignDriverModal({
  open,
  onClose,
  orderId,
  onAssigned,
}) {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [driversError, setDriversError] = useState("");
  const [vehiclesError, setVehiclesError] = useState("");

  const [searchDriver, setSearchDriver] = useState("");
  const [searchVehicle, setSearchVehicle] = useState("");

  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedDriverFull, setSelectedDriverFull] = useState(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Reset + load drivers & vehicles and fetch order's current assignment when modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    // reset local selection / UI state
    setDrivers([]);
    setVehicles([]);
    setSelectedDriverId("");
    setSelectedDriverFull(null);
    setSelectedVehicleId("");
    setSearchDriver("");
    setSearchVehicle("");
    setDriversError("");
    setVehiclesError("");

    // fetch available drivers
    (async () => {
      setLoadingDrivers(true);
      try {
        const res = await apiFetch("/drivers?status=available&limit=200");
        const list = res?.drivers || res || [];
        if (!cancelled) setDrivers(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled)
          setDriversError(err?.message || "Failed to load drivers");
      } finally {
        if (!cancelled) setLoadingDrivers(false);
      }
    })();

    // fetch available vehicles
    (async () => {
      setLoadingVehicles(true);
      try {
        const res = await apiFetch("/vehicles?status=available&limit=200");
        const list = res?.vehicles || res || [];
        if (!cancelled) setVehicles(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled)
          setVehiclesError(err?.message || "Failed to load vehicles");
      } finally {
        if (!cancelled) setLoadingVehicles(false);
      }
    })();

    // If orderId provided, prefill selections from current order assignment
    (async () => {
      if (!orderId) return;
      try {
        const res = await apiFetch(`/orders/${orderId}`);
        const order = res?.order || res || null;
        if (cancelled || !order) return;
        // assignedDriver may be populated object or id string
        if (order.assignedDriver) {
          const drvId = order.assignedDriver._id || order.assignedDriver;
          setSelectedDriverId(String(drvId));
        }
        if (order.assignedVehicle) {
          const vehId = order.assignedVehicle._id || order.assignedVehicle;
          setSelectedVehicleId(String(vehId));
        }
      } catch (err) {
        // ignore prefill failures (not critical)
        console.warn("prefill order assignment failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  // when selectedDriverId changes, fetch full driver details to show assignedVehicle
  useEffect(() => {
    if (!selectedDriverId) {
      setSelectedDriverFull(null);
      // do NOT clear selectedVehicleId here: user may have chosen a vehicle independent of driver
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/drivers/${selectedDriverId}`);
        const drv = res?.driver || res || null;
        if (cancelled) return;
        setSelectedDriverFull(drv);
        // Default vehicle selection when driver has an assigned vehicle and no vehicle chosen yet
        if (drv?.assignedVehicle && !selectedVehicleId) {
          const vid = drv.assignedVehicle._id || drv.assignedVehicle;
          setSelectedVehicleId(String(vid));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("fetch driver details error:", err);
          setSelectedDriverFull(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriverId]);

  const filteredDrivers = useMemo(() => {
    if (!searchDriver.trim()) return drivers;
    const q = searchDriver.trim().toLowerCase();
    return drivers.filter((d) => {
      const pi = d.personalInfo || {};
      const name = `${pi.firstName || ""} ${pi.lastName || ""}`.trim();
      return (
        (name || "").toLowerCase().includes(q) ||
        (pi.email || "").toLowerCase().includes(q) ||
        (pi.phone || "").toLowerCase().includes(q) ||
        (d.driverId || "").toLowerCase().includes(q)
      );
    });
  }, [drivers, searchDriver]);

  const filteredVehicles = useMemo(() => {
    if (!searchVehicle.trim()) return vehicles;
    const q = searchVehicle.trim().toLowerCase();
    return vehicles.filter((v) => {
      return (
        (v.registrationNumber || "").toLowerCase().includes(q) ||
        (v.vehicleId || "").toLowerCase().includes(q) ||
        (v.type || "").toLowerCase().includes(q)
      );
    });
  }, [vehicles, searchVehicle]);

  const doAssign = async () => {
    // allow driver-only, vehicle-only or both
    if (!selectedDriverId && !selectedVehicleId) {
      alert("Select at least a driver or a vehicle.");
      return;
    }

    setAssigning(true);
    try {
      const body = {};
      if (selectedDriverId) body.driverId = String(selectedDriverId);
      if (selectedVehicleId) body.vehicleId = String(selectedVehicleId);

      const res = await apiFetch(`/orders/${orderId}`, {
        method: "patch",
        body,
      });

      const updated = res?.order || res;
      onAssigned && onAssigned(updated);
      onClose && onClose();
    } catch (err) {
      console.error("assign driver+vehicle error:", err);
      alert(err?.message || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black opacity-30"
        onClick={() => !assigning && onClose()}
      />
      <div className="relative max-w-3xl w-full bg-white rounded-lg shadow-lg z-70 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Assign driver & vehicle</h3>
          <div className="text-sm text-slate-500">
            Order #{orderId?.slice?.(0, 8) || ""}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Drivers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Choose driver</div>
              <div className="text-xs text-slate-500">
                {drivers.length} drivers
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                value={searchDriver}
                onChange={(e) => setSearchDriver(e.target.value)}
                placeholder="Search drivers (name, id, phone)"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={() => setSearchDriver("")}
                className="px-3 py-2 border rounded"
              >
                Clear
              </button>
            </div>

            {loadingDrivers ? (
              <div className="text-sm text-slate-500">Loading drivers…</div>
            ) : driversError ? (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {driversError}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-sm text-slate-500">No drivers found.</div>
            ) : (
              <div className="max-h-40 overflow-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Driver</th>
                      <th className="px-3 py-2 text-left hidden md:table-cell">
                        Phone
                      </th>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((d) => {
                      const pi = d.personalInfo || {};
                      const name =
                        `${pi.firstName || ""} ${pi.lastName || ""}`.trim() ||
                        "Unnamed";
                      return (
                        <tr key={d._id} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-slate-500">
                              {pi.email || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-xs text-slate-500">
                            {pi.phone || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-xs">{d.driverId || d._id}</div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              name="selectedDriver"
                              checked={selectedDriverId === String(d._id)}
                              onChange={() =>
                                setSelectedDriverId(String(d._id))
                              }
                              className="w-4 h-4"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Vehicles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Assign vehicle (optional)</div>
              <div className="text-xs text-slate-500">
                Pick an available vehicle or use driver's vehicle
              </div>
            </div>

            <div className="mb-2">
              <div className="text-xs text-slate-500 mb-1">
                Selected driver's vehicle:
              </div>
              {selectedDriverFull?.assignedVehicle ? (
                <div className="p-2 border rounded bg-slate-50 flex items-start justify-between">
                  <div className="text-sm">
                    <div className="font-medium">
                      {selectedDriverFull.assignedVehicle.registrationNumber ||
                        selectedDriverFull.assignedVehicle.vehicleId ||
                        "Vehicle"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedDriverFull.assignedVehicle.type || ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="vehicleChoice"
                        checked={
                          selectedVehicleId ===
                          String(
                            selectedDriverFull.assignedVehicle._id ||
                              selectedDriverFull.assignedVehicle
                          )
                        }
                        onChange={() =>
                          setSelectedVehicleId(
                            String(
                              selectedDriverFull.assignedVehicle._id ||
                                selectedDriverFull.assignedVehicle
                            )
                          )
                        }
                      />
                      Use driver's vehicle
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Driver has no assigned vehicle
                </div>
              )}
            </div>

            <div className="mb-2 flex gap-2">
              <input
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                placeholder="Search available vehicles (reg / id / type)"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={() => setSearchVehicle("")}
                className="px-3 py-2 border rounded"
              >
                Clear
              </button>
            </div>

            {loadingVehicles ? (
              <div className="text-sm text-slate-500">Loading vehicles…</div>
            ) : vehiclesError ? (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {vehiclesError}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-sm text-slate-500">
                No available vehicles found.
              </div>
            ) : (
              <div className="max-h-36 overflow-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left hidden md:table-cell">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((v) => (
                      <tr key={v._id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-medium">
                            {v.registrationNumber || v.vehicleId || "Vehicle"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {v.make || ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell text-xs text-slate-500">
                          {v.type || "-"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {v.vehicleId || v._id}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="radio"
                            name="selectedVehicle"
                            checked={selectedVehicleId === String(v._id)}
                            onChange={() => setSelectedVehicleId(String(v._id))}
                            className="w-4 h-4"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onClose()}
              disabled={assigning}
              className="px-3 py-2 rounded border bg-white"
            >
              Cancel
            </button>
            <button
              onClick={doAssign}
              // enable when at least driver or vehicle is selected
              disabled={assigning || (!selectedDriverId && !selectedVehicleId)}
              className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
            >
              {assigning ? "Assigning..." : "Assign driver & vehicle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
