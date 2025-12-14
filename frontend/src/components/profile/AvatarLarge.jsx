import { useMemo } from "react";

export default function AvatarLarge({ user }) {
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
