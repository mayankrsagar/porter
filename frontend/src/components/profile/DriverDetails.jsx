import { capitalise } from "../../utils/capitalise";
import LineItem from "./LineItem";
import SectionTitle from "./SectionTitle"; // ✅ Import shared component

export default function DriverDetails({ role, profile, loading, error }) {
  if (role !== "driver") return null;

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <SectionTitle title="Driver details" />

      {loading && <div className="text-xs text-slate-400">Loading…</div>}

      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
          {error}
        </div>
      )}

      {!loading && !error && profile && (
        <div className="space-y-1">
          <LineItem label="Driver ID" value={profile.driverId || "—"} />
          <LineItem
            label="Status"
            value={capitalise(profile.status || "offline")}
          />
          <LineItem
            label="Total deliveries"
            value={profile.performance?.totalDeliveries?.toString() || "0"}
          />
          <LineItem
            label="Total distance"
            value={
              profile.performance?.totalDistance != null
                ? `${profile.performance.totalDistance} km`
                : "0 km"
            }
          />
          <LineItem
            label="Avg rating"
            value={
              profile.performance?.averageRating != null
                ? profile.performance.averageRating.toFixed(1)
                : "—"
            }
          />
        </div>
      )}

      {!loading && !error && !profile && (
        <div className="text-xs text-slate-400">
          No driver profile linked to this account yet.
        </div>
      )}
    </div>
  );
}
