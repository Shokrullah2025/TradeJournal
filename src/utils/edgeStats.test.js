import { describe, it, expect } from "vitest";
import {
  computeEdgeStats,
  computeMaxDrawdown,
  withBalanceSnapshots,
} from "./edgeStats";

describe("computeEdgeStats", () => {
  // Known dataset, verified by hand:
  // wins: +100, +50 (grossWin 150) — losses: -50, -25 (grossLoss 75)
  const trades = [
    { pnl: 100, exitReason: "TP", rAchieved: 2 },
    { pnl: -50, exitReason: "SL", rAchieved: -1 },
    { pnl: 50, exitReason: "TP", rAchieved: 1 },
    { pnl: -25, exitReason: "Manual", rAchieved: -0.5 },
  ];

  it("computes win rate, profit factor, and expectancy for a mixed dataset", () => {
    const s = computeEdgeStats(trades, 1000);
    expect(s.total).toBe(4);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.winRate).toBe(0.5);
    expect(s.grossWin).toBe(150);
    expect(s.grossLoss).toBe(75);
    expect(s.profitFactor).toBe(2);
    expect(s.avgWin).toBe(75);
    expect(s.avgLoss).toBe(37.5);
    // 0.5 × 75 − 0.5 × 37.5
    expect(s.expectancy).toBe(18.75);
    expect(s.best).toBe(100);
    expect(s.worst).toBe(-50);
  });

  it("sums R multiples and averages them per side", () => {
    const s = computeEdgeStats(trades, 1000);
    expect(s.totalR).toBe(1.5);
    expect(s.avgRWin).toBe(1.5);
    expect(s.avgRLoss).toBe(-0.75);
  });

  it("splits trade counts by exit reason, defaulting missing reasons to Manual", () => {
    const s = computeEdgeStats([...trades, { pnl: 10 }], 1000);
    expect(s.byExit).toEqual({ TP: 2, SL: 1, Manual: 2 });
  });

  it("tracks the streak from the most recent trades", () => {
    const s = computeEdgeStats(
      [{ pnl: -10 }, { pnl: 20 }, { pnl: 30 }],
      1000
    );
    expect(s.streakType).toBe("W");
    expect(s.streak).toBe(2);
  });

  it("returns zeroed stats for an empty trade list", () => {
    const s = computeEdgeStats([], 1000);
    expect(s.total).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.profitFactor).toBe(0);
    expect(s.expectancy).toBe(0);
    expect(s.maxDD).toBe(0);
    expect(s.streakType).toBeNull();
  });

  it("reports Infinity profit factor when there are no losing trades", () => {
    const s = computeEdgeStats([{ pnl: 100 }, { pnl: 50 }], 1000);
    expect(s.profitFactor).toBe(Infinity);
    expect(s.winRate).toBe(1);
  });

  it("counts a break-even (zero PnL) trade as a loss", () => {
    const s = computeEdgeStats([{ pnl: 0 }, { pnl: 100 }], 1000);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBe(0.5);
  });

  it("ignores missing rAchieved values instead of failing", () => {
    const s = computeEdgeStats([{ pnl: 100 }, { pnl: -50, rAchieved: -1 }], 1000);
    expect(s.totalR).toBe(-1);
    expect(s.avgRWin).toBeNull();
    expect(s.avgRLoss).toBe(-1);
  });
});

describe("computeMaxDrawdown", () => {
  it("returns the largest peak-to-trough decline as a fraction of the peak", () => {
    // Peak 1100, trough 990 → (1100 − 990) / 1100 = 0.1
    const trades = [
      { balanceAfter: 1100 },
      { balanceAfter: 990 },
      { balanceAfter: 1210 },
    ];
    expect(computeMaxDrawdown(trades, 1000)).toBeCloseTo(0.1);
  });

  it("returns 0 when equity only rises", () => {
    const trades = [{ balanceAfter: 1100 }, { balanceAfter: 1200 }];
    expect(computeMaxDrawdown(trades, 1000)).toBe(0);
  });

  it("returns 0 for an empty trade list", () => {
    expect(computeMaxDrawdown([], 1000)).toBe(0);
  });

  it("skips trades without a balance snapshot", () => {
    const trades = [{ pnl: -100 }, { balanceAfter: 900 }];
    expect(computeMaxDrawdown(trades, 1000)).toBeCloseTo(0.1);
  });

  it("does not divide by zero when the peak is 0", () => {
    const trades = [{ balanceAfter: -50 }];
    expect(computeMaxDrawdown(trades, 0)).toBe(0);
  });
});

describe("withBalanceSnapshots", () => {
  it("backfills balanceAfter by walking PnL forward from the initial balance", () => {
    const out = withBalanceSnapshots([{ pnl: 100 }, { pnl: -30 }], 1000);
    expect(out[0].balanceAfter).toBe(1100);
    expect(out[1].balanceAfter).toBe(1070);
  });

  it("preserves existing snapshots and continues from them", () => {
    const out = withBalanceSnapshots(
      [{ pnl: 100, balanceAfter: 1100 }, { pnl: -50 }],
      1000
    );
    expect(out[0].balanceAfter).toBe(1100);
    expect(out[1].balanceAfter).toBe(1050);
  });

  it("does not mutate the input trades", () => {
    const input = [{ pnl: 100 }];
    withBalanceSnapshots(input, 1000);
    expect(input[0].balanceAfter).toBeUndefined();
  });

  it("returns an empty array for no trades", () => {
    expect(withBalanceSnapshots([], 1000)).toEqual([]);
  });

  it("treats a missing initial balance as 0 and a missing pnl as 0", () => {
    const out = withBalanceSnapshots([{ pnl: 100 }, {}], null);
    expect(out[0].balanceAfter).toBe(100);
    expect(out[1].balanceAfter).toBe(100);
  });
});
