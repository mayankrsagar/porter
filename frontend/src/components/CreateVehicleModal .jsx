// src/components/CreateVehicleModal.jsx
import React, {
  useEffect,
  useState,
} from 'react';

import { apiFetch } from '../services/api';

export default function CreateVehicleModal({ open, onClose, onCreated }) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [type, setType] = useState("light");
  const [year, setYear] = useState(new Date().getFullYear());
  const [capacityVolume, setCapacityVolume] = useState("");
  const [capacityWeight, setCapacityWeight] = useState(""); // ✅ ADD THIS
  const [status, setStatus] = useState("available"); // ✅ CHANGE from "active" to "available"
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState("");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!open) {
      setMake("");
      setModel("");
      setRegistrationNumber("");
      setType("light");
      setYear(new Date().getFullYear());
      setCapacityVolume("");
      setCapacityWeight(""); // ✅ RESET THIS
      setStatus("available"); // ✅ RESET THIS
      setClientError("");
      setServerError("");
      setLoading(false);
    }
  }, [open]);

  const validate = () => {
    if (!make.trim()) return "Make is required";
    if (!model.trim()) return "Model is required";
    if (!registrationNumber.trim()) return "Registration number is required";
    if (!type.trim()) return "Type is required";
    if (!year || isNaN(Number(year)) || Number(year) < 1900)
      return "Valid year is required";
    if (
      !capacityVolume ||
      isNaN(Number(capacityVolume)) ||
      Number(capacityVolume) <= 0
    )
      return "Capacity (volume) must be a positive number";
    if (
      !capacityWeight ||
      isNaN(Number(capacityWeight)) ||
      Number(capacityWeight) <= 0
    )
      // ✅ VALIDATE THIS
      return "Capacity (weight) must be a positive number";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError("");
    setServerError("");

    const vErr = validate();
    if (vErr) {
      setClientError(vErr);
      return;
    }

    const payload = {
      make: make.trim(),
      model: model.trim(),
      registrationNumber: registrationNumber.trim(),
      type: type.trim(),
      year: Number(year),
      capacity: {
        volume: Number(capacityVolume),
        weight: Number(capacityWeight), // ✅ ADD THIS
      },
      status: status || "available", // ✅ USE "available" as default
    };

    try {
      setLoading(true);
      const res = await apiFetch("/vehicles", {
        method: "post",
        body: payload,
      });
      const created = res?.vehicle || res;
      onCreated && onCreated(created);
      onClose && onClose();
    } catch (err) {
      console.error("createVehicle:", err);
      const msg =
        err?.message || err?.data?.message || "Failed to create vehicle";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 w-full md:w-2/5 h-full overflow-auto bg-white shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create Vehicle</h3>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {clientError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
              {clientError}
            </div>
          )}
          {serverError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-600">Make *</label>
            <input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600">Model *</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600">
              Registration number *
            </label>
            <input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="light">Light (small)</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600">Year *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          {/* ✅ ADD WEIGHT FIELD */}
          <div>
            <label className="block text-xs text-slate-600">
              Capacity (weight) *
            </label>
            <input
              type="number"
              value={capacityWeight}
              onChange={(e) => setCapacityWeight(e.target.value)}
              placeholder="e.g., 1500 (kg)"
              className="w-full px-3 py-2 border rounded"
            />
            <div className="text-xs text-slate-400 mt-1">
              Enter weight capacity in kg
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600">
              Capacity (volume) *
            </label>
            <input
              type="number"
              value={capacityVolume}
              onChange={(e) => setCapacityVolume(e.target.value)}
              placeholder="e.g., 1000"
              className="w-full px-3 py-2 border rounded"
            />
            <div className="text-xs text-slate-400 mt-1">
              Enter volume capacity in cubic feet
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              {/* ✅ UPDATED OPTIONS TO MATCH BACKEND ENUM */}
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-indigo-600 text-white"
            >
              {loading ? "Creating..." : "Create Vehicle"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
