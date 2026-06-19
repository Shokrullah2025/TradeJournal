import React, { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, User, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { logActivity } from "../../utils/logActivity";
import UserDetailDrawer from "./UserDetailDrawer";

// ── User management ────────────────────────────────────────────────────────
// Searchable, filterable, paginated user table backed by the
// user_complete_profile view (admin-scoped by RLS). Row actions suspend /
// activate inline; the eye button opens the full detail drawer. Search is
// debounced to avoid a query per keystroke (CLAUDE.md perf rule).

const PAGE_SIZE = 20;

const STATUS_BADGE = {
  active: "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300",
  inactive: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  suspended: "bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300",
  deleted: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

const UserManagement = () => {
  const { user: currentUser, updateUser } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // Debounce the search box (300ms).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("user_complete_profile")
        .select(
          "id, role, status, created_at, first_name, last_name, display_name, avatar_url, subscription_plan, subscription_status",
          { count: "exact" }
        );

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (roleFilter !== "all") query = query.eq("role", roleFilter);
      if (search) {
        query = query.or(
          `display_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      }

      const from = page * PAGE_SIZE;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      setRows(data ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error("[UserManagement] load error:", err.message);
      setError("Failed to load users. Please try again.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Returns true on success so callers (drawer selects) can sync local state.
  const handleUpdate = async (userId, updates) => {
    if (userId === currentUser?.id && (updates.role || updates.status)) {
      toast.error("You cannot change your own role or status.");
      return false;
    }
    setSavingId(userId);
    try {
      await updateUser(userId, updates);
      logActivity(currentUser?.id, "admin_user_updated", { target: userId, ...updates });
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, ...updates } : r)));
      return true;
    } catch {
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4" data-testid="admin-user-management">
      {/* Search + filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              className="input pl-10 w-full"
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid="admin-user-search-input"
            />
          </div>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            data-testid="admin-user-status-filter"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            className="select"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            data-testid="admin-user-role-filter"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["User", "Role", "Status", "Plan", "Joined", ""].map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${i === 5 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400" data-testid="admin-users-loading-spinner">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-danger-600 dark:text-danger-400" data-testid="admin-users-error">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400" data-testid="admin-users-empty-state">No users found.</td></tr>
            ) : (
              rows.map((u) => {
                const name =
                  u.display_name ||
                  `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
                  u.id.slice(0, 8);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40" data-testid={`admin-user-row-${u.id}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          </div>
                        )}
                        <div className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">{name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">{u.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_BADGE[u.status] ?? STATUS_BADGE.inactive}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{u.subscription_plan || "Free"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      {u.status === "active" ? (
                        <button
                          onClick={() => handleUpdate(u.id, { status: "suspended" })}
                          disabled={savingId === u.id}
                          className="text-danger-600 dark:text-danger-400 hover:underline text-xs disabled:opacity-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          data-testid={`admin-suspend-btn-${u.id}`}
                        >Suspend</button>
                      ) : (
                        <button
                          onClick={() => handleUpdate(u.id, { status: "active" })}
                          disabled={savingId === u.id}
                          className="text-success-600 dark:text-success-400 hover:underline text-xs disabled:opacity-50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          data-testid={`admin-activate-btn-${u.id}`}
                        >Activate</button>
                      )}
                      <button
                        onClick={() => setSelectedId(u.id)}
                        className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 text-xs rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        data-testid={`admin-view-user-btn-${u.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="admin-users-count">
          {total.toLocaleString()} user{total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            data-testid="admin-users-prev-btn"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            data-testid="admin-users-next-btn"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          saving={savingId === selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default UserManagement;
