// All market data is fetched through the Supabase Edge Function `market-data`.
// The function proxies Yahoo Finance server-side, solving the browser CORS problem.
// No additional API keys required beyond the existing Supabase setup.

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-data`

// Yahoo Finance symbols for futures contracts
const FUTURES_YF_SYMBOL = {
  ES:  'ES=F',
  NQ:  'NQ=F',
  YM:  'YM=F',
  RTY: 'RTY=F',
  CL:  'CL=F',
}

export async function fetchMarketCandles(market, symbol, timeframe) {
  const cacheKey = `chart_${market}_${symbol}_${timeframe}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* corrupted cache — re-fetch */ }
  }

  // Resolve the Yahoo Finance symbol
  const yfSymbol =
    market === 'futures'
      ? (FUTURES_YF_SYMBOL[symbol] || symbol)
      : symbol  // stocks pass through as-is (AAPL, MSFT, GOOGL)

  const url =
    `${EDGE_FN_URL}?symbol=${encodeURIComponent(yfSymbol)}&timeframe=${timeframe}`

  let res
  try {
    res = await fetch(url)
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

  sessionStorage.setItem(cacheKey, JSON.stringify(candles))
  return candles
}
