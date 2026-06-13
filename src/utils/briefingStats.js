// Pure aggregations for the Pre-Market Briefing dashboard card.
// All functions take the raw trades array from TradeContext and a `now`
// Date (injectable for tests) and return plain serializable objects.

const MIN_TRADES_FOR_BRIEFING = 5;
const MIN_TRADES_PER_HOUR = 3;
const MIN_TRADES_FOR_WARNING = 4;
const WARNING_WIN_RATE = 0.35;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const tradeDate = (t) => {
  const raw = t.exitDate || t.exit_date || t.createdAt || t.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

// Local-timezone YYYY-MM-DD key (toISOString would shift the day near midnight)
export const localDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * Build everything the briefing card shows. Returns null when there is not
 * enough closed-trade history for the stats to be meaningful.
 *
 * Shape:
 * {
 *   dow:        { name, isNextSession, avgSession, winRate, rank, rankOf } | null
 *   goldenHour: { hour, winRate, avg } | null
 *   lastSession:{ key, pnl, count, wins, topInstrument } | null
 *   openPositions: { count, instruments }
 *   warning:    { type:'hour', hour, winRate, count } |
 *               { type:'streak', length } | null
 * }
 */
export function computeBriefingStats(trades, now = new Date()) {
  const closed = (trades || [])
    .filter((t) => t && t.status === "closed")
    .map((t) => ({ trade: t, date: tradeDate(t) }))
    .filter((x) => x.date)
    .sort((a, b) => a.date - b.date);

  if (closed.length < MIN_TRADES_FOR_BRIEFING) return null;

  const todayKey = localDateKey(now);

  // ----- per-day-of-week stats (sessions = distinct trading days) -----
  const byDow = {}; // dow -> { sessions: {key: pnl}, wins, count }
  closed.forEach(({ trade, date }) => {
    const dow = date.getDay();
    if (!byDow[dow]) byDow[dow] = { sessions: {}, wins: 0, count: 0 };
    const b = byDow[dow];
    b.sessions[localDateKey(date)] =
      (b.sessions[localDateKey(date)] || 0) + (trade.pnl || 0);
    b.count += 1;
    if ((trade.pnl || 0) > 0) b.wins += 1;
  });

  const dowSummaries = Object.entries(byDow).map(([dow, b]) => {
    const sessionPnls = Object.values(b.sessions);
    return {
      dow: Number(dow),
      avgSession:
        sessionPnls.reduce((s, v) => s + v, 0) / Math.max(1, sessionPnls.length),
      winRate: b.count ? b.wins / b.count : 0,
      count: b.count,
    };
  });
  dowSummaries.sort((a, b) => b.avgSession - a.avgSession);

  // Weekend logins preview the next session (Monday) instead of showing nothing
  const todayDow = now.getDay();
  const isWeekend = todayDow === 0 || todayDow === 6;
  const targetDow = isWeekend ? 1 : todayDow;
  const rankIdx = dowSummaries.findIndex((s) => s.dow === targetDow);
  const target = rankIdx >= 0 ? dowSummaries[rankIdx] : null;
  const dow =
    target && target.count >= MIN_TRADES_PER_HOUR
      ? {
          name: DAY_NAMES[targetDow],
          isNextSession: isWeekend,
          avgSession: target.avgSession,
          winRate: target.winRate,
          rank: rankIdx + 1,
          rankOf: dowSummaries.length,
        }
      : null;

  // ----- golden hour (best total P&L hour across all days) -----
  const byHour = {}; // hour -> { pnl, wins, count }
  closed.forEach(({ trade, date }) => {
    const h = date.getHours();
    if (!byHour[h]) byHour[h] = { pnl: 0, wins: 0, count: 0 };
    byHour[h].pnl += trade.pnl || 0;
    byHour[h].count += 1;
    if ((trade.pnl || 0) > 0) byHour[h].wins += 1;
  });
  const hourEntries = Object.entries(byHour)
    .map(([h, b]) => ({
      hour: Number(h),
      pnl: b.pnl,
      winRate: b.count ? b.wins / b.count : 0,
      avg: b.pnl / b.count,
      count: b.count,
    }))
    .filter((e) => e.count >= MIN_TRADES_PER_HOUR);
  const best = hourEntries.reduce(
    (acc, e) => (acc === null || e.pnl > acc.pnl ? e : acc),
    null
  );
  const goldenHour =
    best && best.pnl > 0
      ? { hour: best.hour, winRate: best.winRate, avg: best.avg }
      : null;

  // ----- last completed session before today -----
  const sessions = {}; // key -> { pnl, count, wins, instruments: {sym: n} }
  closed.forEach(({ trade, date }) => {
    const key = localDateKey(date);
    if (key >= todayKey) return;
    if (!sessions[key]) sessions[key] = { pnl: 0, count: 0, wins: 0, instruments: {} };
    const s = sessions[key];
    s.pnl += trade.pnl || 0;
    s.count += 1;
    if ((trade.pnl || 0) > 0) s.wins += 1;
    if (trade.instrument)
      s.instruments[trade.instrument] = (s.instruments[trade.instrument] || 0) + 1;
  });
  const lastKey = Object.keys(sessions).sort().pop();
  const lastSession = lastKey
    ? {
        key: lastKey,
        pnl: sessions[lastKey].pnl,
        count: sessions[lastKey].count,
        wins: sessions[lastKey].wins,
        topInstrument:
          Object.entries(sessions[lastKey].instruments).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0] || null,
      }
    : null;

  // ----- open positions -----
  const open = (trades || []).filter((t) => t && t.status === "open");
  const openPositions = {
    count: open.length,
    instruments: [...new Set(open.map((t) => t.instrument).filter(Boolean))].slice(0, 3),
  };

  // ----- warning: worst hour window, else current losing streak -----
  let warning = null;
  const worst = hourEntries
    .filter((e) => e.count >= MIN_TRADES_FOR_WARNING && e.winRate <= WARNING_WIN_RATE)
    .sort((a, b) => a.winRate - b.winRate)[0];
  if (worst) {
    warning = {
      type: "hour",
      hour: worst.hour,
      winRate: worst.winRate,
      count: worst.count,
    };
  } else {
    let streak = 0;
    for (let i = closed.length - 1; i >= 0; i--) {
      if ((closed[i].trade.pnl || 0) <= 0) streak += 1;
      else break;
    }
    if (streak >= 3) warning = { type: "streak", length: streak };
  }

  return { dow, goldenHour, lastSession, openPositions, warning };
}
