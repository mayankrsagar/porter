// frontend/src/pages/Register.jsx
import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";

/**
 * Register page for Porter
 * - Upload avatar (Cloudinary via backend)
 * - Uses axios wrapper (apiFetch) with credentials included
 */
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const nav = useNavigate();

  // Create preview URL for selected avatar and clean up on unmount/change
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (auth.user) {
      nav("/");
    }
  }, [auth.user, nav]);

  // simple email regex for client-side validation
  const isEmailValid = (em) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(em).toLowerCase());

  const canSubmit =
    name.trim().length >= 2 &&
    isEmailValid(email) &&
    password.length >= 6 &&
    !loading;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Optional: limit file size (e.g., 2 MB)
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
    if (!canSubmit) {
      setError(
        "Please ensure name, a valid email and password (min 6 chars) are provided."
      );
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("email", email.trim().toLowerCase());
      form.append("password", password);
      if (avatarFile) form.append("avatar", avatarFile);

      // apiFetch uses axios instance with credentials: true
      const data = await apiFetch("/auth/register", {
        method: "post",
        body: form,
      });

      // On success the server sets httpOnly cookie; navigate to home or profile
      console.log("registered", data);
      nav("/", { replace: true });
    } catch (err) {
      // axios wrapper returns the server error object (or a string)
      const message =
        (err && (err.message || err.data?.message || JSON.stringify(err))) ||
        "Failed to register";
      setError(message);
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      {/* Decorative background so page never looks empty */}
      <BackgroundDecor />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6 relative z-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Create account
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign up to manage bookings, tracking and fleet on Porter.
        </p>

        <form onSubmit={submit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a4 4 0 014-4h8a4 4 0 014 4v1"
                  />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <label
                htmlFor="avatar"
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm cursor-pointer hover:bg-gray-50"
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
                <span className="text-sm text-gray-700">
                  {avatarFile ? avatarFile.name : "Upload avatar (optional)"}
                </span>
              </label>
              <input
                id="avatar"
                accept="image/*"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-400 mt-1">
                JPG/PNG, max 2MB. We will store it securely.
              </p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
              aria-label="Full name"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
              aria-label="Email address"
              required
            />
            {!isEmailValid(email) && email.length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                Enter a valid email address
              </p>
            )}
          </div>

          {/* Password with toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                type={showPassword ? "text" : "password"}
                className="w-full px-3 py-2 border rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3l18 18M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.13A9.1 9.1 0 0112 3c4.5 0 8.27 2.94 9.76 7- .45 1.27-1.16 2.42-2.07 3.4M6.18 6.18C4.5 7.33 3.22 8.97 2.5 10c1.49 4.06 5.26 7 9.76 7 1.2 0 2.36-.2 3.43-.57"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12C3.84 7.94 7.56 5 12 5c4.44 0 8.16 2.94 9.75 7-1.59 4.06-5.31 7-9.75 7-4.44 0-8.16-2.94-9.75-7z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Tip: use a strong password. Minimum 6 characters.
            </p>
          </div>

          {/* Error */}
          {error && <div className="text-sm text-red-600">{error}</div>}

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white ${
                canSubmit
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </div>

          <p className="text-sm text-center text-gray-500">
            By creating an account you agree to our{" "}
            <a href="/terms" className="text-indigo-600 hover:underline">
              Terms
            </a>
            .
          </p>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => nav("/login")}
              className="text-indigo-600 hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* Decorative background component */
function BackgroundDecor() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden -z-10">
      {/* soft gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-90" />

      {/* blurred shapes */}
      <svg
        className="absolute right-0 top-0 -mr-40 -mt-24 w-[600px] h-[600px] opacity-30"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <circle cx="300" cy="300" r="180" fill="url(#g1)"></circle>
        <circle
          cx="420"
          cy="200"
          r="100"
          fill="#a78bfa"
          fillOpacity="0.12"
        ></circle>
      </svg>

      <svg
        className="absolute left-0 bottom-0 -ml-40 -mb-24 w-[500px] h-[500px] opacity-25"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="200"
          cy="380"
          r="160"
          fill="#60a5fa"
          fillOpacity="0.08"
        ></circle>
        <circle
          cx="80"
          cy="260"
          r="80"
          fill="#34d399"
          fillOpacity="0.06"
        ></circle>
      </svg>
    </div>
  );
}
