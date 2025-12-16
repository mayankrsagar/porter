import { capitalise } from "../../utils/capitalise";

export default function RoleBadge({ role }) {
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
  const label = labelMap[role] || capitalise(role || "user");

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}
    >
      {label}
    </span>
  );
}
