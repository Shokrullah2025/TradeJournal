// ── Admin metrics derivation ─────────────────────────────────────────────
// Pure functions that turn raw activity-log rows into the time series the
// SystemMetrics board charts. Kept side-effect free so they are unit-testable
// without a Supabase mock.

const FAILURE_HINTS = ["fail", "error", "denied", "locked", "invalid", "reject"];

// An activity row counts as a failure if its action name hints at one, or its
// details payload carries an error field.
export function isFailureEvent(row) {
  if (!row) return false;
  const action = String(row.action || "").toLowerCase();
  if (FAILURE_HINTS.some((h) => action.includes(h))) return true;
  const details = row.details || {};
  return !!(details.error || details.failed || details.success === false);
}

function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

// Build a continuous per-day series for the last `days` days (inclusive of
// today), with zero-filled gaps so the chart x-axis is evenly spaced.
//
// activityRows: [{ action, created_at, user_id, details }]
// signupRows:   [{ created_at }]  (users.created_at)
// tradeRows:    [{ created_at }]  (trades.created_at)
export function buildDailySeries({ activityRows = [], signupRows = [], tradeRows = [], days = 30 } = {}) {
  const buckets = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    buckets[key] = {
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      requests: 0,
      failures: 0,
      signups: 0,
      trades: 0,
      _users: new Set(),
    };
  }

  activityRows.forEach((row) => {
    const key = toDateKey(row.created_at);
    const b = key && buckets[key];
    if (!b) return;
    b.requests += 1;
    if (isFailureEvent(row)) b.failures += 1;
    if (row.user_id) b._users.add(row.user_id);
  });

  signupRows.forEach((row) => {
    const b = buckets[toDateKey(row.created_at)];
    if (b) b.signups += 1;
  });

  tradeRows.forEach((row) => {
    const b = buckets[toDateKey(row.created_at)];
    if (b) b.trades += 1;
  });

  return Object.values(buckets).map((b) => {
    const errorRate = b.requests > 0 ? (b.failures / b.requests) * 100 : 0;
    return {
      date: b.date,
      label: b.label,
      requests: b.requests,
      failures: b.failures,
      errorRate: Math.round(errorRate * 10) / 10,
      activeUsers: b._users.size,
      signups: b.signups,
      trades: b.trades,
    };
  });
}

// Roll a series up into headline totals for the KPI cards.
export function summarizeSeries(series = []) {
  const totals = series.reduce(
    (acc, d) => {
      acc.requests += d.requests;
      acc.failures += d.failures;
      acc.signups += d.signups;
      acc.trades += d.trades;
      acc.peakActive = Math.max(acc.peakActive, d.activeUsers);
      return acc;
    },
    { requests: 0, failures: 0, signups: 0, trades: 0, peakActive: 0 }
  );
  totals.errorRate = totals.requests > 0 ? Math.round((totals.failures / totals.requests) * 1000) / 10 : 0;
  return totals;
}
