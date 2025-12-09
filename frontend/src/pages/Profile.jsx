// src/pages/Profile.jsx
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [openEdit, setOpenEdit] = useState(false);

  // 🔹 driver-specific state
  const [driverProfile, setDriverProfile] = useState(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "driver") return;

    const loadDriver = async () => {
      setDriverLoading(true);
      setDriverError("");
      try {
        const res = await apiFetch("/drivers/me");
        const driver = res?.driver || res;
        setDriverProfile(driver);
      } catch (err) {
        console.error("Load driver profile error:", err);
        const msg =
          err?.message || err?.data?.message || "Failed to load driver profile";
        setDriverError(msg);
        setDriverProfile(null);
      } finally {
        setDriverLoading(false);
      }
    };

    loadDriver();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-600">
          You need to be logged in to view your profile.
        </div>
      </div>
    );
  }

  const joined =
    user.createdAt && !Number.isNaN(Date.parse(user.createdAt))
      ? new Date(user.createdAt).toLocaleDateString()
      : "—";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My profile</h1>
          <p className="text-sm text-slate-500">
            Manage your account details and avatar.
          </p>
        </div>
        <button
          onClick={() => setOpenEdit(true)}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Edit profile
        </button>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
          <AvatarLarge user={user} />

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xl font-semibold text-slate-800">
                {user.name}
              </div>
              <RoleBadge role={user.role} />
            </div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <div className="text-xs text-slate-400">
              Joined on{" "}
              <span className="font-medium text-slate-500">{joined}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Account */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Account
            </div>
            <div className="space-y-1">
              <LineItem label="Name" value={user.name} />
              <LineItem label="Email" value={user.email} />
              <LineItem
                label="Role"
                value={user.role === "user" ? "Customer" : user.role}
              />
            </div>
          </div>

          {/* Security */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Security
            </div>
            <div className="space-y-1">
              <LineItem label="Password" value="•••••••••• (hidden)" />
              <div className="text-xs text-slate-500 mt-2">
                Password changes are handled from the{" "}
                <span className="font-medium">Forgot password</span> flow for
                now.
              </div>
            </div>
          </div>

          {/* Driver details (only for drivers) */}
          {user.role === "driver" && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Driver details
              </div>

              {driverLoading && (
                <div className="text-xs text-slate-400">Loading…</div>
              )}

              {driverError && (
                <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
                  {driverError}
                </div>
              )}

              {!driverLoading && !driverError && driverProfile && (
                <div className="space-y-1">
                  <LineItem
                    label="Driver ID"
                    value={driverProfile.driverId || "—"}
                  />
                  <LineItem
                    label="Status"
                    value={capitalise(driverProfile.status || "offline")}
                  />
                  <LineItem
                    label="Total deliveries"
                    value={
                      driverProfile.performance?.totalDeliveries?.toString() ||
                      "0"
                    }
                  />
                  <LineItem
                    label="Total distance"
                    value={
                      driverProfile.performance?.totalDistance != null
                        ? `${driverProfile.performance.totalDistance} km`
                        : "0 km"
                    }
                  />
                  <LineItem
                    label="Avg rating"
                    value={
                      driverProfile.performance?.averageRating != null
                        ? driverProfile.performance.averageRating.toFixed(1)
                        : "—"
                    }
                  />
                </div>
              )}

              {!driverLoading && !driverError && !driverProfile && (
                <div className="text-xs text-slate-400">
                  No driver profile linked to this account yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {openEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setOpenEdit(false)}
          onUpdated={(updatedUser) => {
            setUser(updatedUser);
            setOpenEdit(false);
          }}
        />
      )}
    </div>
  );
}

/* Helper components */

function AvatarLarge({ user }) {
  const initials = useMemo(() => {
    if (!user?.name) return "P";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  const avatarUrl = user?.avatar?.url;

  return (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold overflow-hidden border border-slate-200">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    admin: "bg-red-50 text-red-700 border-red-100",
    driver: "bg-emerald-50 text-emerald-700 border-emerald-100",
    user: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };
  const labelMap = {
    admin: "Admin",
    driver: "Driver",
    user: "Customer",
  };
  const cls = map[role] || "bg-slate-50 text-slate-700 border-slate-200";
  const label = labelMap[role] || role || "User";

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}
    >
      {label}
    </span>
  );
}

function LineItem({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-xs sm:text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right break-words">
        {value || "—"}
      </span>
    </div>
  );
}

function capitalise(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Edit modal (same as before, just reused) */
function EditProfileModal({ user, onClose, onUpdated }) {
  const [name, setName] = useState(user.name || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar?.url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let url;
    if (avatarFile) {
      url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [avatarFile]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxSize = 2 * 1024 * 1024;
    if (f.size > maxSize) {
      setError("Avatar should be less than 2 MB.");
      return;
    }
    setError("");
    setAvatarFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Name should be at least 2 characters.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", trimmedName);
      if (avatarFile) {
        form.append("avatar", avatarFile);
      }

      const res = await apiFetch("/auth/me", {
        method: "patch",
        body: form,
      });

      const updatedUser = res?.user || res;
      onUpdated(updatedUser);
    } catch (err) {
      console.error("Update profile error:", err);
      const message =
        err?.message || err?.data?.message || "Failed to update profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const initials =
    user.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "P";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Edit profile</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-lg font-bold overflow-hidden border border-slate-200">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="flex-1">
              <label
                htmlFor="avatar-edit"
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-xs cursor-pointer hover:bg-gray-50"
              >
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v9M16 8l-4-4-4 4"
                  />
                </svg>
                <span>Change avatar</span>
              </label>
              <input
                id="avatar-edit"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                JPG/PNG, max 2MB. This will update your Cloudinary image.
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-slate-700">
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
              required
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-xs font-medium text-slate-700">
              Email (read-only)
            </label>
            <input
              value={user.email}
              readOnly
              className="mt-1 w-full px-3 py-2 border rounded-md bg-slate-50 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border rounded-md text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center gap-2 disabled:bg-indigo-400"
            >
              {loading && (
                <span className="w-3 h-3 rounded-full border-b-2 border-white animate-spin" />
              )}
              <span>Save changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
