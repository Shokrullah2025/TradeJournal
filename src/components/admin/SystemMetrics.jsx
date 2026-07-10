import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, AlertTriangle, Users, TrendingUp, Server, Gauge, Trash2, Loader2, HardDrive } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { invokeFunction } from "../../lib/invokeFunction";
import AdminStatCard from "./AdminStatCard";
import { buildDailySeries, summarizeSeries } from "../../utils/adminMetrics";

// ── System metrics board ──────────────────────────────────────────────────
// Operational view: request volume, failure/error rate, active users, signups
// and trades over a selectable window. Figures are derived live from
// user_activity_log (a proxy for request volume), users.created_at and
// trades.created_at. If admin_metrics_daily snapshots exist they could later be
// merged for server-side load/latency; until then those cards show live data.

const RANGE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const CHART_GRID = "#e5e7eb";
const AXIS = "#6b7280";

const ChartCard = ({ title, subtitle, children, testId }) => (
  <div className="card flex flex-col" data-testid={testId}>
    <div className="mb-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: PropTypes.element.isRequired,
  testId: PropTypes.string,
};

// Read colors from the same CSS vars the toast/theme use so the tooltip is
// legible in both light and dark mode (recharts colors item/label text
// separately, hence itemStyle/labelStyle below).
const tooltipStyle = {
  backgroundColor: "var(--toast-bg, #fff)",
  color: "var(--toast-color, #111827)",
  border: "1px solid var(--toast-border, #e5e7eb)",
  borderRadius: 8,
  fontSize: 12,
};
const tooltipItemStyle = { color: "var(--toast-color, #111827)" };

const SystemMetrics = () => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState({ activity: [], signups: [], trades: [] });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const sinceISO = new Date(Date.now() - days * 864e5).toISOString();
      try {
        const [activityRes, signupRes, tradeRes] = await Promise.all([
          supabase
            .from("user_activity_log")
            .select("action, created_at, user_id, details")
            .gte("created_at", sinceISO)
            .order("created_at", { ascending: false })
            .limit(5000),
          supabase.from("users").select("created_at").gte("created_at", sinceISO),
          supabase.from("trades").select("created_at").gte("created_at", sinceISO),
        ]);

        if (cancelled) return;
        if (activityRes.error) throw activityRes.error;

        setRaw({
          activity: activityRes.data ?? [],
          signups: signupRes.data ?? [],
          trades: tradeRes.data ?? [],
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[SystemMetrics] load error:", err.message);
          setError("Could not load activity metrics. The activity log may be empty for this range.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const series = useMemo(
    () =>
      buildDailySeries({
        activityRows: raw.activity,
        signupRows: raw.signups,
        tradeRows: raw.trades,
        days,
      }),
    [raw, days]
  );

  const totals = useMemo(() => summarizeSeries(series), [series]);

  // ── Storage maintenance ─────────────────────────────────────────────────
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  const runPurge = async () => {
    setPurging(true);
    try {
      const res = await invokeFunction(
        "admin-purge-trade-images",
        undefined,
        "Purge failed. Please try again.",
      );
      setPurgeResult(res);
      toast.success(
        `Removed ${res.orphansRemoved} orphaned file${res.orphansRemoved === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      toast.error(err.message || "Purge failed. Please try again.");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-system-metrics">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Operational metrics derived from live activity over the selected window.
        </p>
        <div className="flex gap-0.5 rounded-md bg-gray-100 dark:bg-gray-800 p-0.5" data-testid="admin-metrics-range-toggle">
          {RANGE_OPTIONS.map(({ value, label }) => {
            const active = days === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                data-testid={`admin-metrics-range-${label}-btn`}
                className={
                  active
                    ? "text-xs font-medium px-3 py-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-xs font-medium px-3 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-4 py-3 text-sm text-warning-700 dark:text-warning-300"
          data-testid="admin-metrics-error"
        >
          {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard title="Requests" value={totals.requests.toLocaleString()} icon={Activity} tone="primary" hint={`over ${days} days`} testId="admin-metric-requests" />
        <AdminStatCard
          title="Error Rate"
          value={`${totals.errorRate}%`}
          icon={AlertTriangle}
          tone={totals.errorRate >= 5 ? "danger" : totals.errorRate >= 1 ? "warning" : "success"}
          hint={`${totals.failures.toLocaleString()} failed events`}
          testId="admin-metric-error-rate"
        />
        <AdminStatCard title="Peak Active Users" value={totals.peakActive.toLocaleString()} icon={Users} tone="success" hint="busiest day" testId="admin-metric-active-users" />
        <AdminStatCard title="New Signups" value={totals.signups.toLocaleString()} icon={TrendingUp} tone="primary" hint={`${totals.trades.toLocaleString()} trades logged`} testId="admin-metric-signups" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="admin-metrics-loading-spinner">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Request Volume" subtitle="Activity events per day" testId="admin-chart-requests">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.5} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} />
              <Area type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} fill="url(#reqGradient)" name="Requests" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Error Rate" subtitle="% of events that failed" testId="admin-chart-errors">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.5} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} formatter={(v) => [`${v}%`, "Error rate"]} />
              <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Error rate" />
            </LineChart>
          </ChartCard>

          <ChartCard title="Active Users" subtitle="Distinct users active per day" testId="admin-chart-active-users">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="auGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.5} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} />
              <Area type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} fill="url(#auGradient)" name="Active users" />
            </AreaChart>
          </ChartCard>

          <ChartCard title="Growth" subtitle="Signups vs trades logged per day" testId="admin-chart-growth">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.5} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="signups" fill="#6366f1" name="Signups" radius={[2, 2, 0, 0]} />
              <Bar dataKey="trades" fill="#f59e0b" name="Trades" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {/* Storage maintenance */}
      <div className="card" data-testid="admin-storage-maintenance">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Storage maintenance
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-lg">
                Remove trade-image files that are no longer referenced by any
                trade — left over from deleted trades or images. Frees storage;
                does not touch images still in use.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={runPurge}
            disabled={purging}
            data-testid="admin-purge-images-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {purging ? "Purging…" : "Purge orphaned images"}
          </button>
        </div>
        {purgeResult && (
          <p
            className="mt-3 text-xs text-gray-600 dark:text-gray-300"
            data-testid="admin-purge-result"
          >
            Scanned {purgeResult.scanned} file{purgeResult.scanned === 1 ? "" : "s"} ·
            kept {purgeResult.kept} in use · removed{" "}
            <span className="font-semibold">{purgeResult.orphansRemoved}</span> orphan
            {purgeResult.orphansRemoved === 1 ? "" : "s"} · purged{" "}
            {purgeResult.softDeletedRowsPurged} stale record
            {purgeResult.softDeletedRowsPurged === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-start gap-3">
        <Server className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Server-side load and p95 latency populate the{" "}
          <Gauge className="inline w-3 h-3" /> <code className="text-[11px]">admin_metrics_daily</code> table from a
          scheduled Edge Function. Until that job runs, this board reflects
          client-observed activity only.
        </p>
      </div>
    </div>
  );
};

export default SystemMetrics;
