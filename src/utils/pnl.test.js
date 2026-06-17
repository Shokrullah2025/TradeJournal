import { describe, it, expect } from "vitest";
import { calculatePnL } from "./pnl";

describe("calculatePnL", () => {
  // ── Long trades ──
  it("calculates profit for a long trade", () => {
    expect(
      calculatePnL({ direction: "long", entry: 100, exit: 110, qty: 10, fees: 5 })
    ).toBe(95);
  });

  it("calculates loss for a long trade", () => {
    expect(
      calculatePnL({ direction: "long", entry: 110, exit: 100, qty: 10, fees: 5 })
    ).toBe(-105);
  });

  // ── Short trades ──
  it("calculates profit for a short trade", () => {
    expect(
      calculatePnL({ direction: "short", entry: 110, exit: 100, qty: 10, fees: 5 })
    ).toBe(95);
  });

  it("calculates loss for a short trade", () => {
    expect(
      calculatePnL({ direction: "short", entry: 100, exit: 110, qty: 10, fees: 5 })
    ).toBe(-105);
  });

  // ── buy/sell aliases (backtest engine) ──
  it("treats 'buy' like long and applies tickRatio", () => {
    expect(
      calculatePnL({ direction: "buy", entryPrice: 100, exitPrice: 105, size: 2, tickRatio: 20 })
    ).toBe(200);
  });

  it("treats 'sell' like short and applies tickRatio", () => {
    expect(
      calculatePnL({ direction: "sell", entryPrice: 105, exitPrice: 100, size: 2, tickRatio: 20 })
    ).toBe(200);
  });

  // ── Edge cases ──
  it("returns 0 for zero quantity", () => {
    expect(calculatePnL({ direction: "long", entry: 100, exit: 110, qty: 0, fees: 0 })).toBe(0);
  });

  it("returns 0 for zero price with zero quantity", () => {
    expect(calculatePnL({ direction: "long", entry: 0, exit: 0, qty: 0, fees: 0 })).toBe(0);
  });

  it("returns 0 (not NaN) for non-finite input", () => {
    expect(calculatePnL({ direction: "long", entry: NaN, exit: 110, qty: 10 })).toBe(0);
    expect(calculatePnL({ direction: "long", entry: 100, exit: Infinity, qty: 10 })).toBe(0);
    expect(calculatePnL({})).toBe(0);
  });

  it("supports fractional quantities (crypto/forex)", () => {
    expect(
      calculatePnL({ direction: "long", entry: 100, exit: 100.5, qty: 0.25, fees: 0 })
    ).toBeCloseTo(0.125, 10);
  });

  it("subtracts commission and swap captured in fees", () => {
    // gross = (120 - 100) * 3 = 60; fees (commission + swap) = 12 -> 48
    expect(
      calculatePnL({ direction: "long", entry: 100, exit: 120, qty: 3, fees: 12 })
    ).toBe(48);
  });

  it("defaults fees to 0 and tickRatio to 1 when omitted", () => {
    expect(calculatePnL({ direction: "long", entry: 100, exit: 110, qty: 10 })).toBe(100);
  });
});
