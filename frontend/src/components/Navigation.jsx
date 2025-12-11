import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import * as apiModule from '../services/api';

const getApiFetch = () => {
  if (!apiModule) return undefined;
  if (typeof apiModule.apiFetch === "function") return apiModule.apiFetch;
  if (typeof apiModule.default === "function") return apiModule.default;
  return undefined;
};

function UserAvatar({ user, size = 7 }) {
  const url = user?.avatar?.url;
  const s = size === 7 ? "w-7 h-7" : "w-9 h-9";
  if (url) {
    return (
      <img
        src={url}
        alt={user.name || "Profile"}
        className={`${s} rounded-full object-cover`}
      />
    );
  }
  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((p) => p?.[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`${s} rounded-full bg-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center`}
    >
      {initials}
    </div>
  );
}

export default function Navigation() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const avatarRef = useRef(null);
  const apiFetch = getApiFetch();

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const fetchPendingCount = async () => {
    try {
      if (typeof apiFetch !== "function") return;
      const res1 = await apiFetch(`/orders?status=pending&limit=1`);
      if (res1 && typeof res1 === "object") {
        if (Array.isArray(res1)) return setPendingOrders(res1.length);
        if (typeof res1.total === "number") return setPendingOrders(res1.total);
        if (typeof res1.count === "number") return setPendingOrders(res1.count);
        if (Array.isArray(res1.orders))
          return setPendingOrders(res1.orders.length);
      }
      const res2 = await apiFetch("/orders/stats");
      if (
        res2 &&
        typeof res2 === "object" &&
        typeof res2.pending === "number"
      ) {
        setPendingOrders(res2.pending);
      }
    } catch {
      setPendingOrders(0);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNavigate = (to, cb) => {
    setDrawerOpen(false);
    setAvatarMenuOpen(false);
    if (typeof cb === "function") cb();
    if (to) navigate(to);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onDoc = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const onAvatarAction = (action) => {
    setAvatarMenuOpen(false);
    if (action === "profile") navigate("/profile");
    if (action === "settings") navigate("/settings");
    if (action === "admin") navigate("/admin");
    if (action === "logout") {
      logout?.();
      setDrawerOpen(false);
      navigate("/");
    }
  };

  const displayName = user?.name?.split(" ")[0] || "";

  return (
    <header className="bg-white border-b border-slate-200 relative z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={() => handleNavigate("/")}
          >
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <NavLink
              to="/"
              label="Home"
              active={isActive("/")}
              onClick={() => handleNavigate("/")}
            />
            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  label="Dashboard"
                  active={isActive("/dashboard")}
                  onClick={() => handleNavigate("/dashboard")}
                />
                <NavLink
                  to="/orders"
                  label={
                    <span className="inline-flex items-center gap-2">
                      Orders{" "}
                      {pendingOrders > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">
                          {pendingOrders}
                        </span>
                      )}
                    </span>
                  }
                  active={isActive("/orders")}
                  onClick={() => handleNavigate("/orders")}
                />
                <NavLink
                  to="/fleet"
                  label="Fleet"
                  active={isActive("/fleet")}
                  onClick={() => handleNavigate("/fleet")}
                />
                <NavLink
                  to="/vehicles"
                  label="Vehicles"
                  active={isActive("/vehicles")}
                  onClick={() => handleNavigate("/vehicles")}
                />
                <NavLink
                  to="/booking"
                  label="Booking"
                  active={isActive("/booking")}
                  onClick={() => handleNavigate("/booking")}
                />
                <NavLink
                  to="/tracking"
                  label="Tracking"
                  active={isActive("/tracking")}
                  onClick={() => handleNavigate("/tracking")}
                />
                <NavLink
                  to="/analytics"
                  label="Analytics"
                  active={isActive("/analytics")}
                  onClick={() => handleNavigate("/analytics")}
                />
                {user.role === "admin" && (
                  <>
                    <NavLink
                      to="/admin"
                      label="Admin"
                      active={isActive("/admin")}
                      onClick={() => handleNavigate("/admin")}
                    />
                    <NavLink
                      to="/admin/drivers"
                      label="Drivers"
                      active={isActive("/admin/drivers")}
                      onClick={() => handleNavigate("/admin/drivers")}
                    />
                  </>
                )}
                {user.role === "driver" && (
                  <NavLink
                    to="/driver"
                    label="Driver"
                    active={isActive("/driver")}
                    onClick={() => handleNavigate("/driver")}
                  />
                )}

                {/* Avatar Menu */}
                <div className="relative" ref={avatarRef}>
                  <button
                    onClick={() => setAvatarMenuOpen((s) => !s)}
                    className={`flex items-center gap-2 text-sm px-3 py-1 rounded ${
                      isActive("/profile")
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <UserAvatar user={user} />
                    <span className="hidden sm:inline">
                      {displayName || "Profile"}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      {user.role && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                          {user.role}
                        </span>
                      )}
                    </span>
                  </button>
                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-sm py-1 z-50">
                      <button
                        onClick={() => onAvatarAction("profile")}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => onAvatarAction("settings")}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Settings
                      </button>
                      {user.role === "admin" && (
                        <button
                          onClick={() => onAvatarAction("admin")}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          Admin
                        </button>
                      )}
                      <div className="border-t my-1" />
                      <button
                        onClick={() => onAvatarAction("logout")}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => handleNavigate("/login")}
                  className="text-sm px-3 py-1 rounded hover:bg-slate-50"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => handleNavigate("/register")}
                  className="text-sm px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {user && pendingOrders > 0 && (
              <Link
                to="/orders"
                className="text-sm px-2 py-1 rounded bg-red-600 text-white"
                onClick={() => handleNavigate("/orders")}
              >
                {pendingOrders}
              </Link>
            )}
            <button
              onClick={() => setDrawerOpen((s) => !s)}
              className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
            >
              {drawerOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-80 bg-white z-40 transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden shadow-lg`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <Logo />
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded hover:bg-slate-100"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <MobileLink to="/" label="Home" onClick={() => handleNavigate("/")} />
          {user && (
            <>
              <MobileLink
                to="/dashboard"
                label="Dashboard"
                onClick={() => handleNavigate("/dashboard")}
              />
              <MobileLink
                to="/orders"
                label={`Orders ${
                  pendingOrders > 0 ? `(${pendingOrders})` : ""
                }`}
                onClick={() => handleNavigate("/orders")}
              />
              <MobileLink
                to="/fleet"
                label="Fleet"
                onClick={() => handleNavigate("/fleet")}
              />
              <MobileLink
                to="/vehicles"
                label="Vehicles"
                onClick={() => handleNavigate("/vehicles")}
              />
              <MobileLink
                to="/booking"
                label="Booking"
                onClick={() => handleNavigate("/booking")}
              />
              <MobileLink
                to="/tracking"
                label="Tracking"
                onClick={() => handleNavigate("/tracking")}
              />
              <MobileLink
                to="/analytics"
                label="Analytics"
                onClick={() => handleNavigate("/analytics")}
              />
              {user.role === "admin" && (
                <MobileLink
                  to="/admin/drivers"
                  label="Drivers"
                  onClick={() => handleNavigate("/admin/drivers")}
                />
              )}
              {user.role === "driver" && (
                <MobileLink
                  to="/driver"
                  label="Driver"
                  onClick={() => handleNavigate("/driver")}
                />
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-3 py-2">
                  <UserAvatar user={user} size={9} />
                  <div>
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                    <div className="mt-1">
                      {user?.role && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                          {user.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleNavigate("/profile")}
                    className="flex-1 px-3 py-2 rounded border text-sm"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      logout?.();
                      setDrawerOpen(false);
                    }}
                    className="flex-1 px-3 py-2 rounded bg-red-600 text-white text-sm"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
          {!user && (
            <div className="flex gap-2 pt-2">
              <Link
                to="/login"
                onClick={() => handleNavigate("/login")}
                className="flex-1 text-center px-3 py-2 rounded border"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => handleNavigate("/register")}
                className="flex-1 text-center px-3 py-2 rounded bg-indigo-600 text-white"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
        />
      )}
    </header>
  );
}

/* Helper components */
function NavLink({ to, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
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
function MobileLink({ to, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
    >
      {label}
    </Link>
  );
}
function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
        P
      </div>
      <div>
        <div className="font-semibold text-slate-800">Porter Clone</div>
        <div className="text-xs text-slate-400">
          Bookings · Fleet · Tracking
        </div>
      </div>
    </div>
  );
}
function MenuIcon() {
  return (
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
  );
}
function CloseIcon() {
  return (
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
  );
}
