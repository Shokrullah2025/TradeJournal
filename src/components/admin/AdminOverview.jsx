import React, { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import AdminStatCard from "./AdminStatCard";

// ── Admin overview ─────────────────────────────────────────────────────────
// Headline KPIs across users, subscriptions and revenue, plus a short health
// strip. Every query is admin-scoped by RLS (is_admin()).

const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const sevenDaysAgoISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
};

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    newUsers7d: 0,
    activeSubs: 0,
    trialUsers: 0,
    lockedUsers: 0,
    revenue30d: 0,
  });
  const [recentSignups, setRecentSignups] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nowISO = new Date().toISOString();
        const [
          usersRes,
          activeRes,
          suspendedRes,
          new7dRes,
          lockedRes,
          activeSubsRes,
          trialRes,
          paidInvoicesRes,
          recentRes,
        ] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "suspended"),
          supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgoISO()),
          supabase.from("users").select("id", { count: "exact", head: true }).gt("failed_login_attempts", 0),
          supabase.from("user_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("user_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").gte("trial_end", nowISO),
          supabase.from("invoices").select("total_amount, paid_at").eq("status", "paid").gte("paid_at", new Date(Date.now() - 30 * 864e5).toISOString()),
          supabase
            .from("users")
            .select("id, created_at, status, user_profiles(first_name, last_name, display_name, avatar_url)")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

        if (cancelled) return;

        // Supabase returns errors in the result object rather than throwing, so
        // inspect each response and surface a banner if any query failed.
        const responses = [
          usersRes, activeRes, suspendedRes, new7dRes, lockedRes,
          activeSubsRes, trialRes, paidInvoicesRes, recentRes,
        ];
        if (responses.some((r) => r.error)) {
          console.error("[AdminOverview] query error:", responses.find((r) => r.error)?.error?.message);
          setError("Some admin data could not be loaded. Counts may be incomplete.");
        }

        const revenue30d = (paidInvoicesRes.data ?? []).reduce(
          (sum, inv) => sum + Number(inv.total_amount || 0),
          0
        );

        setStats({
          totalUsers: usersRes.count ?? 0,
          activeUsers: activeRes.count ?? 0,
          suspendedUsers: suspendedRes.count ?? 0,
          newUsers7d: new7dRes.count ?? 0,
          activeSubs: activeSubsRes.count ?? 0,
          trialUsers: trialRes.count ?? 0,
          lockedUsers: lockedRes.count ?? 0,
          revenue30d,
        });
        setRecentSignups(recentRes.data ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error("[AdminOverview] load error:", err.message);
          setError("Some admin data could not be loaded. Counts may be incomplete.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const money = (n) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="admin-overview-loading-spinner">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, tone: "primary", testId: "admin-stat-total-users" },
    { title: "Active Users", value: stats.activeUsers, icon: UserCheck, tone: "success", testId: "admin-stat-active-users" },
    { title: "Suspended", value: stats.suspendedUsers, icon: UserX, tone: "danger", testId: "admin-stat-suspended-users" },
    { title: "New (7 days)", value: stats.newUsers7d, icon: TrendingUp, tone: "primary", testId: "admin-stat-new-users" },
    { title: "Active Subscriptions", value: stats.activeSubs, icon: CreditCard, tone: "success", testId: "admin-stat-active-subs" },
    { title: "Trial Users", value: stats.trialUsers, icon: Activity, tone: "warning", testId: "admin-stat-trial-users" },
    { title: "Revenue (30d)", value: money(stats.revenue30d), icon: DollarSign, tone: "success", testId: "admin-stat-revenue" },
    { title: "Accounts w/ Failed Logins", value: stats.lockedUsers, icon: AlertTriangle, tone: stats.lockedUsers > 0 ? "danger" : "gray", testId: "admin-stat-locked-users" },
  ];

  return (
    <div className="space-y-6" data-testid="admin-overview">
      {error && (
        <div
          className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-4 py-3 text-sm text-warning-700 dark:text-warning-300"
          data-testid="admin-overview-error"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <AdminStatCard key={c.title} {...c} />
        ))}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Signups
        </h3>
        {recentSignups.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="admin-overview-signups-empty">
            No recent signups.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700" data-testid="admin-overview-signups">
            {recentSignups.map((u) => {
              const p = u.user_profiles?.[0] ?? u.user_profiles ?? {};
              const name =
                p.display_name ||
                `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
                u.id.slice(0, 8);
              return (
                <li key={u.id} className="flex items-center justify-between py-3" data-testid={`admin-signup-row-${u.id}`}>
                  <div className="flex items-center space-x-3 min-w-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-3">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
