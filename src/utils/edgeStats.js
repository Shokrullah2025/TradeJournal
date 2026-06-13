// Edge analytics calculations shared between the live backtest panel
// (EdgeAnalyticsPanel) and the backtest session history page.

/**
 * Max drawdown as a fraction of peak equity, walked over the per-trade
 * balance snapshots (`balanceAfter`) starting from initialBalance.
 */
export function computeMaxDrawdown(trades, initialBalance) {
  const balances = [
    initialBalance,
    ...trades.filter((t) => t.balanceAfter != null).map((t) => t.balanceAfter),
  ];
  let peak = balances[0];
  let maxDD = 0;
  for (const b of balances) {
    if (b > peak) peak = b;
    const dd = peak > 0 ? (peak - b) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

/**
 * Ensure every trade carries a `balanceAfter` snapshot. Older sessions were
 * saved before snapshots existed, so missing values are reconstructed by
 * walking the PnL forward from the session's initial balance.
 */
export function withBalanceSnapshots(trades, initialBalance) {
  let running = initialBalance ?? 0;
  return trades.map((t) => {
    running = t.balanceAfter ?? running + (t.pnl ?? 0);
    return t.balanceAfter != null ? t : { ...t, balanceAfter: running };
  });
}

/**
 * Trade-level edge statistics for a list of closed backtest trades.
 * Each trade needs `pnl`; `rAchieved`, `exitReason` and `balanceAfter`
 * are optional and enrich the result when present.
 */
export function computeEdgeStats(trades, initialBalance = 0) {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const total = trades.length;
  const winRate = total ? wins.length / total : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
  const totalR = trades.reduce((s, t) => s + (t.rAchieved ?? 0), 0);
  const maxDD = computeMaxDrawdown(trades, initialBalance);

  let streak = 0;
  let streakType = null;
  for (let i = trades.length - 1; i >= 0; i--) {
    const isWin = trades[i].pnl > 0;
    if (streakType === null) {
      streakType = isWin ? "W" : "L";
      streak = 1;
    } else if ((streakType === "W") === isWin) {
      streak++;
    } else break;
  }

  const best = trades.reduce((m, t) => (t.pnl > m ? t.pnl : m), -Infinity);
  const worst = trades.reduce((m, t) => (t.pnl < m ? t.pnl : m), Infinity);

  const byExit = { TP: 0, SL: 0, Manual: 0 };
  trades.forEach((t) => {
    const k = t.exitReason || "Manual";
    byExit[k] = (byExit[k] || 0) + 1;
  });

  const rWins = wins.filter((t) => t.rAchieved != null).map((t) => t.rAchieved);
  const rLosses = losses.filter((t) => t.rAchieved != null).map((t) => t.rAchieved);
  const avgRWin = rWins.length ? rWins.reduce((a, b) => a + b, 0) / rWins.length : null;
  const avgRLoss = rLosses.length ? rLosses.reduce((a, b) => a + b, 0) / rLosses.length : null;

  return {
    total,
    wins: wins.length,
    losses: losses.length,
    winRate,
    grossWin,
    grossLoss,
    profitFactor,
    avgWin,
    avgLoss,
    expectancy,
    totalR,
    maxDD,
    streak,
    streakType,
    best,
    worst,
    byExit,
    avgRWin,
    avgRLoss,
  };
}
