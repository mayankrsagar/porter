// frontend/src/pages/Login.jsx
import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { apiFetch } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const isEmailValid = (em) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(em).toLowerCase());

  const canSubmit =
    isEmailValid(email) && password.trim().length >= 1 && !loading;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError("Enter a valid email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "post",
        body: { email: email.trim().toLowerCase(), password },
      });

      console.log("logged in", data);
      // httpOnly cookie is set by backend
      nav("/", { replace: true });
    } catch (err) {
      const message =
        err?.message ||
        err?.data?.message ||
        "Unable to login. Please try again.";
      setError(message);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      <BackgroundDecor />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6 relative z-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Log in to access your Porter dashboard, bookings and fleet.
        </p>

        <form onSubmit={submit} className="space-y-4">
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
                Please enter a valid email address.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                type={showPassword ? "text" : "password"}
                className="w-full px-3 py-2 border rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Password"
                required
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
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

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
                  <span>Signing you in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <button
            type="button"
            className="hover:text-indigo-600 hover:underline"
            onClick={() => nav("/forgot-password")}
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            New to Porter?{" "}
            <button
              onClick={() => nav("/register")}
              className="text-indigo-600 hover:underline"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* Decorative background component (shared between pages) */
function BackgroundDecor() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-95" />

      <svg
        className="absolute right-0 top-0 -mr-40 -mt-24 w-[600px] h-[600px] opacity-28"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="g2" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <circle cx="300" cy="300" r="180" fill="url(#g2)"></circle>
      </svg>

      <svg
        className="absolute left-0 bottom-0 -ml-40 -mb-24 w-[500px] h-[500px] opacity-20"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="200"
          cy="380"
          r="160"
          fill="#60a5fa"
          fillOpacity="0.06"
        ></circle>
        <circle
          cx="80"
          cy="260"
          r="80"
          fill="#34d399"
          fillOpacity="0.05"
        ></circle>
      </svg>
    </div>
  );
}
