// src/pages/Home.jsx
import {
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export default function Home() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const role = user?.role;

  const formatNumber = (n) =>
    typeof n === "number" ? n.toLocaleString() : n ?? 0;

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError("");
      try {
        // --- General analytics ---
        const s = await apiFetch("/analytics/dashboard");
        const ordersOverview = s?.overview?.orders || {};
        const totalOrders =
          ordersOverview.totalOrders ?? ordersOverview.count ?? 0;

        const driverStatus = Array.isArray(s?.driverStatus)
          ? s.driverStatus
          : [];
        const activeDrivers = driverStatus
          .filter(
            (d) =>
              d?._id?.toLowerCase() === "available" ||
              d?._id?.toLowerCase() === "busy"
          )
          .reduce((sum, d) => sum + (d.count || 0), 0);

        const fleetStatus = Array.isArray(s?.fleetStatus) ? s.fleetStatus : [];
        const vehicles = fleetStatus.reduce(
          (sum, v) => sum + (v.count || 0),
          0
        );

        setAnalytics({
          totalOrders,
          activeDrivers,
          vehicles,
        });

        // --- Driver overview (only useful for admin/driver) ---
        if (role === "admin" || role === "driver") {
          const ds = await apiFetch("/drivers/stats/overview");
          setDriverStats(ds || null);
        } else {
          setDriverStats(null);
        }
      } catch (err) {
        console.error("Home stats load error:", err);
        const message =
          err?.message || err?.data?.message || "Failed to load stats";
        setStatsError(message);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [user, role]);

  // 🔹 Public / logged-out view
  if (!user) {
    return (
      <main className="min-h-[80vh] bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-800 leading-tight">
                Smart Porter-style logistics for your city deliveries.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Book vehicles, assign drivers, and track orders end-to-end in a
                single dashboard.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="px-5 py-3 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
                >
                  Get started — Sign up
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-3 border rounded-md text-slate-700 hover:bg-slate-50"
                >
                  Log in
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FeatureCard
                  title="Fast bookings"
                  desc="Create pickup & drop with live map and instant pricing."
                />
                <FeatureCard
                  title="Fleet visibility"
                  desc="See all vehicles, statuses and locations in one place."
                />
                <FeatureCard
                  title="Live tracking"
                  desc="Share live order status and tracking links with customers."
                />
              </div>
            </div>

            <div className="rounded-xl bg-white shadow p-6 border border-slate-100">
              <div className="text-sm text-slate-500">
                Today’s snapshot (demo)
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat name="Active drivers" value="24" />
                <Stat name="Vehicles" value="48" />
                <Stat name="Today’s orders" value="84" />
                <Stat name="Pending" value="12" />
              </div>

              <div className="mt-6">
                <div className="text-sm text-slate-500">Recent activity</div>
                <ul className="mt-2 space-y-2">
                  <li className="text-sm text-slate-700">
                    New booking created —{" "}
                    <span className="font-mono">ORD-12345</span>
                  </li>
                  <li className="text-sm text-slate-700">
                    Driver <span className="font-medium">Ramesh</span> marked
                    available
                  </li>
                  <li className="text-sm text-slate-700">
                    Order <span className="font-mono">ORD-12339</span> delivered
                  </li>
                </ul>
              </div>

              <div className="mt-4 text-xs text-slate-400">
                * You can later replace this with live analytics from your
                backend.
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-xs text-slate-400">
            Built with React · Tailwind CSS · Axios · Google Maps · Cloudinary
          </div>
        </div>
      </main>
    );
  }

  // 🔹 Logged-in view (role-based)
  const name = user.name || "there";
  let subtitle = "Manage your operations in one place.";
  if (role === "user") {
    subtitle = "Create bookings, track orders and manage your deliveries.";
  } else if (role === "driver") {
    subtitle = "View assigned orders, update your status and location.";
  } else if (role === "admin") {
    subtitle = "Monitor fleet, manage drivers and track performance.";
  }

  return (
    <main className="min-h-[80vh] bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: welcome + role CTAs */}
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 leading-tight">
              Welcome back, {name}.
            </h1>
            <p className="mt-3 text-lg text-slate-600">{subtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {role === "user" && (
                <>
                  <Link
                    to="/booking"
                    className="px-5 py-3 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
                  >
                    New booking
                  </Link>
                  <Link
                    to="/tracking"
                    className="px-5 py-3 border rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Track order
                  </Link>
                  <Link
                    to="/dashboard"
                    className="px-5 py-3 border rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    My dashboard
                  </Link>
                </>
              )}

              {role === "driver" && (
                <>
                  <Link
                    to="/driver"
                    className="px-5 py-3 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
                  >
                    Open driver dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="px-5 py-3 border rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Profile
                  </Link>
                </>
              )}

              {role === "admin" && (
                <>
                  <Link
                    to="/dashboard"
                    className="px-5 py-3 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700"
                  >
                    Open admin dashboard
                  </Link>
                  <Link
                    to="/admin/drivers"
                    className="px-5 py-3 border rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Manage drivers
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {role === "user" && (
                <>
                  <FeatureCard
                    title="My bookings"
                    desc="View and manage all your created orders."
                  />
                  <FeatureCard
                    title="Quick repeat"
                    desc="Soon: re-book frequent routes in a single tap."
                  />
                  <FeatureCard
                    title="Live support"
                    desc="Reach support anytime from your dashboard."
                  />
                </>
              )}

              {role === "driver" && (
                <>
                  <FeatureCard
                    title="Current shift"
                    desc="See your active orders and status quickly."
                  />
                  <FeatureCard
                    title="Earnings"
                    desc="Track completed deliveries and performance."
                  />
                  <FeatureCard
                    title="Location updates"
                    desc="Keep dispatch updated with live location."
                  />
                </>
              )}

              {role === "admin" && (
                <>
                  <FeatureCard
                    title="Fleet overview"
                    desc="Monitor drivers, vehicles and orders at a glance."
                  />
                  <FeatureCard
                    title="Driver management"
                    desc="Create, edit and deactivate drivers as needed."
                  />
                  <FeatureCard
                    title="Analytics"
                    desc="Get insights on deliveries and performance."
                  />
                </>
              )}
            </div>
          </div>

          {/* Right: quick actions + LIVE stats */}
          <div className="rounded-xl bg-white shadow p-6 border border-slate-100">
            <div className="text-sm text-slate-500 flex items-center justify-between mb-3">
              <span>Quick actions</span>
              <span className="text-xs text-slate-400">
                Role: {role?.toUpperCase()}
              </span>
            </div>

            {/* role-specific quick actions */}
            {role === "user" && (
              <div className="grid grid-cols-1 gap-3 mb-5">
                <QuickAction
                  title="Create a new booking"
                  desc="Set pickup & drop and get instant pricing."
                  to="/booking"
                />
                <QuickAction
                  title="Track an order"
                  desc="Check live status for your existing orders."
                  to="/tracking"
                />
                <QuickAction
                  title="View my dashboard"
                  desc="See recent orders and activity."
                  to="/dashboard"
                />
              </div>
            )}

            {role === "driver" && (
              <div className="grid grid-cols-1 gap-3 mb-5">
                <QuickAction
                  title="Open driver dashboard"
                  desc="Update your status and see assignments."
                  to="/driver"
                />
                <QuickAction
                  title="Update profile"
                  desc="Keep your contact info and avatar up to date."
                  to="/profile"
                />
              </div>
            )}

            {role === "admin" && (
              <div className="grid grid-cols-1 gap-3 mb-5">
                <QuickAction
                  title="View admin dashboard"
                  desc="Overview of orders, drivers and fleet."
                  to="/dashboard"
                />
                <QuickAction
                  title="Manage drivers"
                  desc="Create, edit and deactivate drivers."
                  to="/admin/drivers"
                />
                <QuickAction
                  title="Check fleet"
                  desc="See vehicles and assignments."
                  to="/fleet"
                />
              </div>
            )}

            {/* LIVE stats section */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="text-sm text-slate-500 mb-2">Today’s stats</div>

              {statsLoading ? (
                <div className="text-xs text-slate-400">Loading stats…</div>
              ) : statsError ? (
                <div className="text-xs text-red-500">{statsError}</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Stat
                    name="Total orders"
                    value={formatNumber(analytics?.totalOrders || 0)}
                  />
                  <Stat
                    name="Active drivers"
                    value={formatNumber(analytics?.activeDrivers || 0)}
                  />
                  <Stat
                    name="Vehicles"
                    value={formatNumber(analytics?.vehicles || 0)}
                  />

                  {driverStats && (role === "admin" || role === "driver") && (
                    <>
                      <Stat
                        name="Total drivers"
                        value={formatNumber(driverStats.totalDrivers || 0)}
                      />
                      <Stat
                        name="Available"
                        value={formatNumber(driverStats.availableDrivers || 0)}
                      />
                      <Stat
                        name="Total deliveries"
                        value={formatNumber(driverStats.totalDeliveries || 0)}
                      />
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 text-[11px] text-slate-400">
                Data powered by <code>/analytics/dashboard</code> and{" "}
                <code>/drivers/stats/overview</code>.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-xs text-slate-400">
          Built with React · Tailwind CSS · Axios · Google Maps · Cloudinary
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </div>
  );
}

function Stat({ name, value }) {
  return (
    <div className="bg-indigo-50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-indigo-700">{value}</div>
      <div className="text-xs text-indigo-600 mt-1">{name}</div>
    </div>
  );
}

function QuickAction({ title, desc, to }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-start p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
    >
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </Link>
  );
}
