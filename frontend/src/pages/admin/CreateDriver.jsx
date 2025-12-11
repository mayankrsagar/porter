// frontend/src/pages/admin/CreateDriver.jsx
import React, { useState } from "react";

import { useNavigate } from "react-router-dom";

import { apiFetch } from "../../services/api";

export default function AdminCreateDriver() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // optional
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setGeneratedPassword(null);

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    const form = new FormData();
    form.append("name", name.trim());
    form.append("email", email.trim().toLowerCase());
    if (password) form.append("password", password);
    if (phone) form.append("phone", phone);
    if (licenseNumber) form.append("licenseNumber", licenseNumber);
    if (vehicleId) form.append("vehicleId", vehicleId);
    if (vehicleNumber) form.append("vehicleNumber", vehicleNumber);
    if (avatarFile) form.append("avatar", avatarFile);

    setLoading(true);
    try {
      const res = await apiFetch("/admin/drivers", {
        method: "post",
        body: form,
      });

      // res = { message, user, driver, plainPassword? }
      setMsg(res.message || "Driver created");
      setGeneratedPassword(res.plainPassword || null);

      // reset form or navigate to drivers list
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setLicenseNumber("");
      setVehicleId("");
      setVehicleNumber("");
      setAvatarFile(null);
      setError(null);
    } catch (err) {
      console.error("Create driver error:", err);
      setError(err?.message || err?.data?.message || "Failed to create driver");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">Admin — Create Driver</h2>
        <p className="text-sm text-gray-500 mb-4">
          Create driver accounts. Drivers must be created by admins.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                placeholder="Driver name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="mt-1 w-full p-2 border rounded"
                placeholder="driver@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Password (optional)
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full p-2 border rounded"
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                License number
              </label>
              <input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                placeholder="LIC-1234"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Vehicle (optional)
              </label>
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                placeholder="Vehicle number"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {typeof error === "string"
                ? error
                : error.message || JSON.stringify(error)}
            </div>
          )}
          {msg && <div className="text-sm text-green-700">{msg}</div>}
          {generatedPassword && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded text-sm">
              <strong>Generated password:</strong>
              <div className="mt-1">
                <code className="px-2 py-1 bg-white border rounded">
                  {generatedPassword}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard?.writeText(generatedPassword)
                  }
                  className="ml-2 px-2 py-1 text-xs rounded border"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              disabled={loading}
              type="submit"
              className={`px-4 py-2 rounded bg-indigo-600 text-white ${
                loading ? "opacity-70" : "hover:bg-indigo-700"
              }`}
            >
              {loading ? "Creating..." : "Create Driver"}
            </button>
            <button
              type="button"
              onClick={() => {
                /* reset */ setName("");
                setEmail("");
                setPassword("");
                setPhone("");
                setLicenseNumber("");
                setVehicleId("");
                setVehicleNumber("");
                setAvatarFile(null);
                setError(null);
                setMsg(null);
                setGeneratedPassword(null);
              }}
              className="px-3 py-2 border rounded"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
