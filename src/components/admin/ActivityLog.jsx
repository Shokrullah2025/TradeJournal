import React, { useEffect, useState, useCallback } from "react";
import { Activity, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { isFailureEvent, FAILURE_HINTS } from "../../utils/adminMetrics";

// ── Activity / audit log ───────────────────────────────────────────────────
// Paginated, filterable feed of user_activity_log entries (admin-scoped by
// RLS). Failure-type events are highlighted so admins can spot login lockouts,
// broker-sync errors and other problems at a glance.

const PAGE_SIZE = 25;

const ActivityLog = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [onlyFailures, setOnlyFailures] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = page * PAGE_SIZE;
      let query = supabase
        .from("user_activity_log")
        .select("id, action, details, user_id, created_at", { count: "exact" });

      // Filter failures server-side (on the action name) so the count and
      // pagination stay consistent with what's shown. Detail-only failures are
      // still highlighted per-row via isFailureEvent.
      if (onlyFailures) {
        query = query.or(FAILURE_HINTS.map((h) => `action.ilike.%${h}%`).join(","));
      }

      const { data, error: qErr, count } = await query
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (qErr) throw qErr;
      setRows(data ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error("[ActivityLog] load error:", err.message);
      setError("Could not load activity. Please try again.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, onlyFailures]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4" data-testid="admin-activity-log">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Audit trail of user and admin actions. Failures are highlighted.
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyFailures}
            onChange={(e) => { setOnlyFailures(e.target.checked); setPage(0); }}
            data-testid="admin-activity-failures-only"
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
          />
          Failures only
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["Action", "User", "Details", "When"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400" data-testid="admin-activity-loading-spinner">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-danger-600 dark:text-danger-400" data-testid="admin-activity-error">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400" data-testid="admin-activity-empty-state">No activity to show.</td></tr>
            ) : (
              rows.map((row) => {
                const failed = isFailureEvent(row);
                return (
                  <tr key={row.id} className={failed ? "bg-danger-50/50 dark:bg-danger-900/10" : ""} data-testid={`admin-activity-row-${row.id}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {failed ? (
                          <AlertTriangle className="w-4 h-4 text-danger-500" />
                        ) : (
                          <Activity className="w-4 h-4 text-gray-400" />
                        )}
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-500 dark:text-gray-400">
                      {row.user_id ? row.user_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {row.details && Object.keys(row.details).length > 0
                        ? JSON.stringify(row.details)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{total.toLocaleString()} events</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            data-testid="admin-activity-prev-btn"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            data-testid="admin-activity-next-btn"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
