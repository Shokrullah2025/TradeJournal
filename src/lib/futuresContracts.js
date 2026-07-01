// Canonical futures contract specifications for the AI Analysis signal page.
// tickSize is the minimum price increment; tickValue is the dollar value of one
// tick for one contract. `yahoo` is the Yahoo Finance continuous-contract
// symbol used by the market-data Edge Function.
//
// NOTE: src/pages/RiskCalculator.jsx keeps its own inline preset list with the
// same numbers. Consolidating it onto this module is a separate cleanup —
// don't let the two drift when editing specs.

export const FUTURES_CONTRACTS = [
  { symbol: "ES",  name: "E-mini S&P 500",        group: "Indices", yahoo: "ES=F",  tickSize: 0.25,     tickValue: 12.5 },
  { symbol: "NQ",  name: "E-mini Nasdaq-100",     group: "Indices", yahoo: "NQ=F",  tickSize: 0.25,     tickValue: 5 },
  { symbol: "YM",  name: "E-mini Dow",            group: "Indices", yahoo: "YM=F",  tickSize: 1,        tickValue: 5 },
  { symbol: "RTY", name: "E-mini Russell 2000",   group: "Indices", yahoo: "RTY=F", tickSize: 0.1,      tickValue: 5 },
  { symbol: "MES", name: "Micro E-mini S&P 500",  group: "Indices", yahoo: "MES=F", tickSize: 0.25,     tickValue: 1.25 },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq",   group: "Indices", yahoo: "MNQ=F", tickSize: 0.25,     tickValue: 0.5 },
  { symbol: "CL",  name: "Crude Oil",             group: "Energy",  yahoo: "CL=F",  tickSize: 0.01,     tickValue: 10 },
  { symbol: "NG",  name: "Natural Gas",           group: "Energy",  yahoo: "NG=F",  tickSize: 0.001,    tickValue: 10 },
  { symbol: "GC",  name: "Gold",                  group: "Metals",  yahoo: "GC=F",  tickSize: 0.1,      tickValue: 10 },
  { symbol: "SI",  name: "Silver",                group: "Metals",  yahoo: "SI=F",  tickSize: 0.005,    tickValue: 25 },
  { symbol: "ZB",  name: "30-Year T-Bond",        group: "Bonds",   yahoo: "ZB=F",  tickSize: 0.03125,  tickValue: 31.25 },
  { symbol: "ZN",  name: "10-Year T-Note",        group: "Bonds",   yahoo: "ZN=F",  tickSize: 0.015625, tickValue: 15.625 },
  { symbol: "6E",  name: "Euro FX",               group: "FX",      yahoo: "6E=F",  tickSize: 0.00005,  tickValue: 6.25 },
];

export function getContract(symbol) {
  return FUTURES_CONTRACTS.find((c) => c.symbol === symbol) || null;
}

/** Rounds a price to the contract's tick grid. Guards against float drift. */
export function roundToTick(price, tickSize) {
  if (!Number.isFinite(price) || !Number.isFinite(tickSize) || tickSize <= 0) return price;
  const ticks = Math.round(price / tickSize);
  // Snap to the tick's own decimal precision so 0.1-tick instruments don't
  // render as 5140.700000000001 and 1/32 bond ticks keep all five decimals.
  const decimals = Math.min(10, (String(tickSize).split(".")[1] || "").length);
  return Number((ticks * tickSize).toFixed(decimals));
}

/**
 * Fixed-fractional futures position sizing — same formula as the Risk
 * Calculator page: risk budget = balance × risk%, contracts = how many whole
 * contracts fit that budget given the stop distance in ticks.
 *
 * Returns null when inputs are invalid (non-finite, non-positive balance/prices,
 * or a zero-distance stop). `overRisk` means even one contract loses more than
 * the chosen budget.
 */
export function positionSize({ accountBalance, riskPct, entry, stopLoss, tickSize, tickValue }) {
  const valid = (v) => Number.isFinite(v) && v > 0;
  if (
    !valid(accountBalance) ||
    !Number.isFinite(riskPct) || riskPct <= 0 || riskPct > 100 ||
    !valid(entry) || !valid(stopLoss) || entry === stopLoss ||
    !valid(tickSize) || !valid(tickValue)
  ) {
    return null;
  }

  const riskAmount = (accountBalance * riskPct) / 100;
  const stopTicks = Math.abs(entry - stopLoss) / tickSize;
  const riskPerContract = stopTicks * tickValue;
  const contracts = Math.floor(riskAmount / riskPerContract);
  const maxLoss = -(riskPerContract * contracts);

  return {
    contracts,
    riskAmount,
    stopTicks,
    riskPerContract,
    maxLoss,
    overRisk: contracts === 0,
  };
}
