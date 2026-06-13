// Performance milestone tiers. A milestone fires once per tier (deduped by its
// stable `key` against the notifications table), so crossing a threshold a
// second time never re-notifies.

const TRADE_COUNT_TIERS = [10, 25, 50, 100, 250, 500, 1000];
const WIN_RATE_TIERS = [60, 70, 80, 90];
const MIN_TRADES_FOR_WINRATE = 20;

/**
 * Given the current trade stats, returns the milestone(s) currently satisfied.
 * Only the highest reached tier per metric is returned, so a single load can
 * emit at most one trade-count and one win-rate milestone.
 *
 * @param {{ totalTrades: number, winRate: number }} stats
 * @returns {Array<{ key: string, event_type: string, title: string, body: string }>}
 */
export function getMilestoneCandidates(stats) {
  const out = [];
  const totalTrades = stats?.totalTrades ?? 0;
  const winRate = stats?.winRate ?? 0;

  const countTier = [...TRADE_COUNT_TIERS]
    .reverse()
    .find((t) => totalTrades >= t);
  if (countTier) {
    out.push({
      key: `trades_${countTier}`,
      event_type: "milestone_trades",
      title: `${countTier} trades logged 🎉`,
      body: `You've recorded ${countTier} closed trades. Keep building your edge.`,
    });
  }

  if (totalTrades >= MIN_TRADES_FOR_WINRATE) {
    const wrTier = [...WIN_RATE_TIERS].reverse().find((t) => winRate >= t);
    if (wrTier) {
      out.push({
        key: `winrate_${wrTier}`,
        event_type: "milestone_winrate",
        title: `${wrTier}%+ win rate 🔥`,
        body: `Your win rate is ${winRate}% across ${totalTrades} closed trades.`,
      });
    }
  }

  return out;
}
