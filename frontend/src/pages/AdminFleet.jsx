import { useEffect, useState } from "react";

import { apiFetch } from "../services/api";

export default function AdminFleet() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    registrationNumber: "",
    type: "mini-truck",
    capacityKg: 1000,
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/vehicles");
      setVehicles(res.vehicles || res);
    } catch (err) {
      console.error(err);
      alert("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  async function createVehicle(e) {
    e.preventDefault();
    try {
      await apiFetch("/vehicles", { method: "post", body: form });
      setOpenNew(false);
      setForm({ registrationNumber: "", type: "mini-truck", capacityKg: 1000 });
      load();
    } catch (err) {
      alert(err?.message || "Create failed");
    }
  }

  async function removeVehicle(id) {
    if (!confirm("Delete vehicle?")) return;
    try {
      await apiFetch(`/vehicles/${id}`, { method: "delete" });
      load();
    } catch (err) {
      alert("Delete failed");
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fleet Management</h1>
        <div>
          <button
            onClick={() => setOpenNew(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Add vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid gap-3">
          {vehicles.map((v) => (
            <div
              key={v._id}
              className="bg-white p-3 rounded-lg shadow flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{v.registrationNumber}</div>
                <div className="text-sm text-slate-500">
                  {v.type} • {v.status}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => {
                    const newStatus =
                      v.status === "available" ? "in-service" : "available";
                    apiFetch(`/vehicles/${v._id}`, {
                      method: "patch",
                      body: { status: newStatus },
                    }).then(load);
                  }}
                >
                  Toggle status
                </button>
                <button
                  className="px-3 py-1 border rounded text-red-600"
                  onClick={() => removeVehicle(v._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New vehicle modal */}
      {openNew && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-md">
            <h3 className="font-semibold mb-3">Add vehicle</h3>
            <form onSubmit={createVehicle} className="space-y-3">
              <div>
                <label className="text-sm">Registration number</label>
                <input
                  value={form.registrationNumber}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      registrationNumber: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm">Type</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="mini-truck">Mini Truck</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="pickup">Pickup</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Capacity (kg)</label>
                <input
                  type="number"
                  value={form.capacityKg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacityKg: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenNew(false)}
                  className="px-3 py-2 border rounded"
                >
                  Cancel
                </button>
                <button className="px-3 py-2 bg-indigo-600 text-white rounded">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
