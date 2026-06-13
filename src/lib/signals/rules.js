// ICT-concept ruleset (v2) — top-down per the TTrades / ICT framework:
// daily bias → daily profile → Asia/London read → SMT confluence →
// HTF expansion gate → CISD entry → OB/FVG respect.
//
// Rule schema:
// {
//   id, label, category: 'bias'|'profile'|'session'|'confluence'|'structure',
//   weight (gates use 0), direction: 'both'|'gate',
//   evaluate(ctx) => { pass, direction: 'long'|'short'|null, detail }
// }
//
// ctx is built once by engine.js:
// {
//   candles      — entry-timeframe candles (the chart timeframe; CISD/FVG live here)
//   htf          — higher-timeframe candles (choppiness gate)
//   daily        — daily candles (bias + profile targets)
//   correlated   — { SYMBOL: candles } at the entry timeframe (SMT)
//   now, swings, atr14, symbol, timeframe
// }
// Rules stay pure — `now` is injected, never Date.now().

import {
  dailyBias,
  classifyDailyProfile,
  asiaLondonRead,
  smtDivergence,
  efficiencyRatio,
  detectCISD,
  findRecentFVGs,
  midnightET,
} from "./ict";

export const RULESET_VERSION = "2.2.0";

// HTF Kaufman efficiency ratio below this = choppy → gate fails
export const HTF_EFFICIENCY_MIN = 0.25;

export const FIXED_RULESET = [
  {
    id: "daily_bias",
    label: "Daily bias (prev. day close / sweep logic)",
    category: "bias",
    direction: "both",
    weight: 3,
    evaluate: ({ daily, now }) => {
      const { bias, reason, target } = dailyBias(daily, now);
      if (!bias) return { pass: false, direction: null, detail: reason };
      const draw = target ? ` — drawing toward ${target.label} at ${target.price.toFixed(2)}` : "";
      return { pass: true, direction: bias, detail: reason + draw };
    },
  },
  {
    id: "daily_profile",
    label: "Daily profile forming (OLHC bullish / OHLC bearish)",
    category: "profile",
    direction: "both",
    weight: 1,
    evaluate: ({ candles, now }) => {
      const today = candles.filter((c) => c.time >= midnightET(now));
      const { direction, detail } = classifyDailyProfile(today);
      return { pass: direction != null, direction, detail };
    },
  },
  {
    id: "asia_london_read",
    label: "Asia/London session read (sweep & reclaim)",
    category: "session",
    direction: "both",
    weight: 1,
    evaluate: ({ candles, now }) => {
      const { direction, detail } = asiaLondonRead(candles, now);
      return { pass: direction != null, direction, detail };
    },
  },
  {
    id: "smt_divergence",
    label: "SMT divergence vs correlated markets (with the bias)",
    category: "confluence",
    direction: "both",
    weight: 1,
    evaluate: ({ candles, correlated, daily, now }) => {
      const pairs = Object.entries(correlated || {});
      if (!pairs.length) {
        return { pass: false, direction: null, detail: "No correlated market for this symbol" };
      }
      const reads = pairs.map(([sym, data]) => ({ sym, ...smtDivergence(candles, data) }));
      const hits = reads.filter((r) => r.type != null);
      if (!hits.length) {
        return { pass: false, direction: null, detail: "No SMT divergence with " + pairs.map(([s]) => s).join("/") };
      }
      // Strongest signal: every correlated market disagrees the same way
      const allAgree = hits.length === reads.length && hits.every((h) => h.type === hits[0].type);
      const lead = hits[0];
      const who = `${hits.map((h) => h.sym).join(" + ")}${allAgree && reads.length > 1 ? " — both confirm" : ""}`;

      // SMT is confirmation, not a standalone signal: in a bullish market we
      // look for bullish SMT. Against the daily bias it's a caution flag only.
      const db = daily ? dailyBias(daily, now) : { bias: null };
      if (db.bias && lead.type !== db.bias) {
        return {
          pass: false,
          direction: null,
          detail: `${lead.kind} SMT vs ${who} — but it opposes the ${db.bias === "long" ? "bullish" : "bearish"} daily bias (caution, not confluence)`,
        };
      }
      return {
        pass: true,
        direction: lead.type,
        detail: `${lead.detail} (${who})`,
      };
    },
  },
  {
    id: "htf_supports_expansion",
    label: "Higher timeframe not choppy (supports expansion)",
    category: "structure",
    direction: "gate",
    weight: 0,
    evaluate: ({ htf }) => {
      const er = efficiencyRatio(htf, 20);
      if (er == null) return { pass: false, direction: null, detail: "Higher-timeframe data unavailable" };
      const pass = er >= HTF_EFFICIENCY_MIN;
      return {
        pass,
        direction: null,
        detail: pass
          ? `HTF efficiency ${(er * 100).toFixed(0)}% — directional, expansion supported`
          : `HTF efficiency ${(er * 100).toFixed(0)}% — choppy, stand aside`,
      };
    },
  },
  {
    id: "htf_candle_model",
    label: "HTF candle 2–3–4 model (sweep → close inside → 50% respect → expansion)",
    category: "structure",
    direction: "both",
    weight: 3,
    evaluate: ({ htfModel }) => {
      if (!htfModel) return { pass: false, direction: null, detail: "Higher-timeframe data unavailable" };
      if (!htfModel.direction) return { pass: false, direction: null, detail: htfModel.detail };
      // 'swept' = formation present but candle 3 hasn't confirmed yet
      const pass = htfModel.stage === "respecting" || htfModel.stage === "expanding";
      return { pass, direction: pass ? htfModel.direction : null, detail: htfModel.detail };
    },
  },
  {
    id: "cisd_entry",
    label: "CISD on entry timeframe (body close through series open)",
    category: "structure",
    direction: "both",
    weight: 2,
    evaluate: ({ candles, htfModel }) => {
      const cisd = detectCISD(candles, 40);
      if (!cisd) return { pass: false, direction: null, detail: "No recent change in state of delivery" };
      // "The right CISD" — it must agree with the HTF candle model when one is active
      if (htfModel && htfModel.direction && cisd.direction !== htfModel.direction) {
        return {
          pass: false,
          direction: null,
          detail: `CISD found but opposes the HTF candle model — not the right CISD`,
        };
      }
      const ago = candles.length - 1 - cisd.index;
      return {
        pass: true,
        direction: cisd.direction,
        detail: `${cisd.direction === "long" ? "Bullish" : "Bearish"} CISD — close through series open ${cisd.level.toFixed(2)} (${ago} bars ago)`,
      };
    },
  },
  {
    id: "ob_fvg_respected",
    label: "FVG respected on entry timeframe",
    category: "structure",
    direction: "both",
    weight: 1,
    evaluate: ({ candles }) => {
      const fvgs = findRecentFVGs(candles, 60);
      const respected = [fvgs.bullish, fvgs.bearish].filter((f) => f && f.status === "respected");
      if (respected.length) {
        // Most recently formed respected gap wins
        respected.sort((a, b) => b.anchorTime - a.anchorTime);
        const f = respected[0];
        return {
          pass: true,
          direction: f.direction,
          detail: `${f.direction === "long" ? "Bullish" : "Bearish"} FVG ${f.priceLow.toFixed(2)}–${f.priceHigh.toFixed(2)} tested and respected`,
        };
      }
      const untested = [fvgs.bullish, fvgs.bearish].filter((f) => f && f.status === "untested");
      if (untested.length) {
        return { pass: false, direction: null, detail: "FVG present but not yet tested" };
      }
      return { pass: false, direction: null, detail: "No valid FVG — recent gaps violated or none formed" };
    },
  },
];
