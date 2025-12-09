import { useState } from 'react';

import {
  Link,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + title */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              P
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-semibold text-slate-800">
                Porter Clone
              </div>
              <div className="text-xs text-slate-400">
                Bookings · Fleet · Tracking
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            {/* Home is always visible */}
            <NavLink to="/" label="Home" active={isActive("/")} />

            {/* App navigation only when logged in */}
            {user && (
              <>
                <NavLink
                  to="/dashboard"
                  label="Dashboard"
                  active={isActive("/dashboard")}
                />
                <NavLink
                  to="/fleet"
                  label="Fleet"
                  active={isActive("/fleet")}
                />
                <NavLink
                  to="/booking"
                  label="Booking"
                  active={isActive("/booking")}
                />
                <NavLink
                  to="/tracking"
                  label="Tracking"
                  active={isActive("/tracking")}
                />

                {/* Admin-only */}
                {user.role === "admin" && (
                  <NavLink
                    to="/admin/drivers"
                    label="Drivers"
                    active={isActive("/admin/drivers")}
                  />
                )}

                {/* Driver-only */}
                {user.role === "driver" && (
                  <NavLink
                    to="/driver"
                    label="Driver"
                    active={isActive("/driver")}
                  />
                )}

                {/* Profile */}
                <NavLink
                  to="/profile"
                  label="Profile"
                  active={isActive("/profile")}
                />
              </>
            )}

            {/* Auth buttons */}
            {!user && (
              <>
                <Link
                  to="/login"
                  className="text-sm px-3 py-1 rounded hover:bg-slate-50"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </>
            )}

            {user && (
              <button
                onClick={logout}
                className="text-sm px-3 py-1 rounded border hover:bg-slate-50"
              >
                Logout
              </button>
            )}
          </nav>

          {/* Mobile nav button */}
          <div className="md:hidden">
            <button
              onClick={() => setOpen((s) => !s)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100"
            >
              {open ? (
                <svg
                  className="w-6 h-6"
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
              ) : (
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            <MobileLink to="/" label="Home" />

            {user && (
              <>
                <MobileLink to="/dashboard" label="Dashboard" />
                <MobileLink to="/fleet" label="Fleet" />
                <MobileLink to="/booking" label="Booking" />
                <MobileLink to="/tracking" label="Tracking" />

                {user.role === "admin" && (
                  <MobileLink to="/admin/drivers" label="Drivers" />
                )}

                {user.role === "driver" && (
                  <MobileLink to="/driver" label="Driver" />
                )}

                <MobileLink to="/profile" label="Profile" />
              </>
            )}

            {!user && (
              <div className="flex gap-2 pt-2">
                <Link
                  to="/login"
                  className="flex-1 text-center px-3 py-2 rounded border"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center px-3 py-2 rounded bg-indigo-600 text-white"
                >
                  Sign up
                </Link>
              </div>
            )}

            {user && (
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 rounded border mt-2"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`text-sm px-3 py-1 rounded ${
        active
          ? "bg-indigo-50 text-indigo-700 font-medium"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function MobileLink({ to, label }) {
  return (
    <Link
      to={to}
      className="block px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
    >
      {label}
    </Link>
  );
}
