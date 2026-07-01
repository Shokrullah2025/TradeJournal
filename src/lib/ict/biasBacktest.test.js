import { describe, it, expect } from "vitest";
import { gradeBiasOutcome, backtestBias, biasCohort } from "./biasBacktest";
import { WARMUP_DAYS } from "./bias";

const DAY = 24 * 3600;
const analyzed = { open: 100, high: 105, low: 95, close: 100 };

describe("gradeBiasOutcome", () => {
  it("grades a long by which liquidity was taken", () => {
    expect(gradeBiasOutcome("long", analyzed, { open: 101, high: 107, low: 96, close: 106 })).toBe("win");
    expect(gradeBiasOutcome("long", analyzed, { open: 99, high: 104, low: 92, close: 93 })).toBe("loss");
  });

  it("mirrors for a short", () => {
    expect(gradeBiasOutcome("short", analyzed, { open: 99, high: 104, low: 92, close: 93 })).toBe("win");
    expect(gradeBiasOutcome("short", analyzed, { open: 101, high: 107, low: 96, close: 106 })).toBe("loss");
  });

  it("counts a both-taken day against the bias", () => {
    const outside = { open: 100, high: 108, low: 92, close: 104 };
    expect(gradeBiasOutcome("long", analyzed, outside)).toBe("loss");
    expect(gradeBiasOutcome("short", analyzed, outside)).toBe("loss");
  });

  it("grades an inside day by its close vs open", () => {
    expect(gradeBiasOutcome("long", analyzed, { open: 98, high: 104, low: 96, close: 102 })).toBe("win");
    expect(gradeBiasOutcome("long", analyzed, { open: 102, high: 104, low: 96, close: 98 })).toBe("loss");
  });

  it("leaves an inside doji unresolved", () => {
    expect(gradeBiasOutcome("long", analyzed, { open: 100, high: 104, low: 96, close: 100 })).toBe("unresolved");
  });
});

describe("backtestBias", () => {
  // Weekday-only series builder (same convention as bias.test.js).
  function series(days) {
    const monday = Math.floor(Date.parse("2026-06-01T17:00:00Z") / 1000);
    let t = monday;
    let weekday = 0;
    return days.map((d) => {
      const out = { time: t, open: d.o, high: d.h, low: d.l, close: d.c, volume: 1000 };
      weekday = (weekday + 1) % 5;
      t += weekday === 0 ? 3 * DAY : DAY;
      return out;
    });
  }
  const flat = { o: 100, h: 105, l: 95, c: 100 };

  it("returns the empty shape for insufficient data", () => {
    const r = backtestBias(series(Array.from({ length: 10 }, () => ({ ...flat }))), {});
    expect(r).toMatchObject({ total: 0, winRate: null, samples: [] });
  });

  it("neutral days produce no samples", () => {
    const r = backtestBias(series(Array.from({ length: 40 }, () => ({ ...flat }))), { symbol: "GC" });
    expect(r.total).toBe(0);
  });

  it("grades a long-bias day against the following day and stays deterministic", () => {
    // Flat warm-up, then an expansion-up day (→ long bias), then a follow-
    // through day that takes only the high (→ win). Trailing flat days keep
    // the series long enough without adding samples.
    const days = [
      ...Array.from({ length: 25 }, () => ({ ...flat })),
      { o: 100, h: 112, l: 99, c: 111 },   // analyzed: long bias
      { o: 111, h: 118, l: 110, c: 117 },  // takes 112 high, holds 99 low → win
      ...Array.from({ length: 5 }, () => ({ o: 117, h: 118, l: 116, c: 117 })),
    ];
    const candles = series(days);
    const r = backtestBias(candles, { symbol: "GC" });
    const first = r.samples.find((s) => s.time === candles[25].time);
    expect(first).toBeDefined();
    expect(first.bias).toBe("long");
    expect(first.outcome).toBe("win");
    expect(r.byBias.long.wins).toBeGreaterThanOrEqual(1);
    expect(backtestBias(candles.map((c) => ({ ...c })), { symbol: "GC" })).toEqual(r);
  });

  it("counts a next-day outside bar as a loss for the bias", () => {
    const days = [
      ...Array.from({ length: 25 }, () => ({ ...flat })),
      { o: 100, h: 112, l: 99, c: 111 },   // long bias
      { o: 111, h: 115, l: 90, c: 100 },   // takes BOTH sides → loss
      ...Array.from({ length: 5 }, () => ({ o: 100, h: 101, l: 99, c: 100 })),
    ];
    const candles = series(days);
    const r = backtestBias(candles, { symbol: "GC" });
    const graded = r.samples.find((s) => s.time === candles[25].time);
    expect(graded.outcome).toBe("loss");
  });

  it("wins + losses + unresolved always equals total", () => {
    // Mixed synthetic trend with pullbacks — just verify the invariants.
    const days = Array.from({ length: 120 }, (_, k) => {
      const base = 100 + k * 0.6;
      const spike = k % 9 === 0 ? 8 : 0;
      return { o: base, h: base + 3 + spike, l: base - 3, c: base + (k % 4 === 0 ? -1.5 : 2) };
    });
    const r = backtestBias(series(days), { symbol: "GC" });
    expect(r.wins + r.losses + r.expired).toBe(r.total);
    expect(r.byBias.long.total + r.byBias.short.total).toBe(r.total);
    if (r.wins + r.losses > 0) {
      expect(r.winRate).toBeCloseTo(r.wins / (r.wins + r.losses), 10);
    }
    for (const s of r.samples) {
      expect(s.time).toBeGreaterThanOrEqual(series(days)[WARMUP_DAYS].time);
    }
  });
});

describe("biasCohort", () => {
  const results = {
    total: 30, wins: 14, losses: 10, expired: 6, winRate: 14 / 24, avgR: null,
    byBias: {
      long: { total: 20, wins: 12, losses: 6, expired: 2, winRate: 12 / 18, avgR: null },
      short: { total: 10, wins: 2, losses: 1, expired: 7, winRate: 2 / 3, avgR: null },
    },
  };

  it("prefers the matching-bias cohort when it has ≥5 decided samples", () => {
    const c = biasCohort(results, { bias: "long" });
    expect(c.scope).toBe("bias");
    expect(c.winRate).toBeCloseTo(12 / 18, 10);
  });

  it("falls back to overall when the cohort is thin", () => {
    const c = biasCohort(results, { bias: "short" }); // only 3 decided
    expect(c.scope).toBe("all");
    expect(c.total).toBe(30);
  });

  it("returns null for neutral or missing bias", () => {
    expect(biasCohort(results, { bias: "neutral" })).toBeNull();
    expect(biasCohort(results, null)).toBeNull();
  });
});
