import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { X, User, Shield, CreditCard, TrendingUp, Clock, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

// ── User detail drawer ─────────────────────────────────────────────────────
// Slide-over with the full profile, subscription, trading summary and recent
// activity for one user, plus inline role/status controls. All reads are
// admin-scoped by RLS. Edits flow back through the onUpdate callback so the
// parent table stays the single source of truth.

const ROLES = ["user", "moderator", "admin"];
const STATUSES = ["active", "inactive", "suspended"];

const Field = ({ label, value }) => (
  <div>
    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{value || "—"}</dd>
  </div>
);

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const UserDetailDrawer = ({ userId, onClose, onUpdate, saving }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [perf, setPerf] = useState(null);
  const [activity, setActivity] = useState([]);
  // Tracks mount status so async role/status select handlers don't setState
  // after the drawer has been closed/unmounted.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Escape-to-close + lock background scroll while the drawer is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [profileRes, perfRes, activityRes] = await Promise.all([
          supabase
            .from("user_complete_profile")
            .select(
              "id, role, status, created_at, first_name, last_name, display_name, avatar_url, phone, timezone, currency, trading_experience, subscription_plan, subscription_status"
            )
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("trading_performance_summary")
            .select("user_id, total_trades, win_rate, net_pnl")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("user_activity_log")
            .select("id, action, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
        if (cancelled) return;
        if (profileRes.error) throw profileRes.error;
        setProfile(profileRes.data ?? null);
        setPerf(perfRes.data ?? null);
        setActivity(activityRes.data ?? []);
      } catch (err) {
        console.error("[UserDetailDrawer] load error:", err.message);
        if (!cancelled) setError("Could not load this user's details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name =
    profile?.display_name ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    (userId ? userId.slice(0, 8) : "User");

  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="admin-user-detail-modal">
      <div
        className="flex-1 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="admin-user-detail-backdrop"
      />
      <aside
        className="w-screen max-w-md bg-white dark:bg-gray-800 shadow-xl h-full overflow-y-auto animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-detail-title"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between z-10">
          <h2 id="admin-user-detail-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">User Detail</h2>
          <button
            onClick={onClose}
            autoFocus
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            data-testid="admin-user-detail-close-btn"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="admin-user-detail-loading-spinner">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : error ? (
          <div className="p-5" data-testid="admin-user-detail-error">
            <div className="rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 px-4 py-3 text-sm text-danger-700 dark:text-danger-300">
              {error}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{userId}</div>
              </div>
            </div>

            {/* Role & status controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <Shield className="w-3.5 h-3.5" /> Role
                </label>
                <select
                  className="select w-full"
                  value={profile?.role ?? "user"}
                  disabled={saving}
                  data-testid="admin-user-role-select"
                  onChange={(e) => {
                    const role = e.target.value;
                    onUpdate(userId, { role }).then((ok) => {
                      if (ok && mountedRef.current) setProfile((p) => ({ ...p, role }));
                    });
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</label>
                <select
                  className="select w-full"
                  value={profile?.status ?? "active"}
                  disabled={saving}
                  data-testid="admin-user-status-select"
                  onChange={(e) => {
                    const status = e.target.value;
                    onUpdate(userId, { status }).then((ok) => {
                      if (ok && mountedRef.current) setProfile((p) => ({ ...p, status }));
                    });
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subscription */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary-600 dark:text-primary-400" /> Subscription
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan" value={profile?.subscription_plan || "Free"} />
                <Field label="Status" value={profile?.subscription_status || "none"} />
              </div>
            </div>

            {/* Trading summary */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-success-600 dark:text-success-400" /> Trading Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total Trades" value={perf?.total_trades ?? 0} />
                <Field label="Win Rate" value={perf ? `${perf.win_rate}%` : "0%"} />
                <Field label="Net P&L" value={money(perf?.net_pnl)} />
                <Field label="Experience" value={profile?.trading_experience} />
              </div>
            </div>

            {/* Profile facts */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Timezone" value={profile?.timezone} />
              <Field label="Currency" value={profile?.currency} />
              <Field label="Phone" value={profile?.phone} />
              <Field label="Joined" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : null} />
            </div>

            {/* Recent activity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" /> Recent Activity
              </h3>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recorded activity.</p>
              ) : (
                <ul className="space-y-2" data-testid="admin-user-activity-list">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 dark:text-gray-100">{a.action}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

UserDetailDrawer.propTypes = {
  userId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

export default UserDetailDrawer;
