import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

// Yahoo Finance interval mapping (4h not natively supported — use 60m and aggregate client-side)
const YF_INTERVAL_MAP: Record<string, { interval: string; range: string }> = {
  '1m':  { interval: '1m',  range: '7d' },
  '5m':  { interval: '5m',  range: '60d' },
  '15m': { interval: '15m', range: '60d' },
  '30m': { interval: '30m', range: '60d' },
  '1h':  { interval: '60m', range: '1y' },
  '4h':  { interval: '60m', range: '1y' },
  '1d':  { interval: '1d',  range: '1y' },
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const url = new URL(req.url)
    const symbol   = url.searchParams.get('symbol')
    const timeframe = url.searchParams.get('timeframe') || '30m'

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: symbol' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const cfg = YF_INTERVAL_MAP[timeframe]
    if (!cfg) {
      return new Response(
        JSON.stringify({ error: `Unsupported timeframe: ${timeframe}` }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const yfUrl =
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`

    const yfRes = await fetch(yfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (!yfRes.ok) {
      return new Response(
        JSON.stringify({ error: `Yahoo Finance returned ${yfRes.status}` }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const yfData = await yfRes.json()
    const result = yfData?.chart?.result?.[0]

    if (!result) {
      const errMsg = yfData?.chart?.error?.description || 'No data returned'
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const timestamps: number[] = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}

    // Normalize to OHLCV, filter nulls, sort ascending, deduplicate
    let candles = timestamps
      .map((t: number, i: number) => ({
        time:   t,
        open:   quote.open?.[i]   ?? null,
        high:   quote.high?.[i]   ?? null,
        low:    quote.low?.[i]    ?? null,
        close:  quote.close?.[i]  ?? null,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter((c) =>
        c.open !== null && c.high !== null && c.low !== null && c.close !== null &&
        c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
      )
      .sort((a, b) => a.time - b.time)
      .filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time)

    // Aggregate 1h bars into 4h bars when requested
    if (timeframe === '4h') {
      const out: typeof candles = []
      for (let i = 0; i < candles.length; i += 4) {
        const group = candles.slice(i, i + 4)
        if (!group.length) break
        out.push({
          time:   group[0].time,
          open:   group[0].open,
          high:   Math.max(...group.map((c) => c.high as number)),
          low:    Math.min(...group.map((c) => c.low  as number)),
          close:  group[group.length - 1].close,
          volume: group.reduce((s, c) => s + (c.volume as number), 0),
        })
      }
      candles = out
    }

    if (!candles.length) {
      return new Response(
        JSON.stringify({ error: 'No valid candles after filtering. Market may be closed.' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ candles }), {
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5-min cache
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
