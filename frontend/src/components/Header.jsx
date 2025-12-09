// src/components/Header.jsx
import { useState } from 'react';

import {
  Link,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex justify-between items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="hidden sm:block text-lg font-semibold text-slate-800">
              Porter Clone
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <NavItem to="/" active={isActive("/")} label="Home" />
            <NavItem
              to="/booking"
              active={isActive("/booking")}
              label="Booking"
            />
            <NavItem
              to="/tracking"
              active={isActive("/tracking")}
              label="Tracking"
            />
            <NavItem to="/fleet" active={isActive("/fleet")} label="Fleet" />

            {user?.role === "admin" && (
              <NavItem
                to="/admin/drivers"
                active={isActive("/admin/drivers")}
                label="Drivers"
              />
            )}
            {user?.role === "driver" && (
              <NavItem
                to="/driver"
                active={isActive("/driver")}
                label="Driver Dashboard"
              />
            )}
            {user && (
              <NavItem
                to="/profile"
                active={isActive("/profile")}
                label="Profile"
              />
            )}

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

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-slate-100"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor">
                <path
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor">
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

      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-4 space-y-1 text-sm">
            <MobileItem to="/" label="Home" />
            <MobileItem to="/booking" label="Booking" />
            <MobileItem to="/tracking" label="Tracking" />
            <MobileItem to="/fleet" label="Fleet" />

            {user?.role === "admin" && (
              <MobileItem to="/admin/drivers" label="Drivers" />
            )}
            {user?.role === "driver" && (
              <MobileItem to="/driver" label="Driver Dashboard" />
            )}
            {user && <MobileItem to="/profile" label="Profile" />}

            {!user && (
              <div className="flex gap-2 pt-2">
                <Link
                  to="/login"
                  className="flex-1 px-3 py-2 border rounded text-center"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded text-center"
                >
                  Sign up
                </Link>
              </div>
            )}

            {user && (
              <button
                onClick={logout}
                className="w-full px-3 py-2 rounded border mt-2 text-left"
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

/* Supporting Components */
function NavItem({ to, label, active }) {
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

function MobileItem({ to, label }) {
  return (
    <Link
      to={to}
      className="block px-3 py-2 rounded text-slate-700 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}
