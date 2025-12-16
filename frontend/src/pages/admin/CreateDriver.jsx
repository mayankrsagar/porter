// frontend/src/pages/admin/CreateDriver.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";

/**
 * Admin Create Driver page
 * - Posts multipart/form-data to /admin/drivers
 * - Fetches vehicles for quick assignment
 * - Shows generated password modal with copy-to-clipboard
 */

function PasswordModal({ open, password, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-2">Driver created</h3>
        <p className="text-sm text-slate-600 mb-4">
          Share the generated password with the driver. You can copy it to clipboard.
        </p>
        <div className="bg-slate-50 border rounded px-4 py-3 mb-4">
          <div className="text-xs text-slate-500">Password</div>
          <div className="text-xl font-mono font-semibold">{password}</div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(password);
              } catch (e) {
                console.warn("Clipboard copy failed", e);
              }
            }}
            className="px-3 py-2 rounded border"
          >
            Copy
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded bg-indigo-600 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCreateDriver() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // optional override
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // fetch vehicles for assignment dropdown (first 200)
    let mounted = true;
    async function loadVehicles() {
      setLoadingVehicles(true);
      try {
        const res = await apiFetch("/vehicles?page=1&limit=200");
        // res may be { vehicles, totalPages } or array
        const list = Array.isArray(res) ? res : res?.vehicles || res?.data || [];
        if (mounted) setVehicles(list);
      } catch (e) {
        console.error("Failed to load vehicles", e);
      } finally {
        if (mounted) setLoadingVehicles(false);
      }
    }
    loadVehicles();
    return () => {
      mounted = false;
    };
  }, []);

  const resetForm = () => {
    setName("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setLicenseNumber("");
    setVehicleId("");
    setVehicleNumber("");
    setAvatarFile(null);
    setError("");
    setMsg("");
    setGeneratedPassword(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    setMsg("");
    setGeneratedPassword(null);

    // Basic validation
    const nameToUse = (name || `${firstName} ${lastName}`.trim()).trim();
    if (!nameToUse || !email) {
      setError("Please provide name and email.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", nameToUse);
      if (firstName) form.append("firstName", firstName);
      if (lastName) form.append("lastName", lastName);
      form.append("email", email);
      if (password) form.append("password", password);
      if (phone) form.append("phone", phone);
      if (licenseNumber) form.append("licenseNumber", licenseNumber);
      if (vehicleId) form.append("vehicleId", vehicleId);
      if (vehicleNumber) form.append("vehicleNumber", vehicleNumber);
      if (avatarFile) form.append("avatar", avatarFile);

      const res = await apiFetch("/admin/drivers", {
        method: "post",
        body: form,
      });

      setMsg(res?.message || "Driver created");
      setGeneratedPassword(res?.plainPassword || null);
      setShowModal(Boolean(res?.plainPassword));
    } catch (err) {
      console.error("create driver err:", err);
      const message =
        err?.message ||
        err?.data?.message ||
        err?.response?.data?.message ||
        "Failed to create driver";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Create Driver</h1>
          <p className="text-sm text-slate-500">Add a new driver (admin only).</p>
        </div>
        <div>
          <button
            onClick={() => navigate("/admin/drivers")}
            className="px-3 py-2 rounded border"
          >
            Back to drivers
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        {error && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-4 py-2">
            {error}
          </div>
        )}
        {msg && (
          <div className="mb-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-4 py-2">
            {msg}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name (optional if you set first/last)"
              className="w-full px-3 py-2 border rounded"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (required)"
              type="email"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-3 py-2 border rounded"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-3 py-2 border rounded"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="License number"
              className="w-full px-3 py-2 border rounded"
            />

            <div>
              <label className="block text-sm text-slate-700 mb-1">Assign vehicle</label>
              {loadingVehicles ? (
                <div className="text-sm text-slate-500">Loading vehicles...</div>
              ) : (
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- none --</option>
                  {vehicles.map((v) => {
                    const vid = v._id || v.vehicleId || v.id;
                    const label = v.registrationNumber || v.vehicleNumber || v.registration || (v.type ? `${v.type} • ${vid}` : vid);
                    return <option key={vid} value={vid}>{label}</option>;
                  })}
                </select>
              )}
            </div>

            <input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Vehicle number (optional)"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Avatar (optional)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create driver"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 border rounded"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3 py-2 border rounded"
            >
              Cancel
            </button>
          </div>

          {generatedPassword && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded text-sm">
              Generated password (will be shown once): <strong>{generatedPassword}</strong>
            </div>
          )}
        </form>
      </div>

      <PasswordModal
        open={showModal}
        password={generatedPassword}
        onClose={() => {
          setShowModal(false);
          // keep password visible in page but hide modal
        }}
      />
    </div>
  );
}
