export const RR_MODES = {
  ratio: {
    label: "Ratio",
    hint: "Classic risk:reward — works in any market",
    unit: "",
    storageKey: "tradeJournalRR_ratio",
    defaults: ["1:1", "1:1.5", "1:2", "1:2.5", "1:3", "1:4", "1:5", "2:1", "3:1"],
    placeholder: "e.g. 1:2.5",
  },
  account_pct: {
    label: "Account %",
    hint: "% of account risked vs. target — all markets",
    unit: "%",
    storageKey: "tradeJournalRR_accountPct",
    defaults: ["0.5%→1%", "1%→2%", "1%→3%", "1.5%→3%", "2%→4%", "2%→6%", "3%→6%"],
    placeholder: "e.g. 1%→3%",
  },
  dollar: {
    label: "Dollar ($)",
    hint: "Dollar amount at risk vs. reward — Stocks, Options, Crypto",
    unit: "$",
    storageKey: "tradeJournalRR_dollar",
    defaults: ["$50→$100", "$100→$200", "$100→$300", "$150→$300", "$200→$400", "$500→$1000"],
    placeholder: "e.g. $150→$300",
  },
  pips: {
    label: "Pips",
    hint: "Pips risked vs. targeted — Forex",
    unit: "pips",
    storageKey: "tradeJournalRR_pips",
    defaults: ["10→20 pips", "10→30 pips", "15→30 pips", "20→40 pips", "20→60 pips", "30→60 pips"],
    placeholder: "e.g. 15→45",
  },
  ticks: {
    label: "Ticks",
    hint: "Ticks risked vs. targeted — Futures",
    unit: "ticks",
    storageKey: "tradeJournalRR_ticks",
    defaults: ["2→4 ticks", "2→6 ticks", "4→8 ticks", "4→12 ticks", "6→12 ticks", "8→16 ticks"],
    placeholder: "e.g. 4→12",
  },
  points: {
    label: "Points",
    hint: "Points risked vs. targeted — Indices, Futures",
    unit: "pts",
    storageKey: "tradeJournalRR_points",
    defaults: ["5→10 pts", "5→15 pts", "10→20 pts", "10→30 pts", "20→40 pts", "25→50 pts"],
    placeholder: "e.g. 8→24",
  },
  shares: {
    label: "Shares",
    hint: "Share-based risk — Stocks",
    unit: "sh",
    storageKey: "tradeJournalRR_shares",
    defaults: ["25→50 sh", "50→100 sh", "50→150 sh", "100→200 sh", "100→300 sh"],
    placeholder: "e.g. 50→150",
  },
};

// Auto-suggest mode order based on instrument type
export const SUGGESTED_MODES = {
  stocks:  ["ratio", "dollar", "shares",  "account_pct"],
  options: ["ratio", "dollar",            "account_pct"],
  forex:   ["pips",  "account_pct", "ratio", "dollar"],
  futures: ["ticks", "points", "dollar",  "account_pct", "ratio"],
  crypto:  ["ratio", "dollar",            "account_pct"],
};

export const getDefaultModeForInstrument = (instrumentType) => {
  if (!instrumentType) return "ratio";
  const key = instrumentType.toLowerCase();
  return (SUGGESTED_MODES[key] || ["ratio"])[0];
};

/**
 * Parse any supported R:R string and return { risk, reward } numbers.
 * Used by auto-calculation logic.
 */
export const parseRRValue = (value) => {
  if (!value) return null;
  // "1:2" ratio format
  if (/^\d/.test(value) && value.includes(":")) {
    const [r, w] = value.split(":").map(Number);
    if (!isNaN(r) && !isNaN(w)) return { risk: r, reward: w };
  }
  // Arrow format: extracts the two numbers regardless of units
  const m = value.match(/([\d.]+)[^→]*→[^0-9]*([\d.]+)/);
  if (m) return { risk: parseFloat(m[1]), reward: parseFloat(m[2]) };
  return null;
};

export const getUserRRList = (mode) => {
  const key = RR_MODES[mode]?.storageKey;
  if (!key) return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [...(RR_MODES[mode]?.defaults ?? [])];
  } catch {
    return [...(RR_MODES[mode]?.defaults ?? [])];
  }
};

export const saveUserRRList = (mode, list) => {
  const key = RR_MODES[mode]?.storageKey;
  if (key) localStorage.setItem(key, JSON.stringify(list));
};
