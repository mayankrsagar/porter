// backend/controllers/adminUsersController.js
import User from '../models/User.js';

/**
 * GET /api/admin/users
 * Optional query params:
 *  - q  (search by name/email/id)
 *  - page (number)
 *  - limit (number)
 */
export const listUsers = async (req, res) => {
  try {
    const { q = "", page = 1, limit = 50 } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const filter = {};
    if (q && q.trim()) {
      const re = new RegExp(q.trim(), "i");
      filter.$or = [
        { name: re },
        { email: re },
        { userId: re }, // if you use userId
        { _id: re },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .lean();

    return res.json({ users, total, page: pg, limit: lim });
  } catch (err) {
    console.error("listUsers error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Body: { role } (or other fields you want to allow admins to edit)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = {};
    if (req.body.role !== undefined) allowed.role = req.body.role;
    if (req.body.name !== undefined) allowed.name = req.body.name;
    // Add other allowed admin-editable fields as needed (avoid allowing password change here)
    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ message: "No updatable fields provided" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: allowed },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "User updated", user });
  } catch (err) {
    console.error("updateUser error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // If you store avatars on cloudinary / files, optionally trigger cleanup here (not shown)
    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
