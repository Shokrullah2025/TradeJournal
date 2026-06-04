import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
// Platform signatures: minimum columns required to identify the export format
// ─────────────────────────────────────────────────────────────────────────────
const SIGNATURES = {
  ninjatrader: ["Instrument", "Market pos.", "Entry price", "Exit price", "Entry time", "Exit time"],
  tradovate:   ["action", "qty", "price", "commission"],
  topstepx:    ["Symbol", "Side", "Fill Price"],
  rithmic:     ["Exchange", "B/S", "Avg Fill Price"],
};

export const PLATFORM_LABELS = {
  ninjatrader: "NinjaTrader 8",
  tradovate:   "Tradovate",
  topstepx:    "TopstepX",
  rithmic:     "Rithmic R|Trader Pro",
  generic:     "Generic CSV",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a CSV or Excel file and return normalized trades.
 * @param {File} file
 * @returns {Promise<{ trades: object[], format: string, warnings: string[] }>}
 */
export async function parseCSVFile(file) {
  const rows = await readFile(file);
  if (rows.length === 0) throw new Error("The file is empty or has no readable data.");

  const headers = Object.keys(rows[0]);
  const format  = detectFormat(headers);
  const warnings = [];

  let trades;
  switch (format) {
    case "ninjatrader": trades = normalizeNinjaTrader(rows, warnings); break;
    case "tradovate":   trades = normalizeTradovateFills(rows, warnings); break;
    case "topstepx":    trades = normalizeTopstepXFills(rows, warnings); break;
    case "rithmic":     trades = normalizeRithmicFills(rows, warnings); break;
    default:            trades = normalizeGeneric(rows, warnings);
  }

  return { trades, format, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// File reader
// ─────────────────────────────────────────────────────────────────────────────

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: "array", cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(new Error("Could not read file. Make sure it is a valid CSV or Excel file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Format detection
// ─────────────────────────────────────────────────────────────────────────────

function detectFormat(headers) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const has   = (col) => lower.includes(col.toLowerCase());

  for (const [platform, required] of Object.entries(SIGNATURES)) {
    if (required.every((col) => headers.some((h) => h.trim().toLowerCase() === col.toLowerCase()))) {
      return platform;
    }
  }

  // Secondary heuristics
  if (has("market pos.") || has("entry price") || has("exit price")) return "ninjatrader";
  if (has("action") && has("qty") && has("price"))                   return "tradovate";
  if (has("b/s") && has("exchange"))                                  return "rithmic";
  if (has("side") && has("fill price"))                               return "topstepx";

  return "generic";
}

// ─────────────────────────────────────────────────────────────────────────────
// NinjaTrader 8 — Trade Performance export
// Each row is one complete round-trip trade.
// Headers: Trade #, Instrument, Market pos., Quantity, Entry price, Exit price,
//          Entry time, Exit time, Profit, Cum. profit, Commission, MAE, MFE, ETD
// ─────────────────────────────────────────────────────────────────────────────

function normalizeNinjaTrader(rows, warnings) {
  const trades = [];

  for (const [i, row] of rows.entries()) {
    const instrument = col(row, "Instrument");
    const direction  = col(row, "Market pos.").toLowerCase().includes("long") ? "long" : "short";
    const quantity   = safeFloat(col(row, "Quantity"));
    const entryPrice = safeFloat(col(row, "Entry price"));
    const exitPrice  = safeFloat(col(row, "Exit price"));
    const entryTime  = col(row, "Entry time");
    const exitTime   = col(row, "Exit time");
    const profit     = safeFloat(col(row, "Profit"));
    const commission = safeFloat(col(row, "Commission"));
    const tradeNum   = col(row, "Trade #") || String(i + 1);

    if (!instrument || !entryPrice) {
      warnings.push(`Row ${i + 2}: skipped — missing instrument or entry price`);
      continue;
    }

    const entryISO = parseDateTime(entryTime);
    const exitISO  = parseDateTime(exitTime);

    trades.push({
      instrument:      instrument.trim(),
      instrumentType:  guessInstrumentType(instrument),
      tradeType:       direction,
      direction,
      quantity,
      entryPrice,
      exitPrice:       exitPrice || null,
      entryDate:       entryISO,
      exitDate:        exitISO || null,
      status:          exitISO ? "closed" : "open",
      pnl:             parseFloat((profit - commission).toFixed(2)),
      fees:            commission,
      strategy:        "Imported",
      notes:           `NinjaTrader import — Trade #${tradeNum}`,
      tags:            ["ninjatrader", "imported"],
      brokerTradeId:   `nt_${sanitizeId(instrument)}_${sanitizeId(entryTime)}_${tradeNum}`,
    });
  }

  return trades;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tradovate — fills/transactions export
// Each row is one fill. Pair Buy+Sell fills into round-trip trades.
// Headers: action (Buy/Sell), qty, price, commission, symbol/name, timestamp
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTradovateFills(rows, warnings) {
  const fills = rows.map((row, i) => ({
    id:         col(row, "id") || col(row, "tradeId") || String(i),
    symbol:     col(row, "symbol") || col(row, "name") || col(row, "contractId"),
    action:     col(row, "action").toLowerCase(), // "buy" | "sell"
    qty:        safeFloat(col(row, "qty")),
    price:      safeFloat(col(row, "price")),
    commission: safeFloat(col(row, "commission") || col(row, "fees")),
    time:       col(row, "timestamp") || col(row, "tradeDate"),
  })).filter((f) => f.symbol && f.qty && f.price);

  return pairFills(fills, "tradovate", warnings);
}

// ─────────────────────────────────────────────────────────────────────────────
// TopstepX — account statement CSV
// Headers: Symbol, Side (Buy/Sell), Quantity, Fill Price, Commission, DateTime, Order ID
// ─────────────────────────────────────────────────────────────────────────────

function normalizeTopstepXFills(rows, warnings) {
  const fills = rows.map((row, i) => ({
    id:         col(row, "Order ID") || col(row, "OrderId") || String(i),
    symbol:     col(row, "Symbol"),
    action:     col(row, "Side").toLowerCase(),
    qty:        safeFloat(col(row, "Quantity")),
    price:      safeFloat(col(row, "Fill Price") || col(row, "Price")),
    commission: safeFloat(col(row, "Commission")),
    time:       col(row, "DateTime") || col(row, "Date/Time") || col(row, "Time"),
  })).filter((f) => f.symbol && f.qty && f.price);

  return pairFills(fills, "topstepx", warnings);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rithmic R|Trader Pro — order history export
// Headers: Account, Symbol, Exchange, B/S, Qty, Avg Fill Price, Date, Time, Commission
// ─────────────────────────────────────────────────────────────────────────────

function normalizeRithmicFills(rows, warnings) {
  const fills = rows.map((row, i) => {
    const date = col(row, "Date");
    const time = col(row, "Time");
    return {
      id:         col(row, "Fill ID") || col(row, "Order Num") || String(i),
      symbol:     col(row, "Symbol"),
      action:     (col(row, "B/S") || col(row, "Side")).toLowerCase(),
      qty:        safeFloat(col(row, "Qty")),
      price:      safeFloat(col(row, "Avg Fill Price") || col(row, "Price")),
      commission: safeFloat(col(row, "Commission")),
      time:       date && time ? `${date} ${time}` : date || time,
    };
  }).filter((f) => f.symbol && f.qty && f.price);

  return pairFills(fills, "rithmic", warnings);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fallback — flexible column matching for any trade-like CSV
// ─────────────────────────────────────────────────────────────────────────────

function normalizeGeneric(rows, warnings) {
  const trades = [];

  for (const [i, row] of rows.entries()) {
    const instrument = colAny(row, ["Instrument", "Symbol", "Ticker", "Contract", "instrument", "symbol"]);
    const entryPrice = safeFloat(colAny(row, ["Entry Price", "EntryPrice", "entry_price", "Buy Price", "Open Price"]));
    const quantity   = safeFloat(colAny(row, ["Quantity", "Qty", "Size", "quantity", "qty"]));
    const entryDate  = colAny(row, ["Entry Date", "EntryDate", "Date", "entry_date", "Open Date", "DateTime", "Trade Date", "TradeDate", "Timestamp", "Time", "Open Time", "Close Date", "Fill Date", "Execution Date"]);

    if (!instrument || !entryPrice || !quantity || !entryDate) {
      warnings.push(`Row ${i + 2}: skipped — missing instrument, entry price, quantity, or date`);
      continue;
    }

    const exitPrice  = safeFloat(colAny(row, ["Exit Price", "ExitPrice", "exit_price", "Sell Price", "Close Price"]));
    const exitDate   = colAny(row, ["Exit Date", "ExitDate", "exit_date", "Close Date"]);
    const pnl        = safeFloat(colAny(row, ["P/L", "PnL", "Profit", "Net P&L", "Realized P/L", "pnl"]));
    const commission = safeFloat(colAny(row, ["Commission", "Fees", "commission", "fees"]));
    const direction  = inferDirection(colAny(row, ["Side", "Direction", "Type", "B/S", "Action", "Market pos."]));

    const entryISO = parseDateTime(String(entryDate));
    const exitISO  = exitDate ? parseDateTime(String(exitDate)) : null;

    trades.push({
      instrument:     instrument.trim(),
      instrumentType: guessInstrumentType(instrument),
      tradeType:      direction,
      direction,
      quantity,
      entryPrice,
      exitPrice:      exitPrice || null,
      entryDate:      entryISO,
      exitDate:       exitISO,
      status:         exitISO ? "closed" : "open",
      pnl:            pnl || 0,
      fees:           commission,
      strategy:       colAny(row, ["Strategy", "strategy"]) || "Imported",
      notes:          colAny(row, ["Notes", "notes", "Comments"]) || "",
      tags:           ["csv-import", "imported"],
      brokerTradeId:  `generic_${sanitizeId(instrument)}_${sanitizeId(String(entryDate))}_${i}`,
    });
  }

  return trades;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fill pairing — converts individual fill rows into round-trip trades
// Strategy: group by symbol, sort by time, FIFO pair buys with sells
// ─────────────────────────────────────────────────────────────────────────────

function pairFills(fills, source, warnings) {
  const bySymbol = {};
  for (const fill of fills) {
    const sym = (fill.symbol || "UNKNOWN").trim();
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(fill);
  }

  const trades = [];

  for (const [symbol, symFills] of Object.entries(bySymbol)) {
    const sorted = [...symFills].sort((a, b) =>
      new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime()
    );

    const buyQueue  = [];
    const sellQueue = [];

    for (const fill of sorted) {
      const side = fill.action;
      if (side === "buy" || side === "b") {
        buyQueue.push(fill);
      } else if (side === "sell" || side === "s") {
        sellQueue.push(fill);
      }
    }

    // Pair oldest buy with oldest sell
    const count = Math.min(buyQueue.length, sellQueue.length);
    if (buyQueue.length !== sellQueue.length) {
      warnings.push(`${symbol}: ${Math.abs(buyQueue.length - sellQueue.length)} fill(s) could not be paired (odd number of fills)`);
    }

    for (let i = 0; i < count; i++) {
      const buy  = buyQueue[i];
      const sell = sellQueue[i];

      // Determine entry/exit from order of fills
      const buyTime  = new Date(buy.time  || 0).getTime();
      const sellTime = new Date(sell.time || 0).getTime();
      const isLong   = buyTime <= sellTime;

      const entry = isLong ? buy  : sell;
      const exit  = isLong ? sell : buy;
      const direction = isLong ? "long" : "short";

      const qty       = Math.min(entry.qty, exit.qty);
      const rawPnl    = isLong
        ? (exit.price - entry.price) * qty
        : (entry.price - exit.price) * qty;
      const totalFees = (entry.commission || 0) + (exit.commission || 0);

      const entryISO = parseDateTime(String(entry.time));
      const exitISO  = parseDateTime(String(exit.time));

      trades.push({
        instrument:     symbol,
        instrumentType: guessInstrumentType(symbol),
        tradeType:      direction,
        direction,
        quantity:       qty,
        entryPrice:     entry.price,
        exitPrice:      exit.price,
        entryDate:      entryISO,
        exitDate:       exitISO,
        status:         "closed",
        pnl:            parseFloat((rawPnl - totalFees).toFixed(2)),
        fees:           totalFees,
        strategy:       "Imported",
        notes:          `${PLATFORM_LABELS[source] || source} import`,
        tags:           [source, "imported"],
        brokerTradeId:  `${source}_${sanitizeId(symbol)}_${sanitizeId(String(entry.time))}_${entry.id}`,
      });
    }
  }

  return trades;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Case-insensitive column getter — preserves XLSX Date objects as ISO strings
function col(row, name) {
  const key = Object.keys(row).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  if (!key) return "";
  const val = row[key];
  if (val instanceof Date) return val.toISOString();
  return String(val ?? "").trim();
}

// Try multiple column name variations
function colAny(row, names) {
  for (const name of names) {
    const val = col(row, name);
    if (val !== "") return val;
  }
  return "";
}

function safeFloat(val) {
  if (val === "" || val == null) return 0;
  const n = parseFloat(String(val).replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDateTime(raw) {
  if (!raw || raw === "") return new Date().toISOString();

  // Already a proper ISO string (from XLSX Date object via col())
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  const str = String(raw).trim();

  // Try native parse first (handles ISO, RFC 2822, many locale strings)
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();

  // MM/DD/YYYY or M/D/YYYY with optional HH:MM:SS or HH:MM:SS AM/PM
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(.+))?$/);
  if (mdy) {
    const [, m, day, y, time] = mdy;
    d = new Date(`${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}${time ? " " + time : ""}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // DD/MM/YYYY (European) — only when day > 12 so it can't be MM/DD
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(.+))?$/);
  if (dmy) {
    const [, day, m, y, time] = dmy;
    if (parseInt(day, 10) > 12) {
      d = new Date(`${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}${time ? " " + time : ""}`);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // DD-MM-YYYY or YYYY-MM-DD without T
  const dashDate = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(.+))?$/);
  if (dashDate) {
    const [, y, m, day, time] = dashDate;
    d = new Date(`${y}-${m}-${day}${time ? "T" + time : "T00:00:00"}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // YYYYMMDD compact
  const compact = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const [, y, m, day] = compact;
    d = new Date(`${y}-${m}-${day}T00:00:00`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return new Date().toISOString();
}

function sanitizeId(str) {
  return String(str || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
}

function inferDirection(val) {
  if (!val) return "long";
  const v = val.toLowerCase();
  if (v.includes("sell") || v.includes("short") || v === "s") return "short";
  return "long";
}

// Guess instrument type from the symbol string
function guessInstrumentType(symbol) {
  if (!symbol) return "futures";
  const s = symbol.toUpperCase();

  // Common futures root symbols
  const futuresRoots = ["ES", "NQ", "YM", "RTY", "CL", "NG", "GC", "SI", "ZB", "ZN", "ZF", "ZT", "6E", "6J", "6B", "MES", "MNQ", "MCL", "MGC"];
  if (futuresRoots.some((r) => s.startsWith(r) || s === r)) return "futures";

  // Forex pairs (6 chars, two 3-char currency codes)
  if (/^[A-Z]{6}$/.test(s)) return "forex";

  // Crypto
  if (s.includes("BTC") || s.includes("ETH") || s.includes("USDT") || s.includes("USD") && s.length < 8) {
    if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL")) return "crypto";
  }

  // Default: futures (for prop firm traders this is the most common)
  return "futures";
}
