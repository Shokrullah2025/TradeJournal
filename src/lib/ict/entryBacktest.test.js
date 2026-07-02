import { describe, it, expect } from "vitest";
import { backtestEntries, setupCohort, MAX_HOLD_BARS } from "./entryBacktest";
import { tradingDayKey } from "./sessionProfile";
import { H4_SECONDS } from "./entryEngine";

const H1 = 3600;
const H4 = H4_SECONDS;
// Monday 18:00 ET in June 2026 — the session anchor aggregateTo4hSession uses.
const T0 = Math.floor(Date.parse("2026-06-15T22:00:00Z") / 1000);

const bar = (t, o, h, l, c) => ({ time: t, open: o, high: h, low: l, close: c, volume: 100 });

// Four 1h bars that aggregate to a 4H candle with the given OHLC.
function fourH(t, o, h, l, c) {
  return [bar(t, o, o, o, o), bar(t + H1, h, h, h, h), bar(t + 2 * H1, l, l, l, l), bar(t + 3 * H1, c, c, c, c)];
}

const quiet4h = (idx) => fourH(T0 + idx * H4, 100, 101, 99, 100);

// Base structure: 20 quiet buckets, bullish OB at 20 (zone [96, 101]),
// displacement at 21, rejection close at 22 → entry from bucket 23 onward.
function baseH1() {
  const out = [];
  for (let i = 0; i < 20; i++) out.push(...quiet4h(i));
  out.push(...fourH(T0 + 20 * H4, 100, 101, 96, 97)); // OB
  out.push(...fourH(T0 + 21 * H4, 97, 106, 96.5, 105)); // displacement
  out.push(...fourH(T0 + 22 * H4, 101.5, 105, 100, 104.5)); // rejection close
  return out;
}
const ENTRY_TIME = T0 + 23 * H4;
const CONFIRM_CLOSE = ENTRY_TIME;

// Bias stub keyed by the trading day of each expected confirmation close.
function stubBias(closeTimes, bias = "long", levels = { pdh: 118, pdl: 88, pwh: 126, pwl: 82 }) {
  const byForDayKey = new Map();
  for (const t of closeTimes) {
    byForDayKey.set(tradingDayKey(t), { bias, snapshot: { levels } });
  }
  return { entries: [], byForDayKey };
}

// Daily candles are only used when biasSeries isn't injected — a small dummy suffices.
const dummyDaily = Array.from({ length: 5 }, (_, k) => bar(T0 - (10 - k) * 86400, 100, 101, 99, 100));

function run(h1, { closeTimes = [CONFIRM_CLOSE], bias = "long", sibling1h = null, levels } = {}) {
  return backtestEntries(h1, dummyDaily, {
    symbol: "GC", // no SMT pair → gate waived unless sibling injected
    sibling1h,
    biasSeries: stubBias(closeTimes, bias, levels),
  });
}

describe("backtestEntries", () => {
  it("takes the win when the target is touched first", () => {
    const h1 = [
      ...baseH1(),
      bar(ENTRY_TIME, 104.75, 105, 104.5, 104.8),
      bar(ENTRY_TIME + H1, 104.8, 119, 104.5, 118.5), // touches pdh 118
    ];
    const r = run(h1);
    expect(r.total).toBe(1);
    const t = r.trades[0];
    expect(t.outcome).toBe("win");
    expect(t.entry).toBe(104.75);
    expect(t.targetLabel).toBe("pdh");
    expect(t.exitR).toBeCloseTo(t.rr, 10);
    expect(t.smtStatus).toBe("no-pair");
  });

  it("takes the loss when the stop is touched first", () => {
    const h1 = [
      ...baseH1(),
      bar(ENTRY_TIME, 104.75, 105, 104.5, 104.8),
      bar(ENTRY_TIME + H1, 104.8, 105, 94, 95), // through the stop (~95.7)
    ];
    const r = run(h1);
    expect(r.trades[0].outcome).toBe("loss");
    expect(r.trades[0].exitR).toBe(-1);
  });

  it("counts a bar touching both stop and target as a loss", () => {
    const h1 = [
      ...baseH1(),
      bar(ENTRY_TIME, 104.75, 105, 104.5, 104.8),
      bar(ENTRY_TIME + H1, 104.8, 119, 94, 110), // sweeps both sides
    ];
    const r = run(h1);
    expect(r.trades[0].outcome).toBe("loss");
  });

  it("the entry bar's own extremes count", () => {
    const h1 = [
      ...baseH1(),
      bar(ENTRY_TIME, 104.75, 105, 94, 95), // entry bar itself hits the stop
    ];
    const r = run(h1);
    expect(r.trades[0].outcome).toBe("loss");
    expect(r.trades[0].exitTime).toBe(ENTRY_TIME);
  });

  it("expires with a signed R when nothing is touched within the hold cap", () => {
    const h1 = [...baseH1()];
    for (let j = 0; j < MAX_HOLD_BARS + 10; j++) {
      const p = 105 + j * 0.01; // gentle up-drift, never reaches 118 or the stop
      h1.push(bar(ENTRY_TIME + j * H1, p, p + 0.5, p - 0.5, p));
    }
    const r = run(h1);
    const t = r.trades[0];
    expect(t.outcome).toBe("expired");
    // exited above entry → positive fractional R
    expect(t.exitR).toBeGreaterThan(0);
    expect(t.exitR).toBeLessThan(1);
  });

  it("keeps one trade open at a time (non-overlap)", () => {
    const h1 = [...baseH1()];
    // Bars for bucket 23 (quiet, no resolution) …
    h1.push(...fourH(ENTRY_TIME, 104.75, 105, 103.5, 104));
    // … bucket 24: ANOTHER rejection close off the same OB while trade 1 is open.
    h1.push(...fourH(T0 + 24 * H4, 102, 105, 100.5, 104.5));
    // Then quiet bars long enough for trade 1 to expire.
    for (let j = 0; j < MAX_HOLD_BARS + 8; j++) {
      h1.push(bar(T0 + 25 * H4 + j * H1, 104, 104.5, 103.5, 104));
    }
    const r = run(h1, { closeTimes: [CONFIRM_CLOSE, T0 + 25 * H4] });
    expect(r.total).toBe(1); // the second confirmation was skipped
  });

  it("neutral bias days produce no trades", () => {
    const h1 = [
      ...baseH1(),
      bar(ENTRY_TIME, 104.75, 105, 104.5, 104.8),
      bar(ENTRY_TIME + H1, 104.8, 119, 104.5, 118.5),
    ];
    const r = run(h1, { bias: "neutral" });
    expect(r.total).toBe(0);
  });

  it("SMT disagreement blocks the trade; agreement allows it", () => {
    const winBars = [
      bar(ENTRY_TIME, 104.75, 105, 104.5, 104.8),
      bar(ENTRY_TIME + H1, 104.8, 119, 104.5, 118.5),
    ];
    const h1 = [...baseH1(), ...winBars];

    // Sibling series on the same grid; its bucket 22 (the confirm bucket)
    // closes bearish → disagree.
    const sibDisagree = [];
    for (let i = 0; i < 23; i++) sibDisagree.push(...fourH(T0 + i * H4, 200, 201, 198, i === 22 ? 199 : 200.5));
    // sibling must also cover the entry buckets so its last completed bucket ≥ 22
    sibDisagree.push(...fourH(T0 + 23 * H4, 199, 200, 198, 199.5));

    const blocked = backtestEntries(h1, dummyDaily, {
      symbol: "ES", sibling1h: sibDisagree, biasSeries: stubBias([CONFIRM_CLOSE]),
    });
    expect(blocked.total).toBe(0);
    expect(blocked.smtBlocked).toBe(1);

    const sibAgree = [];
    for (let i = 0; i < 24; i++) sibAgree.push(...fourH(T0 + i * H4, 200, 201, 198, 200.5));
    const allowed = backtestEntries(h1, dummyDaily, {
      symbol: "ES", sibling1h: sibAgree, biasSeries: stubBias([CONFIRM_CLOSE]),
    });
    expect(allowed.total).toBe(1);
    expect(allowed.trades[0].smtStatus).toBe("agree");
  });

  it("aggregates avgR and byDirection consistently and is deterministic", () => {
    const h1 = [
      ...baseH1(),
      bar(ENTRY_TIME, 104.75, 105, 104.5, 104.8),
      bar(ENTRY_TIME + H1, 104.8, 119, 104.5, 118.5),
    ];
    const r = run(h1);
    expect(r.wins + r.losses + r.expired).toBe(r.total);
    expect(r.byDirection.long.total + r.byDirection.short.total).toBe(r.total);
    expect(r.avgR).toBeCloseTo(r.trades.reduce((s, t) => s + t.exitR, 0) / r.total, 10);
    expect(run(h1.map((c) => ({ ...c })))).toEqual(r);
  });

  it("returns the empty shape on insufficient data", () => {
    expect(backtestEntries([], dummyDaily, {})).toMatchObject({ total: 0, trades: [] });
    expect(backtestEntries(baseH1().slice(0, 10), dummyDaily, {})).toMatchObject({ total: 0 });
  });
});

describe("setupCohort", () => {
  const results = {
    total: 20, wins: 9, losses: 6, expired: 5, winRate: 0.6, avgR: 0.4,
    byDirection: {
      long: { total: 15, wins: 8, losses: 4, expired: 3, winRate: 8 / 12, avgR: 0.5 },
      short: { total: 5, wins: 1, losses: 2, expired: 2, winRate: 1 / 3, avgR: -0.1 },
    },
  };
  it("prefers the direction cohort with enough decided samples", () => {
    expect(setupCohort(results, { direction: "long" })).toMatchObject({ scope: "direction", total: 15 });
  });
  it("falls back to overall for thin cohorts and returns null without direction", () => {
    expect(setupCohort(results, { direction: "short" })).toMatchObject({ scope: "all", total: 20 });
    expect(setupCohort(results, { direction: null })).toBeNull();
    expect(setupCohort(null, { direction: "long" })).toBeNull();
  });
});
