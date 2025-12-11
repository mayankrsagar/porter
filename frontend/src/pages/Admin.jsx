// src/pages/Admin.jsx
import React, {
  useEffect,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import { apiFetch } from '../services/api';

/**
 * Admin page - Users management
 * - Requests /admin/users?page=1&limit=50 explicitly
 * - Shows loading spinner while fetching
 * - Accepts response shapes: Array OR { users: [...], total }
 */

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // explicit defaults
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 50;

  const loadUsers = async ({
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = {}) => {
    setLoading(true);
    setErr("");
    try {
      // explicit query params so backend sees page & limit
      const path = `/admin/users?page=${encodeURIComponent(
        page
      )}&limit=${encodeURIComponent(limit)}`;
      const res = await apiFetch(path);

      // Accept multiple shapes:
      //  - array response: res = [{...},...]
      //  - object response: { users: [...], total: N }
      //  - nested data: { data: [...] }
      if (Array.isArray(res)) {
        setUsers(res);
        setTotal(res.length);
      } else if (res && Array.isArray(res.users)) {
        setUsers(res.users);
        setTotal(typeof res.total === "number" ? res.total : res.users.length);
      } else if (res && Array.isArray(res.data)) {
        setUsers(res.data);
        setTotal(res.total || res.data.length);
      } else {
        // Fallback: try to coerce single-object responses or empty result
        setUsers([]);
        setTotal(0);
      }
    } catch (e) {
      console.error("loadUsers:", e);
      // normalize error object shapes from apiFetch
      const msg =
        (e && (e.message || e.msg)) ||
        e?.data?.message ||
        "Failed to load users";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeRole = async (userId, role) => {
    if (!confirm(`Change role to ${role}?`)) return;
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "patch",
        body: { role },
      });
      // refresh the list (or you could patch locally)
      loadUsers();
    } catch (e) {
      console.error("changeRole:", e);
      setErr(e?.message || "Failed to update user role");
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Delete user? This cannot be undone.")) return;
    try {
      await apiFetch(`/admin/users/${userId}`, { method: "delete" });
      // refresh list
      loadUsers();
    } catch (e) {
      console.error("deleteUser:", e);
      setErr(e?.message || "Failed to delete user");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-slate-500">
            Quick admin tools and user management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/drivers" className="px-3 py-2 rounded border">
            Drivers
          </Link>
          <Link to="/vehicles" className="px-3 py-2 rounded border">
            Vehicles
          </Link>
          <Link to="/orders" className="px-3 py-2 rounded border">
            Orders
          </Link>
          <Link to="/analytics" className="px-3 py-2 rounded border">
            Analytics
          </Link>
          <button
            onClick={() => loadUsers()}
            className="px-3 py-2 rounded border bg-white hover:bg-slate-50"
            aria-label="Refresh users"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-4 py-2">
          {err}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  Email
                </th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    {/* Simple spinner */}
                    <div className="inline-flex items-center gap-3">
                      <svg
                        className="animate-spin h-5 w-5 text-indigo-600"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      <div className="text-sm text-slate-600">
                        Loading users...
                      </div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {u.name || u.fullName || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        ID: {u.userId || u._id}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.email || "—"}
                    </td>
                    <td className="px-4 py-3">{u.role || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role !== "admin" ? (
                          <button
                            onClick={() => changeRole(u._id, "admin")}
                            className="px-2 py-1 text-xs rounded border"
                          >
                            Promote
                          </button>
                        ) : (
                          <button
                            onClick={() => changeRole(u._id, "user")}
                            className="px-2 py-1 text-xs rounded border"
                          >
                            Demote
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(u._id)}
                          className="px-2 py-1 text-xs rounded border bg-red-600 text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {users.length} users {total ? `of ${total}` : ""}.
          </div>
          <div className="text-sm text-slate-500">
            Page 1 (limit {DEFAULT_LIMIT})
          </div>
        </div>
      </div>
    </div>
  );
}
