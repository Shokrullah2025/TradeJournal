import { describe, it, expect } from "vitest";
import { classifyCandle, dealingRange } from "./classify";

// prior candle: range 100–110, close 105
const P = { open: 102, high: 110, low: 100, close: 105 };
const REF = 10; // typical range

describe("classifyCandle", () => {
  it("classifies an expansion up (big range, strong body, no sweep-reversal)", () => {
    // range 12 (1.2×ref), body 10 (83% of range), closes above prior high
    const c = { open: 104, high: 116, low: 104, close: 114 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("expansion");
    expect(r.direction).toBe("up");
    expect(r.closeLocation).toBe("upper");
    expect(r.tookPriorHigh).toBe(true);
    expect(r.failedPriorHigh).toBe(false);
  });

  it("classifies an expansion down", () => {
    const c = { open: 106, high: 106, low: 94, close: 95 };
    const r = classifyCandle(c, P, REF);
    // sweeps prior low BUT closes down (not a reversal-up), big range strong body
    expect(r.type).toBe("expansion");
    expect(r.direction).toBe("down");
  });

  it("classifies a reversal up: sweep of the prior low, close in upper half", () => {
    // low 98 < 100, closes at 107 (> mid 102.5), bullish body, range 9 (not consolidation)
    const c = { open: 101, high: 107, low: 98, close: 107 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("reversal");
    expect(r.direction).toBe("up");
    expect(r.tookPriorLow).toBe(true);
    expect(r.failedPriorLow).toBe(true); // swept but closed back above
  });

  it("classifies a reversal down: sweep of the prior high, close in lower half", () => {
    const c = { open: 109, high: 112, low: 103, close: 103 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("reversal");
    expect(r.direction).toBe("down");
    expect(r.failedPriorHigh).toBe(true);
  });

  it("resolves an outside bar as a reversal by its close direction", () => {
    // sweeps both sides, closes strong bullish in the upper half → reversal up
    const c = { open: 105, high: 112, low: 98, close: 111 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("reversal");
    expect(r.direction).toBe("up");
    expect(r.tookPriorHigh).toBe(true);
    expect(r.tookPriorLow).toBe(true);
  });

  it("inside bar is consolidation even with a big reference move elsewhere", () => {
    const c = { open: 103, high: 108, low: 101, close: 107 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("consolidation");
  });

  it("narrow range is consolidation even when not an inside bar", () => {
    // range 4 < 0.6×10, pokes above prior high
    const c = { open: 109, high: 112, low: 108, close: 110.5 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("consolidation");
  });

  it("defaults to retracement", () => {
    // Pokes above the prior high but closes bullish (not a reversal-down),
    // range 9 (not consolidation, not expansion), closes back inside → retracement.
    const c = { open: 104, high: 111, low: 102, close: 108 };
    const r = classifyCandle(c, P, REF);
    expect(r.type).toBe("retracement");
    expect(r.direction).toBe("up");
    expect(r.failedPriorHigh).toBe(true);
  });

  it("computes close location thirds and handles a zero-range candle", () => {
    const flat = { open: 105, high: 105, low: 105, close: 105 };
    expect(classifyCandle(flat, P, REF).closeLocation).toBe("middle");
    const lower = { open: 109, high: 111, low: 102, close: 103 };
    expect(classifyCandle(lower, P, REF).closeLocation).toBe("lower");
  });

  it("is deterministic", () => {
    const c = { open: 104, high: 116, low: 104, close: 114 };
    expect(classifyCandle(c, P, REF)).toEqual(classifyCandle({ ...c }, { ...P }, REF));
  });
});

describe("dealingRange", () => {
  const mk = (h, l, c) => ({ open: c, high: h, low: l, close: c });
  // 20 candles spanning 100–120
  const base = Array.from({ length: 20 }, (_, k) => mk(120 - (k % 3), 100 + (k % 3), 110));

  it("returns null without enough history", () => {
    expect(dealingRange(base, 10, 20)).toBeNull();
  });

  it("flags premium above equilibrium", () => {
    const candles = [...base.slice(0, 19), mk(120, 100, 118)];
    const r = dealingRange(candles, 19, 20);
    expect(r.position).toBe("premium");
    expect(r.eq).toBe(110);
    expect(r.pctInRange).toBeCloseTo(0.9, 10);
  });

  it("flags discount below equilibrium", () => {
    const candles = [...base.slice(0, 19), mk(120, 100, 102)];
    expect(dealingRange(candles, 19, 20).position).toBe("discount");
  });

  it("treats the ±5% band around equilibrium as neutral", () => {
    const candles = [...base.slice(0, 19), mk(120, 100, 110.5)]; // 0.5/20 = 2.5% from eq
    expect(dealingRange(candles, 19, 20).position).toBe("equilibrium");
  });
});
