import { useEffect, useState } from "react";

import { apiFetch } from "../../services/api";

export default function EditProfileModal({ user, onClose, onUpdated }) {
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
      if (avatarFile) form.append("avatar", avatarFile);

      const res = await apiFetch("/auth/me", {
        method: "patch",
        body: form,
      });

      onUpdated(res?.user || res);
    } catch (err) {
      console.error("Update profile error:", err);
      setError(
        err?.message || err?.data?.message || "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
        <ModalHeader title="Edit profile" onClose={onClose} />

        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <AvatarSection
            avatarPreview={avatarPreview}
            onFileChange={handleFileChange}
            initials={
              user.name
                ?.split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join("") || "P"
            }
          />

          <NameInput value={name} onChange={setName} />
          <ReadOnlyEmail email={user.email} />

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <ModalFooter onClose={onClose} loading={loading} />
        </form>
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
  );
}

function AvatarSection({ avatarPreview, onFileChange, initials }) {
  return (
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
          onChange={onFileChange}
        />
        <p className="text-[11px] text-slate-400 mt-1">
          JPG/PNG, max 2MB. This will update your Cloudinary image.
        </p>
      </div>
    </div>
  );
}

function NameInput({ value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">Full name</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your full name"
        className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
        required
      />
    </div>
  );
}

function ReadOnlyEmail({ email }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">
        Email (read-only)
      </label>
      <input
        value={email}
        readOnly
        className="mt-1 w-full px-3 py-2 border rounded-md bg-slate-50 text-xs text-slate-500 cursor-not-allowed"
      />
    </div>
  );
}

function ModalFooter({ onClose, loading }) {
  return (
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
  );
}
