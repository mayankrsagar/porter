import { useEffect, useState } from "react";

import AvatarLarge from "../components/profile/AvatarLarge";
import DriverDetails from "../components/profile/DriverDetails";
import EditProfileModal from "../components/profile/EditProfileModal";
import LineItem from "../components/profile/LineItem";
import RoleBadge from "../components/profile/RoleBadge";
import SectionTitle from "../components/profile/SectionTitle"; // ✅ Add this import
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [openEdit, setOpenEdit] = useState(false);
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
        setDriverProfile(res?.driver || res);
      } catch (err) {
        console.error("Load driver profile error:", err);
        setDriverError(
          err?.message || err?.data?.message || "Failed to load driver profile"
        );
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
          <AccountSection user={user} />
          <SecuritySection />
          <DriverDetails
            role={user.role}
            profile={driverProfile}
            loading={driverLoading}
            error={driverError}
          />
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

function AccountSection({ user }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <SectionTitle title="Account" />
      <div className="space-y-1">
        <LineItem label="Name" value={user.name} />
        <LineItem label="Email" value={user.email} />
        <LineItem
          label="Role"
          value={user.role === "user" ? "Customer" : user.role}
        />
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <SectionTitle title="Security" />
      <div className="space-y-1">
        <LineItem label="Password" value="•••••••••• (hidden)" />
        <div className="text-xs text-slate-500 mt-2">
          Password changes are handled from the{" "}
          <span className="font-medium">Forgot password</span> flow for now.
        </div>
      </div>
    </div>
  );
}
