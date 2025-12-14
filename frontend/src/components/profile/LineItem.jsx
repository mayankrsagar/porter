export default function LineItem({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-xs sm:text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right break-words">
        {value || "—"}
      </span>
    </div>
  );
}
