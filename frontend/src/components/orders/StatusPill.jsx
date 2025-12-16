import React from "react";

export default function StatusPill({ status }) {
  const s = (status || "pending").toLowerCase();
  const map = {
    pending: "bg-yellow-50 text-yellow-800",
    confirmed: "bg-indigo-50 text-indigo-700",
    assigned: "bg-indigo-50 text-indigo-700",
    "picked-up": "bg-blue-50 text-blue-700",
    "in-transit": "bg-blue-50 text-blue-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };
  const label = status
    ? status.replace("-", " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
    : "Pending";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        map[s] || "bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
