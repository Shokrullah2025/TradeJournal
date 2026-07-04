// Canonical P&L calculation — lives here only, never inline in components.
// The Risk/Reward panel, broker sync, and the trade save path must all agree
// on one formula, or a futures trade shows +$10,000 in the panel and saves
// +$500 to the database (the NQ point-value bug).

// Dollar value per 1 point of price move per 1 contract.
export const FUTURES_POINT_VALUES = {
  // E-mini (standard)
  ES: 50, NQ: 20, YM: 5, RTY: 50,
  // Micro E-mini (1/10th of standard)
  MES: 5, MNQ: 2, MYM: 0.5, M2K: 5,
  // Commodities (standard)
  CL: 1000, GC: 100, SI: 5000, NG: 10000,
  // Micro commodities
  MCL: 100, MGC: 10,
};

// Smallest price increment per futures contract — powers Ticks/Points toggles.
export const FUTURES_TICK_SIZES = {
  ES: 0.25, NQ: 0.25, YM: 1, RTY: 0.1,
  MES: 0.25, MNQ: 0.25, MYM: 1, M2K: 0.1,
  CL: 0.01, GC: 0.1, SI: 0.005, NG: 0.001,
  MCL: 0.01, MGC: 0.1,
};

// Dollar multiplier applied to (price diff × quantity) for an instrument.
// Futures use the contract's point value; unknown futures symbols and all
// other instrument types fall back to 1 (price diff = dollars).
export const getContractMultiplier = (instrumentType, instrument) => {
  if (instrumentType === "futures") {
    return FUTURES_POINT_VALUES[instrument] ?? 1;
  }
  return 1;
};

// Signed P&L for a closed trade. Longs profit when exit > entry, shorts when
// entry > exit. Returns 0 for non-finite inputs rather than NaN so a bad
// field can never poison stored stats.
export const calculatePnL = ({
  tradeType,
  entryPrice,
  exitPrice,
  quantity,
  instrumentType,
  instrument,
}) => {
  const entry = parseFloat(entryPrice);
  const exit = parseFloat(exitPrice);
  const qty = parseFloat(quantity);
  if (!isFinite(entry) || !isFinite(exit) || !isFinite(qty)) return 0;
  const diff = tradeType === "short" ? entry - exit : exit - entry;
  return diff * qty * getContractMultiplier(instrumentType, instrument);
};
