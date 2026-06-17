/**
 * Single source of truth for profit-and-loss calculation.
 *
 * Every PnL value in the app must be computed here — never inline a directional
 * formula in a component (see CLAUDE.md §5).
 *
 * Supports both the documented trade-journal contract and the backtest engine:
 *   - direction: "long" | "short" | "buy" | "sell"
 *   - entry / exit: prices (aliases: entryPrice / exitPrice)
 *   - qty: quantity / contracts / size (aliases: quantity / size)
 *   - fees: total fees + commission + swap to subtract (default 0)
 *   - tickRatio: contract/tick multiplier for futures & forex (default 1)
 *
 * Returns 0 for non-tradeable input (zero quantity, non-finite prices) rather
 * than NaN/Infinity, so callers never persist a poisoned value.
 *
 * @param {Object} params
 * @param {string} params.direction
 * @param {number} [params.entry]
 * @param {number} [params.entryPrice]
 * @param {number} [params.exit]
 * @param {number} [params.exitPrice]
 * @param {number} [params.qty]
 * @param {number} [params.quantity]
 * @param {number} [params.size]
 * @param {number} [params.fees=0]
 * @param {number} [params.tickRatio=1]
 * @returns {number} realized PnL (gross of direction, net of fees)
 */
export function calculatePnL({
  direction,
  entry,
  entryPrice,
  exit,
  exitPrice,
  qty,
  quantity,
  size,
  fees = 0,
  tickRatio = 1,
} = {}) {
  const dir = String(direction ?? "").toLowerCase();
  const isLong = dir === "long" || dir === "buy";

  const entryVal = Number(entry ?? entryPrice);
  const exitVal = Number(exit ?? exitPrice);
  const qtyVal = Number(qty ?? quantity ?? size);
  const feesVal = Number(fees) || 0;
  const tick = Number(tickRatio) || 1;

  // Reject anything that would produce NaN/Infinity, and treat zero quantity
  // as a flat (no PnL) position.
  if (
    !qtyVal ||
    !Number.isFinite(entryVal) ||
    !Number.isFinite(exitVal) ||
    !Number.isFinite(qtyVal)
  ) {
    return 0;
  }

  const gross = isLong
    ? (exitVal - entryVal) * qtyVal * tick
    : (entryVal - exitVal) * qtyVal * tick;

  return gross - feesVal;
}

export default calculatePnL;
