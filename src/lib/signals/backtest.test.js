import { describe, it, expect } from "vitest";
import { resolveSignalForward, backtestSignals, LOOKAHEAD_BARS } from "./backtest";
import { WARMUP_BARS } from "./engine";

const candle = (time, o, h, l, c, v = 1000) => ({
  time, open: o, high: h, low: l, close: c, volume: v,
});

// Long signal: entry 100, stop 96 (risk 4), target 106 (reward 6 = 1.5R)
const longSig = { direction: "long", entry: 100, stopLoss: 96, takeProfit: 106 };
const shortSig = { direction: "short", entry: 100, stopLoss: 104, takeProfit: 94 };

function flatBars(n, base = 100) {
  return Array.from({ length: n }, (_, i) => candle(i * 60, base, base + 1, base - 1, base));
}

describe("resolveSignalForward", () => {
  it("resolves a win when the target is touched first", () => {
    const candles = flatBars(3);
    candles.push(candle(180, 100, 107, 99, 106)); // touches TP, not SL
    const r = resolveSignalForward(candles, 2, longSig, 10);
    expect(r.outcome).toBe("win");
    expect(r.exitR).toBeCloseTo(1.5, 10);
    expect(r.resolutionIndex).toBe(3);
  });

  it("resolves a loss when the stop is touched first", () => {
    const candles = flatBars(3);
    candles.push(candle(180, 100, 101, 95, 96)); // touches SL only
    const r = resolveSignalForward(candles, 2, longSig, 10);
    expect(r).toMatchObject({ outcome: "loss", exitR: -1, resolutionIndex: 3 });
  });

  it("counts a bar touching BOTH stop and target as a loss (conservative)", () => {
    const candles = flatBars(3);
    candles.push(candle(180, 100, 110, 90, 100)); // sweeps both sides
    const r = resolveSignalForward(candles, 2, longSig, 10);
    expect(r.outcome).toBe("loss");
    expect(r.exitR).toBe(-1);
  });

  it("expires with signed R when the lookahead is exhausted", () => {
    // Never touches 96 or 106; drifts to 102 → exitR = +0.5
    const candles = flatBars(3);
    for (let j = 0; j < 5; j++) candles.push(candle(180 + j * 60, 101, 103, 99, 102));
    const r = resolveSignalForward(candles, 2, longSig, 5);
    expect(r.outcome).toBe("expired");
    expect(r.exitR).toBeCloseTo(0.5, 10);
    expect(r.resolutionIndex).toBe(7);
  });

  it("mirrors touches for short signals", () => {
    const candles = flatBars(3);
    candles.push(candle(180, 100, 101, 93, 94)); // hits short TP
    const win = resolveSignalForward(candles, 2, shortSig, 10);
    expect(win.outcome).toBe("win");
    expect(win.exitR).toBeCloseTo(1.5, 10);

    const candles2 = flatBars(3);
    candles2.push(candle(180, 100, 105, 99, 104)); // hits short SL
    expect(resolveSignalForward(candles2, 2, shortSig, 10).outcome).toBe("loss");
  });
});

describe("backtestSignals", () => {
  // Deterministic trending series with pullbacks — fires real signals.
  function trendingSeries(n) {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const candles = [];
    let price = 100;
    for (let i = 0; i < n; i++) {
      // Up-drift with periodic pullbacks so price revisits its EMA20.
      const drift = i % 7 === 0 ? -1.2 : 0.6 + rand() * 0.4;
      const open = price;
      const close = price + drift;
      candles.push(candle(
        1700000000 + i * 3600,
        open,
        Math.max(open, close) + 0.5 + rand(),
        Math.min(open, close) - 0.5 - rand(),
        close,
        rand() > 0.5 ? 1500 : 900,
      ));
      price = close;
    }
    return candles;
  }

  it("returns the empty shape for insufficient data", () => {
    const r = backtestSignals(flatBars(10), "1h");
    expect(r).toMatchObject({ total: 0, winRate: null, trades: [] });
  });

  it("produces consistent aggregate counts and non-overlapping samples", () => {
    const candles = trendingSeries(600);
    const r = backtestSignals(candles, "1h");

    expect(r.total).toBe(r.trades.length);
    expect(r.wins + r.losses + r.expired).toBe(r.total);
    if (r.wins + r.losses > 0) {
      expect(r.winRate).toBeCloseTo(r.wins / (r.wins + r.losses), 10);
    }

    // Non-overlap: each trade starts strictly after the previous resolution.
    const times = r.trades.map((t) => t.time);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
    for (const t of r.trades) {
      expect(["win", "loss", "expired"]).toContain(t.outcome);
      expect(t.barsHeld).toBeLessThanOrEqual(LOOKAHEAD_BARS["1h"]);
      expect(t.time).toBeGreaterThanOrEqual(candles[WARMUP_BARS].time);
    }
  });

  it("is deterministic across runs", () => {
    const candles = trendingSeries(400);
    expect(backtestSignals(candles, "1h")).toEqual(
      backtestSignals(candles.map((c) => ({ ...c })), "1h"),
    );
  });

  it("splits cohorts by direction and tier that sum to the total", () => {
    const r = backtestSignals(trendingSeries(600), "1h");
    const dirTotal = Object.values(r.byDirection).reduce((s, c) => s + c.total, 0);
    const tierTotal = Object.values(r.byTier).reduce((s, c) => s + c.total, 0);
    expect(dirTotal).toBe(r.total);
    expect(tierTotal).toBe(r.total);
  });
});
