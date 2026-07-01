import { describe, it, expect } from "vitest";
import {
  FUTURES_CONTRACTS,
  getContract,
  roundToTick,
  positionSize,
} from "./futuresContracts";

describe("FUTURES_CONTRACTS catalog", () => {
  it("contains the launch assets with unique symbols", () => {
    const symbols = FUTURES_CONTRACTS.map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
    for (const s of ["ES", "NQ", "GC", "SI", "NG", "ZB", "6E"]) {
      expect(symbols).toContain(s);
    }
  });

  it("every contract has positive tick specs and a =F yahoo symbol", () => {
    for (const c of FUTURES_CONTRACTS) {
      expect(c.tickSize).toBeGreaterThan(0);
      expect(c.tickValue).toBeGreaterThan(0);
      expect(c.yahoo.endsWith("=F")).toBe(true);
    }
  });
});

describe("getContract", () => {
  it("returns the matching contract", () => {
    expect(getContract("ES")).toMatchObject({ yahoo: "ES=F", tickValue: 12.5 });
  });
  it("returns null for unknown symbols", () => {
    expect(getContract("XX")).toBeNull();
  });
});

describe("roundToTick", () => {
  it("snaps to the tick grid", () => {
    expect(roundToTick(5140.13, 0.25)).toBe(5140.25);
    expect(roundToTick(5140.1, 0.25)).toBe(5140);
  });
  it("handles ZB 1/32 fractional ticks", () => {
    expect(roundToTick(117.51, 0.03125)).toBe(117.5);
    expect(roundToTick(117.516, 0.03125)).toBe(117.53125);
  });
  it("passes through invalid input unchanged", () => {
    expect(roundToTick(NaN, 0.25)).toBeNaN();
    expect(roundToTick(100, 0)).toBe(100);
  });
});

describe("positionSize", () => {
  // ES: 8-point stop = 32 ticks × $12.50 = $400 per contract
  it("flags over-risk when one contract exceeds the budget", () => {
    const r = positionSize({
      accountBalance: 10000, riskPct: 1,
      entry: 5000, stopLoss: 4992,
      tickSize: 0.25, tickValue: 12.5,
    });
    expect(r).toMatchObject({ contracts: 0, overRisk: true, riskAmount: 100 });
    expect(r.riskPerContract).toBe(400);
  });

  it("sizes a $50k account at 1% to one ES contract on an 8-point stop", () => {
    const r = positionSize({
      accountBalance: 50000, riskPct: 1,
      entry: 5000, stopLoss: 4992,
      tickSize: 0.25, tickValue: 12.5,
    });
    expect(r.contracts).toBe(1);
    expect(r.maxLoss).toBe(-400);
    expect(r.overRisk).toBe(false);
  });

  it("works for short trades (stop above entry)", () => {
    const r = positionSize({
      accountBalance: 100000, riskPct: 2,
      entry: 5000, stopLoss: 5010,
      tickSize: 0.25, tickValue: 12.5,
    });
    // 10-pt stop = 40 ticks × 12.5 = $500/contract; budget $2000 → 4
    expect(r.contracts).toBe(4);
  });

  it("returns null for invalid input", () => {
    expect(positionSize({ accountBalance: 0, riskPct: 1, entry: 1, stopLoss: 2, tickSize: 0.25, tickValue: 12.5 })).toBeNull();
    expect(positionSize({ accountBalance: 1000, riskPct: 1, entry: 100, stopLoss: 100, tickSize: 0.25, tickValue: 12.5 })).toBeNull();
    expect(positionSize({ accountBalance: 1000, riskPct: -1, entry: 100, stopLoss: 99, tickSize: 0.25, tickValue: 12.5 })).toBeNull();
    expect(positionSize({ accountBalance: 1000, riskPct: 1, entry: NaN, stopLoss: 99, tickSize: 0.25, tickValue: 12.5 })).toBeNull();
  });
});
