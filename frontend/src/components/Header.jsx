// src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";

import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { Icons } from "./Icons";

function useFocusTrap(isOpen) {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      setTimeout(() => {
        const focusable = containerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable?.length) focusable[0]?.focus();
      }, 120);
    } else {
      setTimeout(() => {
        previouslyFocusedRef.current?.focus();
      }, 120);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen || e.key !== "Tab") return;
    const focusable = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return { containerRef, handleKeyDown };
}

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Primary nav items (role-aware)
  const getPrimaryNavItems = () => {
    const items = [
      { to: "/", label: "Home", icon: Icons.Home },
      { to: "/tracking", label: "Tracking", icon: Icons.Tracking },
    ];

    // Booking: guests & regular users only (not drivers/admins)
    if (!user || user.role === "user") {
      items.push({ to: "/booking", label: "Booking", icon: Icons.Booking });
    }

    // Fleet: everyone except drivers
    if (user?.role !== "driver") {
      items.push({ to: "/fleet", label: "Fleet", icon: Icons.Fleet });
    }

    return items;
  };

  const adminItems = [
    { to: "/admin/drivers", label: "Drivers", icon: Icons.Drivers },
    { to: "/admin/orders", label: "Orders", icon: Icons.Orders },
    { to: "/admin/vehicles", label: "Vehicles", icon: Icons.Vehicles },
    { to: "/admin/reports", label: "Reports", icon: Icons.Orders },
  ];

  const adminRef = useRef(null);
  const { containerRef: adminMenuRef, handleKeyDown: handleAdminKeyDown } =
    useFocusTrap(adminOpen);

  useEffect(() => {
    setMobileOpen(false);
    setAdminOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (!adminOpen) return;
      if (adminRef.current && !adminRef.current.contains(e.target)) {
        setAdminOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setAdminOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [adminOpen]);

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-1 rounded text-sm ${
      isActive
        ? "bg-indigo-50 text-indigo-700 font-medium"
        : "text-slate-700 hover:bg-slate-50"
    }`;

  const primaryItems = getPrimaryNavItems();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="hidden sm:block text-lg font-semibold text-slate-800">
              Porter Clone
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3">
            {/* Primary (role-aware) */}
            {primaryItems.map((p) => (
              <NavLink key={p.to} to={p.to} className={navClass} end>
                <p.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{p.label}</span>
              </NavLink>
            ))}

            {/* My Orders: regular users only */}
            {user && user.role === "user" && (
              <NavLink to="/my-orders" className={navClass}>
                <Icons.Orders className="w-4 h-4" />
                <span className="hidden sm:inline">My Orders</span>
              </NavLink>
            )}

            {/* Driver dashboard: drivers only */}
            {user?.role === "driver" && (
              <NavLink to="/driver" className={navClass}>
                <Icons.Profile className="w-4 h-4" />
                <span className="hidden sm:inline">Driver</span>
              </NavLink>
            )}

            {/* Profile: all authenticated users */}
            {user && (
              <NavLink to="/profile" className={navClass}>
                <Icons.Profile className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </NavLink>
            )}

            {/* Admin dropdown: admins only */}
            {user?.role === "admin" && (
              <div className="relative" ref={adminRef}>
                <button
                  onClick={() => setAdminOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={adminOpen}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-all ${
                    adminOpen
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icons.Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>

                <div
                  ref={adminMenuRef}
                  onKeyDown={handleAdminKeyDown}
                  role="menu"
                  className={`absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 transition-all transform ${
                    adminOpen
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-1 pointer-events-none"
                  }`}
                >
                  <div className="py-1">
                    {adminItems.map((a) => (
                      <NavLink
                        key={a.to}
                        to={a.to}
                        onClick={() => setAdminOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
                            isActive
                              ? "bg-slate-50 text-indigo-700 font-medium"
                              : "text-slate-700"
                          }`
                        }
                        role="menuitem"
                        tabIndex={adminOpen ? 0 : -1}
                      >
                        <a.icon className="w-4 h-4" />
                        {a.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Auth controls */}
            {!user ? (
              <>
                <NavLink
                  to="/login"
                  className="text-sm px-3 py-1 rounded hover:bg-slate-50"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className="text-sm px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Sign up
                </NavLink>
              </>
            ) : (
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm px-3 py-1 rounded border hover:bg-slate-50"
              >
                <Icons.Logout className="w-4 h-4" />
                Logout
              </button>
            )}
          </nav>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center">
            <button
              className="p-2 rounded-md hover:bg-slate-100"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <Icons.Close className="w-6 h-6" />
              ) : (
                <Icons.Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-4 space-y-3 text-sm">
            {/* Primary (role-aware) */}
            <div className="grid grid-cols-2 gap-2">
              {primaryItems.map((p) => (
                <NavLink
                  key={p.to}
                  to={p.to}
                  className={navClass}
                  onClick={() => setMobileOpen(false)}
                >
                  <p.icon className="w-4 h-4" />
                  <span className="truncate">{p.label}</span>
                </NavLink>
              ))}
            </div>

            {/* My Orders: regular users only */}
            {user && user.role === "user" && (
              <NavLink
                to="/my-orders"
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <Icons.Orders className="w-4 h-4" />
                My Orders
              </NavLink>
            )}

            {/* Driver dashboard: drivers only */}
            {user?.role === "driver" && (
              <NavLink
                to="/driver"
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <Icons.Profile className="w-4 h-4" />
                Driver
              </NavLink>
            )}

            {/* Profile: all authenticated users */}
            {user && (
              <NavLink
                to="/profile"
                className={navClass}
                onClick={() => setMobileOpen(false)}
              >
                <Icons.Profile className="w-4 h-4" />
                Profile
              </NavLink>
            )}

            {/* Admin group: admins only */}
            {user?.role === "admin" && (
              <>
                <div className="text-xs text-slate-500 px-3">Admin</div>
                <div className="grid grid-cols-2 gap-2 px-3">
                  {adminItems.map((a) => (
                    <NavLink
                      key={a.to}
                      to={a.to}
                      className={navClass}
                      onClick={() => setMobileOpen(false)}
                    >
                      <a.icon className="w-4 h-4" />
                      <span className="truncate">{a.label}</span>
                    </NavLink>
                  ))}
                </div>
              </>
            )}

            {/* Auth actions */}
            {!user ? (
              <div className="flex gap-2 pt-2">
                <NavLink
                  to="/login"
                  className="flex-1 px-3 py-2 border rounded text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign up
                </NavLink>
              </div>
            ) : (
              <div className="pt-2 px-3">
                <button
                  onClick={logout}
                  className="w-full px-3 py-2 mt-2 rounded border text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
