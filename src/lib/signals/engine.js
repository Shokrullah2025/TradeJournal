// Signal engine: validates candles, builds the ICT rule context once,
// evaluates the ruleset, and derives a directional bias + buy/sell zones.
// Pure and deterministic — same datasets + now → same result.

import { z } from "zod";
import { calcATR, findSwings, lastSwingHigh, lastSwingLow } from "./indicators";
import { findRecentFVGs, dailyBias, asiaLondonRead, smtDivergence, ttradesFractal, detectCISD } from "./ict";
import { FIXED_RULESET, RULESET_VERSION } from "./rules";

export const CandleSchema = z.object({
  time: z.number().int().positive(),
  open: z.number().finite().positive(),
  high: z.number().finite().positive(),
  low: z.number().finite().positive(),
  close: z.number().finite().positive(),
  volume: z.number().finite().nonnegative().optional().default(0),
});

// Engine needs warm-up on the entry timeframe
export const MIN_CANDLES = 60;
export const CandlesSchema = z.array(CandleSchema).min(MIN_CANDLES);

// Long wins only if its weighted votes beat short by this margin (and vice versa)
export const MIN_VOTE_MARGIN = 2;
// Fallback zone half-height as a multiple of ATR(14) when no FVG exists
export const ZONE_ATR_MULT = 0.5;

/**
 * Evaluates the ICT ruleset.
 *
 * @param {object} datasets
 * @param {Array}  datasets.entry      - entry-timeframe candles (required, validated)
 * @param {Array}  [datasets.htf]      - higher-timeframe candles (choppiness gate)
 * @param {Array}  [datasets.daily]    - daily candles (daily bias)
 * @param {object} [datasets.correlated] - { SYMBOL: candles } at entry timeframe (SMT)
 * @param {number} now - unix seconds (injected, never Date.now() internally)
 */
export function evaluateRuleset(datasets, now, config = {}) {
  const {
    ruleset = FIXED_RULESET,
    evalWindow = 300,
    zoneAtrMult = ZONE_ATR_MULT,
  } = config;

  const parsed = CandlesSchema.safeParse((datasets.entry || []).slice(-evalWindow));
  if (!parsed.success) {
    throw new Error(
      `Not enough valid chart data to analyze (need at least ${MIN_CANDLES} candles).`
    );
  }
  const data = parsed.data;
  const lastIndex = data.length - 1;

  const ctx = {
    candles: data,
    last: data[lastIndex],
    now,
    htf: datasets.htf || null,
    htfModel: datasets.htf ? ttradesFractal(datasets.htf) : null,
    daily: datasets.daily || null,
    correlated: datasets.correlated || {},
    atr14: calcATR(data, 14),
    swings: findSwings(data, 5),
    timeframe: config.timeframe ?? null,
    symbol: config.symbol ?? null,
  };

  const results = ruleset.map((rule) => {
    let outcome;
    try {
      outcome = rule.evaluate(ctx);
    } catch {
      outcome = { pass: false, direction: null, detail: "Rule evaluation failed" };
    }
    return {
      id: rule.id,
      label: rule.label,
      category: rule.category,
      weight: rule.weight,
      ruleDirection: rule.direction,
      pass: !!outcome.pass,
      direction: outcome.direction ?? null,
      detail: outcome.detail ?? "",
    };
  });

  const gated = results.some((r) => r.ruleDirection === "gate" && !r.pass);

  let longVotes = 0;
  let shortVotes = 0;
  for (const r of results) {
    if (!r.pass || r.ruleDirection === "gate") continue;
    if (r.direction === "long") longVotes += r.weight;
    else if (r.direction === "short") shortVotes += r.weight;
  }

  let bias = "neutral";
  if (!gated) {
    if (longVotes >= shortVotes + MIN_VOTE_MARGIN) bias = "long";
    else if (shortVotes >= longVotes + MIN_VOTE_MARGIN) bias = "short";
  }

  // Zones: prefer live (non-violated) FVGs on the entry timeframe; fall back
  // to last confirmed swing ± ATR buffer. Both zones are context, not orders.
  const zones = [];
  const fvgs = findRecentFVGs(data, 60);
  const atr = ctx.atr14[lastIndex];

  if (fvgs.bullish && fvgs.bullish.status !== "violated") {
    zones.push({
      id: "buy_zone",
      side: "buy",
      priceLow: fvgs.bullish.priceLow,
      priceHigh: fvgs.bullish.priceHigh,
      anchorTime: fvgs.bullish.anchorTime,
      basis: `Bullish FVG (${fvgs.bullish.status})`,
    });
  } else if (atr != null) {
    const swingLow = lastSwingLow(ctx.swings);
    if (swingLow) {
      zones.push({
        id: "buy_zone",
        side: "buy",
        priceLow: swingLow.price - atr * zoneAtrMult,
        priceHigh: swingLow.price + atr * zoneAtrMult,
        anchorTime: swingLow.time,
        basis: `Swing low ${swingLow.price.toFixed(2)} ± ${zoneAtrMult}×ATR`,
      });
    }
  }

  if (fvgs.bearish && fvgs.bearish.status !== "violated") {
    zones.push({
      id: "sell_zone",
      side: "sell",
      priceLow: fvgs.bearish.priceLow,
      priceHigh: fvgs.bearish.priceHigh,
      anchorTime: fvgs.bearish.anchorTime,
      basis: `Bearish FVG (${fvgs.bearish.status})`,
    });
  } else if (atr != null) {
    const swingHigh = lastSwingHigh(ctx.swings);
    if (swingHigh) {
      zones.push({
        id: "sell_zone",
        side: "sell",
        priceLow: swingHigh.price - atr * zoneAtrMult,
        priceHigh: swingHigh.price + atr * zoneAtrMult,
        anchorTime: swingHigh.time,
        basis: `Swing high ${swingHigh.price.toFixed(2)} ± ${zoneAtrMult}×ATR`,
      });
    }
  }

  return {
    bias,
    score: results.filter((r) => r.pass).length,
    total: results.length,
    gated,
    longVotes,
    shortVotes,
    results,
    zones,
    overlays: buildOverlays(ctx),
    rulesetVersion: RULESET_VERSION,
    evaluatedAt: now,
    lastCandleTime: ctx.last.time,
  };
}

/**
 * Chart drawing data derived from the same detectors the rules use:
 *  - drawOnLiquidity: daily-bias target level ("where price is heading")
 *  - asia: Asia session high/low with the time span they cover
 *  - sweep: the candle where London took an Asia extreme
 *  - smt: the traded symbol's two diverging swings + which market disagreed
 */
function buildOverlays(ctx) {
  const overlays = {
    drawOnLiquidity: null,
    asia: null,
    london: null,
    sweep: null,
    smt: null,
    cisd: null,
  };

  if (ctx.daily) {
    const db = dailyBias(ctx.daily, ctx.now);
    if (db.target) {
      overlays.drawOnLiquidity = {
        price: db.target.price,
        label: "Draw on liquidity",
        direction: db.bias,
      };
    }
  }

  const al = asiaLondonRead(ctx.candles, ctx.now);
  overlays.asia = al.asia;
  overlays.london = al.london;
  overlays.sweep = al.sweep;

  const cisd = detectCISD(ctx.candles, 40);
  if (cisd) {
    overlays.cisd = {
      level: cisd.level,
      direction: cisd.direction,
      from: cisd.seriesStartTime,
      at: cisd.time,
    };
  }

  // Same iteration order as the SMT rule, so the drawn divergence matches
  // the checklist read.
  for (const [sym, data] of Object.entries(ctx.correlated)) {
    const s = smtDivergence(ctx.candles, data);
    if (s.type && s.points) {
      overlays.smt = { direction: s.type, points: s.points, vs: sym, kind: s.kind };
      break;
    }
  }

  return overlays;
}
