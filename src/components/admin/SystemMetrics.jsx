import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
// and trades. We fetch a fixed 90-day window once and each chart slices its own
// range from it, so per-chart time filters cost no extra queries. The KPI strip
// has its own summary range. A storage donut shows how much of the plan's
// storage quota the trade images occupy.

const FETCH_DAYS = 90;

const RANGE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

// Storage included on the current Supabase plan (Free includes 1 GB; Pro 100 GB).
// Used only to show "% of quota" — bump this if the plan is upgraded. Trade
// screenshots are the dominant storage consumer; avatars (one small WebP per
// user) are negligible.
const STORAGE_QUOTA_GB = 1;
const STORAGE_QUOTA_BYTES = STORAGE_QUOTA_GB * 1e9;

const CHART_GRID = "#e5e7eb";
const AXIS = "#6b7280";
const STORAGE_COLORS = ["#2a9d8f", "#e5e7eb"]; // [used, free]

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

const RangeToggle = ({ value, onChange, testId }) => (
  <div className="flex gap-0.5 rounded-md bg-gray-100 dark:bg-gray-800 p-0.5" data-test-id={testId}>
    {RANGE_OPTIONS.map(({ value: v, label }) => {
      const active = value === v;
      return (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            active
              ? "text-xs font-medium px-2.5 py-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-xs font-medium px-2.5 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }
        >
          {label}
        </button>
      );
    })}
  </div>
);
RangeToggle.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  testId: PropTypes.string,
};

const ChartCard = ({ title, subtitle, headerRight, children, testId }) => (
  <div className="card flex flex-col" data-test-id={testId}>
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {headerRight}
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
  headerRight: PropTypes.node,
  children: PropTypes.element.isRequired,
  testId: PropTypes.string,
};

// Read colors from the same CSS vars the toast/theme use so the tooltip is
// legible in both light and dark mode.
const tooltipStyle = {
  backgroundColor: "var(--toast-bg, #fff)",
  color: "var(--toast-color, #111827)",
  border: "1px solid var(--toast-border, #e5e7eb)",
  borderRadius: 8,
  fontSize: 12,
};
const tooltipItemStyle = { color: "var(--toast-color, #111827)" };

const SystemMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState({ activity: [], signups: [], trades: [] });
  // KPI strip range + independent per-chart ranges (all slice the 90-day fetch).
  const [summaryDays, setSummaryDays] = useState(30);
  const [chartRanges, setChartRanges] = useState({ requests: 30, errors: 30, active: 30, growth: 30 });
  const setChartRange = (key, v) => setChartRanges((r) => ({ ...r, [key]: v }));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const sinceISO = new Date(Date.now() - FETCH_DAYS * 864e5).toISOString();
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
  }, []);

  const series = useMemo(
    () =>
      buildDailySeries({
        activityRows: raw.activity,
        signupRows: raw.signups,
        tradeRows: raw.trades,
        days: FETCH_DAYS,
      }),
    [raw]
  );

  // Slice helper — take the last N days off the full series.
  const sliced = useCallback((n) => series.slice(-n), [series]);

  const totals = useMemo(() => summarizeSeries(sliced(summaryDays)), [sliced, summaryDays]);

  // ── Storage usage ──────────────────────────────────────────────────────
  const [storageBytes, setStorageBytes] = useState(null);
  const [storageLoading, setStorageLoading] = useState(true);

  const loadStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      // Sum the live trade-image file sizes (admins can read all rows via RLS).
      const { data, error: sErr } = await supabase
        .from("trade_images")
        .select("file_size")
        .is("deleted_at", null)
        .limit(10000);
      if (sErr) throw sErr;
      setStorageBytes((data ?? []).reduce((s, r) => s + (Number(r.file_size) || 0), 0));
    } catch (err) {
      console.error("[SystemMetrics] storage error:", err.message);
      setStorageBytes(null);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  const used = storageBytes ?? 0;
  const free = Math.max(0, STORAGE_QUOTA_BYTES - used);
  const usedPct = STORAGE_QUOTA_BYTES > 0 ? (used / STORAGE_QUOTA_BYTES) * 100 : 0;
  const storagePie = [
    { name: "Used", value: used },
    { name: "Free", value: free },
  ];

  // ── Storage maintenance (purge orphans) ─────────────────────────────────
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
      loadStorage(); // reflect the freed space
    } catch (err) {
      toast.error(err.message || "Purge failed. Please try again.");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6" data-test-id="admin-system-metrics">
      {/* Summary range selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Operational metrics from live activity. Each chart has its own range.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Summary:</span>
          <RangeToggle value={summaryDays} onChange={setSummaryDays} testId="admin-metrics-summary-range" />
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-4 py-3 text-sm text-warning-700 dark:text-warning-300"
          data-test-id="admin-metrics-error"
        >
          {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard title="Requests" value={totals.requests.toLocaleString()} icon={Activity} tone="primary" hint={`over ${summaryDays} days`} testId="admin-metric-requests" />
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
        <div className="flex items-center justify-center py-16" data-test-id="admin-metrics-loading-spinner">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Request Volume"
            subtitle="Activity events per day"
            testId="admin-chart-requests"
            headerRight={<RangeToggle value={chartRanges.requests} onChange={(v) => setChartRange("requests", v)} testId="admin-chart-requests-range" />}
          >
            <AreaChart data={sliced(chartRanges.requests)}>
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

          <ChartCard
            title="Error Rate"
            subtitle="% of events that failed"
            testId="admin-chart-errors"
            headerRight={<RangeToggle value={chartRanges.errors} onChange={(v) => setChartRange("errors", v)} testId="admin-chart-errors-range" />}
          >
            <LineChart data={sliced(chartRanges.errors)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.5} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} formatter={(v) => [`${v}%`, "Error rate"]} />
              <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Error rate" />
            </LineChart>
          </ChartCard>

          <ChartCard
            title="Active Users"
            subtitle="Distinct users active per day"
            testId="admin-chart-active-users"
            headerRight={<RangeToggle value={chartRanges.active} onChange={(v) => setChartRange("active", v)} testId="admin-chart-active-users-range" />}
          >
            <AreaChart data={sliced(chartRanges.active)}>
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

          <ChartCard
            title="Growth"
            subtitle="Signups vs trades logged per day"
            testId="admin-chart-growth"
            headerRight={<RangeToggle value={chartRanges.growth} onChange={(v) => setChartRange("growth", v)} testId="admin-chart-growth-range" />}
          >
            <BarChart data={sliced(chartRanges.growth)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.5} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="signups" fill="#6366f1" name="Signups" radius={[2, 2, 0, 0]} />
              <Bar dataKey="trades" fill="#f59e0b" name="Trades" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartCard>

          {/* Storage usage donut */}
          <div className="card flex flex-col" data-test-id="admin-chart-storage">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Storage</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Trade-image storage used of the {STORAGE_QUOTA_GB} GB plan quota
              </p>
            </div>
            {storageLoading ? (
              <div className="flex items-center justify-center h-64" data-test-id="admin-storage-loading">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative h-48 w-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storagePie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="65%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {storagePie.map((entry, i) => (
                          <Cell key={entry.name} fill={STORAGE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(v, n) => [formatBytes(v), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-test-id="admin-storage-used-pct">
                      {usedPct < 0.1 && used > 0 ? "<0.1" : usedPct.toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">used</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: STORAGE_COLORS[0] }} />
                    <span className="text-gray-600 dark:text-gray-400">Used</span>
                    <span className="ml-auto font-medium text-gray-900 dark:text-gray-100" data-test-id="admin-storage-used">{formatBytes(used)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm bg-gray-200 dark:bg-gray-600" />
                    <span className="text-gray-600 dark:text-gray-400">Free</span>
                    <span className="ml-auto font-medium text-gray-900 dark:text-gray-100" data-test-id="admin-storage-free">{formatBytes(free)}</span>
                  </div>
                  <div className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Quota</span>
                    <span className="ml-auto font-medium text-gray-900 dark:text-gray-100">{STORAGE_QUOTA_GB} GB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Storage maintenance */}
      <div className="card" data-test-id="admin-storage-maintenance">
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
            data-test-id="admin-purge-images-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {purging ? "Purging…" : "Purge orphaned images"}
          </button>
        </div>
        {purgeResult && (
          <p
            className="mt-3 text-xs text-gray-600 dark:text-gray-300"
            data-test-id="admin-purge-result"
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
