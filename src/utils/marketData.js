// All market data is fetched through the Supabase Edge Function `market-data`.
// The function proxies Yahoo Finance server-side, solving the browser CORS problem.
// No additional API keys required beyond the existing Supabase setup.

import { minutesOfDayInTz, MARKET_TZ } from '../lib/signals/sessions'

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-data`

// Futures 4h candles anchor to the 18:00 ET session open (18:00, 22:00,
// 02:00, 06:00, 10:00, 14:00) — the edge function's 4h aggregation buckets on
// UTC instead, which shifts every candle. This re-aggregates 1h bars into
// session-aligned 4h bars, DST-correct via the ET clock.
export function aggregateTo4hSession(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return candles
  const buckets = new Map()
  for (const c of candles) {
    const minutesOfDay = minutesOfDayInTz(c.time, MARKET_TZ)
    const minutesSinceOpen = (minutesOfDay - 18 * 60 + 1440) % 1440
    const start = c.time - (minutesSinceOpen % 240) * 60
    const b = buckets.get(start)
    if (!b) {
      buckets.set(start, {
        time: start,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      })
    } else {
      b.high = Math.max(b.high, c.high)
      b.low = Math.min(b.low, c.low)
      b.close = c.close // candles arrive ascending, so last write wins
      b.volume += c.volume || 0
    }
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time)
}

// Yahoo Finance symbols for futures contracts
const FUTURES_YF_SYMBOL = {
  ES:  'ES=F',
  NQ:  'NQ=F',
  YM:  'YM=F',
  RTY: 'RTY=F',
  CL:  'CL=F',
}

// In-memory cache layer — the fallback when a dataset is too large for
// sessionStorage (browsers cap it around 5MB; big lower-timeframe series like
// 30m futures easily exceed it). Lives for the lifetime of the tab's JS
// context, which is the same scope sessionStorage covers in practice.
const memoryCache = new Map() // cacheKey -> { ts, candles }

// Read a cache entry: memory first, then sessionStorage.
// Returns { ts, candles } — ts is null for legacy plain-array entries.
function readCandleCache(cacheKey) {
  const mem = memoryCache.get(cacheKey)
  if (mem) return mem
  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return { ts: null, candles: parsed }
    if (parsed && Array.isArray(parsed.candles)) return parsed
  } catch { /* corrupted cache — re-fetch */ }
  return null
}

// Write a cache entry. Memory always succeeds; sessionStorage is best-effort:
// on quota errors, evict the other (oldest-first) chart caches and retry once,
// and if the dataset still doesn't fit, the memory layer alone serves this tab.
function writeCandleCache(cacheKey, entry) {
  memoryCache.set(cacheKey, entry)
  const payload = JSON.stringify(entry)
  try {
    sessionStorage.setItem(cacheKey, payload)
  } catch {
    try {
      const others = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k && k.startsWith('chart_v') && k !== cacheKey) {
          let ts = 0
          try { ts = JSON.parse(sessionStorage.getItem(k))?.ts || 0 } catch { /* legacy entry */ }
          others.push({ k, ts })
        }
      }
      others.sort((a, b) => a.ts - b.ts).forEach(({ k }) => sessionStorage.removeItem(k))
      sessionStorage.setItem(cacheKey, payload)
    } catch {
      // Still over quota — persisting is optional, the memory cache has it
    }
  }
}

// Drops a cached dataset from every cache layer (used to force a re-fetch)
export function clearCandleCache(market, symbol, timeframe) {
  const cacheKey = `chart_v2_${market}_${symbol}_${timeframe}`
  memoryCache.delete(cacheKey)
  try { sessionStorage.removeItem(cacheKey) } catch { /* storage unavailable */ }
}

// Options:
// - `maxAgeMs`: how stale the cache may be before a re-fetch. Defaults to
//   Infinity, preserving the original cache-forever behavior for existing
//   callers. Live polling passes a finite TTL.
// - `bustSeconds`: appends a time-bucket query param so the edge function's
//   5-minute CDN cache (Cache-Control: max-age=300) is bypassed once per
//   bucket. Without it, refreshing faster than 5 minutes returns the same
//   cached payload.
export async function fetchMarketCandles(market, symbol, timeframe, options = {}) {
  const { maxAgeMs = Infinity, bustSeconds } = options
  // v2: ranges extended (1h/4h → 2y, 1d → 10y) — versioned key skips stale short-history caches
  const cacheKey = `chart_v2_${market}_${symbol}_${timeframe}`
  const entry = readCandleCache(cacheKey)
  if (entry) {
    // Legacy plain-array entries have no timestamp — fresh only when maxAgeMs is Infinity
    if (entry.ts == null) {
      if (maxAgeMs === Infinity) return entry.candles
    } else if (Date.now() - entry.ts < maxAgeMs) {
      return entry.candles
    }
  }

  // Resolve the Yahoo Finance symbol
  const yfSymbol =
    market === 'futures'
      ? (FUTURES_YF_SYMBOL[symbol] || symbol)
      : symbol  // stocks pass through as-is (AAPL, MSFT, GOOGL)

  let url =
    `${EDGE_FN_URL}?symbol=${encodeURIComponent(yfSymbol)}&timeframe=${timeframe}`
  if (bustSeconds) {
    url += `&_b=${Math.floor(Date.now() / (bustSeconds * 1000))}`
  }

  // The edge function is deployed with JWT verification on — the public anon
  // key satisfies it without involving a user session.
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  let res
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    })
  } catch {
    throw new Error('Network error — check your internet connection and try again.')
  }

  const json = await res.json()

  if (!res.ok || json.error) {
    throw new Error(json.error || `Chart API error (${res.status})`)
  }

  const candles = json.candles
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error('No chart data returned. The market may be closed or the symbol is unsupported.')
  }

  writeCandleCache(cacheKey, { ts: Date.now(), candles })
  return candles
}
