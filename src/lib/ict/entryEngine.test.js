import { describe, it, expect } from "vitest";
import {
  splitForming4h,
  buildBucketIndex,
  checkSmtAgreement,
  buildTradePlan,
  computeSetupState,
  ENTRY_WINDOW_15M_BARS,
  H4_SECONDS,
} from "./entryEngine";
import { buildObTimeline } from "./orderBlocks";

const H4 = H4_SECONDS;
const candle = (t, o, h, l, c) => ({ time: t, open: o, high: h, low: l, close: c, volume: 100 });

describe("splitForming4h", () => {
  const buckets = [candle(0, 1, 2, 0, 1), candle(H4, 1, 2, 0, 1)];
  it("splits off a partial last bucket", () => {
    // last 1h source bar starts 1h into the second bucket → bucket incomplete
    const r = splitForming4h(buckets, H4 + 3600);
    expect(r.completed).toHaveLength(1);
    expect(r.forming.time).toBe(H4);
  });
  it("keeps a complete last bucket", () => {
    const r = splitForming4h(buckets, H4 + 3 * 3600); // 4th hour of the bucket present
    expect(r.completed).toHaveLength(2);
    expect(r.forming).toBeNull();
  });
});

describe("checkSmtAgreement", () => {
  const sib = buildBucketIndex([candle(0, 100, 102, 99, 101), candle(H4, 101, 102, 98, 99), candle(2 * H4, 99, 100, 98, 99)]);
  it("agrees when the sibling bucket closes with the bias", () => {
    expect(checkSmtAgreement({ direction: "long", bucketTime: 0, siblingByTime: sib, hasPair: true }).status).toBe("agree");
    expect(checkSmtAgreement({ direction: "short", bucketTime: H4, siblingByTime: sib, hasPair: true }).status).toBe("agree");
  });
  it("disagrees on an opposite close and on a doji", () => {
    expect(checkSmtAgreement({ direction: "long", bucketTime: H4, siblingByTime: sib, hasPair: true }).status).toBe("disagree");
    expect(checkSmtAgreement({ direction: "long", bucketTime: 2 * H4, siblingByTime: sib, hasPair: true }).status).toBe("disagree");
  });
  it("no-data when the bucket is missing; no-pair waives", () => {
    expect(checkSmtAgreement({ direction: "long", bucketTime: 999, siblingByTime: sib, hasPair: true }).status).toBe("no-data");
    expect(checkSmtAgreement({ direction: "long", bucketTime: 999, siblingByTime: null, hasPair: false }).status).toBe("no-pair");
  });
});

describe("buildTradePlan", () => {
  const ob = { direction: "long", zoneLow: 96, zoneHigh: 101 };
  const es = { tickSize: 0.25, tickValue: 12.5 };
  const levels = { pdh: 110, pdl: 90, pwh: 120, pwl: 85 };
  const args = { direction: "long", ob, atrAtConfirm: 4, entryPrice: 102, entrySource: "15m-open", levels, contract: es };

  it("targets the prior-day high with a tick-rounded ATR-buffered stop", () => {
    const p = buildTradePlan(args);
    expect(p.ok).toBe(true);
    // stop = 96 − 0.4 = 95.6 → tick-rounded to 95.5
    expect(p.stop).toBe(95.5);
    expect(p.target).toBe(110);
    expect(p.targetLabel).toBe("pdh");
    expect(p.rr).toBeCloseTo((110 - 102) / (102 - 95.5), 10);
  });

  it("falls to the prior-week high when price already cleared the pdh", () => {
    // A tighter OB right under price keeps the risk small enough to pass MIN_RR.
    const nearOb = { direction: "long", zoneLow: 108, zoneHigh: 110 };
    const p = buildTradePlan({ ...args, ob: nearOb, entryPrice: 111 });
    expect(p.ok).toBe(true);
    expect(p.targetLabel).toBe("pwh");
    expect(p.target).toBe(120);
  });

  it("skips with no-target when both draws are behind price", () => {
    const p = buildTradePlan({ ...args, entryPrice: 121 });
    expect(p).toMatchObject({ ok: false, skipReason: "no-target" });
  });

  it("skips a sub-1R trade", () => {
    // entry 106: risk 106−95.5 = 10.5, reward 110−106 = 4 → rr < 1
    const p = buildTradePlan({ ...args, entryPrice: 106 });
    expect(p).toMatchObject({ ok: false, skipReason: "min-rr" });
  });

  it("mirrors for shorts", () => {
    const sob = { direction: "short", zoneLow: 103, zoneHigh: 108 };
    const p = buildTradePlan({
      direction: "short", ob: sob, atrAtConfirm: 4, entryPrice: 101,
      entrySource: "15m-open", levels, contract: es,
    });
    expect(p.ok).toBe(true);
    expect(p.stop).toBe(108.5); // 108 + 0.4 → 108.4 → tick 108.5
    expect(p.target).toBe(90);
    expect(p.targetLabel).toBe("pdl");
  });

  it("skips without levels or with a stop on the wrong side", () => {
    expect(buildTradePlan({ ...args, levels: null })).toMatchObject({ ok: false, skipReason: "no-levels" });
    expect(buildTradePlan({ ...args, entryPrice: 95 })).toMatchObject({ ok: false, skipReason: "bad-stop" });
  });
});

describe("computeSetupState", () => {
  // A completed 4H history with a bullish OB and a rejection close today.
  // Time base: pick a Tuesday 2026-06-16; bucket at 10:00 ET = 14:00 UTC.
  const T0 = Math.floor(Date.parse("2026-06-15T22:00:00Z") / 1000); // Mon 18:00 ET bucket
  const quiet = (count, start) =>
    Array.from({ length: count }, (_, k) => candle(T0 + (start + k) * H4, 100, 101, 99, 100));

  function scenario() {
    const candles4h = [
      ...quiet(20, 0),
      candle(T0 + 20 * H4, 100, 101, 96, 97),   // OB zone [96, 101]
      candle(T0 + 21 * H4, 97, 106, 96.5, 105), // displacement
      candle(T0 + 22 * H4, 105, 105.5, 100, 104), // taps zone (low 100 ≤ 101), closes 104 > 101, upper half? mid 102.75, close>open? 104<105 NO...
    ];
    return candles4h;
  }

  // Rejection candle must be bullish: open 101.5, high 105, low 100, close 104.5
  const confirmBar = (t) => candle(t, 101.5, 105, 100, 104.5);

  // pdh far enough above the entry (~104.75, stop ~95.5) to clear MIN_RR
  const levels = { pdh: 118, pdl: 88, pwh: 126, pwl: 82 };
  const es = { tickSize: 0.25, tickValue: 12.5 };
  const bias = { bias: "long" };

  function build({ withConfirm = true, siblingAgrees = true, hasPair = true, missingSibling = false, m15 = true } = {}) {
    const candles4h = scenario().slice(0, withConfirm ? 22 : 23);
    if (withConfirm) candles4h.push(confirmBar(T0 + 22 * H4));
    const obTimeline = buildObTimeline(candles4h, { atr14: new Array(candles4h.length).fill(4) });
    const confirmTime = T0 + 22 * H4;
    const entryTime = confirmTime + H4;
    const siblingByTime = missingSibling
      ? buildBucketIndex([])
      : buildBucketIndex([
          candle(confirmTime, 200, siblingAgrees ? 210 : 200, siblingAgrees ? 199 : 190, siblingAgrees ? 208 : 192),
        ]);
    const m15Candles = m15
      ? [candle(entryTime, 104.75, 105, 104.4, 104.8), candle(entryTime + 900, 104.8, 105.2, 104.6, 105)]
      : null;
    return { candles4h, obTimeline, siblingByTime, m15Candles, entryTime, confirmTime };
  }

  it("NO_BIAS on neutral", () => {
    const { candles4h, obTimeline } = build();
    const s = computeSetupState({
      bias: { bias: "neutral" }, candles4h, forming4h: null, obTimeline,
      siblingByTime: null, hasPair: false, m15Candles: null, levels, contract: es, now: 0,
    });
    expect(s.state).toBe("NO_BIAS");
  });

  it("WAITING_FOR_OB when no bias-side OB is in play", () => {
    const candles4h = quiet(30, 0);
    const obTimeline = buildObTimeline(candles4h, { atr14: new Array(30).fill(4) });
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline,
      siblingByTime: null, hasPair: false, m15Candles: null, levels, contract: es,
      now: T0 + 30 * H4,
    });
    expect(s.state).toBe("WAITING_FOR_OB");
  });

  it("WAITING_FOR_TAP with an OB in play and price away from the zone", () => {
    const { candles4h, obTimeline } = build({ withConfirm: false });
    const s = computeSetupState({
      bias, candles4h, forming4h: candle(T0 + 23 * H4, 104, 105, 103, 104.5), obTimeline,
      siblingByTime: null, hasPair: false, m15Candles: null, levels, contract: es,
      now: T0 + 23 * H4 + 600,
    });
    expect(s.state).toBe("WAITING_FOR_TAP");
    expect(s.ob).not.toBeNull();
  });

  it("AWAITING_CONFIRMATION when the forming 4H is inside the zone", () => {
    const { candles4h, obTimeline } = build({ withConfirm: false });
    const s = computeSetupState({
      bias, candles4h, forming4h: candle(T0 + 23 * H4, 104, 104.5, 100.5, 101.5), obTimeline,
      siblingByTime: null, hasPair: false, m15Candles: null, levels, contract: es,
      now: T0 + 23 * H4 + 600,
    });
    expect(s.state).toBe("AWAITING_CONFIRMATION");
  });

  it("SETUP_ACTIVE with plan when confirmed and the pair agrees", () => {
    const { candles4h, obTimeline, siblingByTime, m15Candles, entryTime } = build();
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime, hasPair: true,
      m15Candles, levels, contract: es, now: entryTime + 600,
    });
    expect(s.state).toBe("SETUP_ACTIVE");
    expect(s.plan.ok).toBe(true);
    expect(s.plan.entrySource).toBe("15m-open");
    expect(s.plan.entry).toBe(104.75); // first 15m open, already on the tick grid
    expect(s.smt.status).toBe("agree");
    expect(s.activeUntil).toBe(entryTime + ENTRY_WINDOW_15M_BARS * 900);
  });

  it("SMT_BLOCKED when the pair disagrees, and when its bucket is missing", () => {
    const a = build({ siblingAgrees: false });
    const s1 = computeSetupState({
      bias, candles4h: a.candles4h, forming4h: null, obTimeline: a.obTimeline,
      siblingByTime: a.siblingByTime, hasPair: true, m15Candles: a.m15Candles,
      levels, contract: es, now: a.entryTime + 600,
    });
    expect(s1.state).toBe("SMT_BLOCKED");
    expect(s1.smt.status).toBe("disagree");

    const b = build({ missingSibling: true });
    const s2 = computeSetupState({
      bias, candles4h: b.candles4h, forming4h: null, obTimeline: b.obTimeline,
      siblingByTime: b.siblingByTime, hasPair: true, m15Candles: b.m15Candles,
      levels, contract: es, now: b.entryTime + 600,
    });
    expect(s2.state).toBe("SMT_BLOCKED");
    expect(s2.smt.status).toBe("no-data");
  });

  it("no pair waives SMT and still activates", () => {
    const { candles4h, obTimeline, m15Candles, entryTime } = build();
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime: null, hasPair: false,
      m15Candles, levels, contract: es, now: entryTime + 600,
    });
    expect(s.state).toBe("SETUP_ACTIVE");
    expect(s.smt.status).toBe("no-pair");
  });

  it("falls back to 4h-close entry when 15m data is missing", () => {
    const { candles4h, obTimeline, entryTime } = build({ m15: false });
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime: null, hasPair: false,
      m15Candles: null, levels, contract: es, now: entryTime + 600,
    });
    expect(s.state).toBe("SETUP_ACTIVE");
    expect(s.plan.entrySource).toBe("4h-close");
  });

  it("the window expires after 12 fifteen-minute bars", () => {
    const { candles4h, obTimeline, m15Candles, entryTime } = build();
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime: null, hasPair: false,
      m15Candles, levels, contract: es,
      now: entryTime + ENTRY_WINDOW_15M_BARS * 900 + 1,
    });
    expect(s.state).toBe("WAITING_FOR_TAP");
  });

  it("a completed 15m close through the stop ends the window early", () => {
    const { candles4h, obTimeline, entryTime } = build();
    // stop ≈ 96 − 0.4 = 95.6 → 95.5; a 15m bar closing at 95 kills the setup
    const m15Candles = [
      candle(entryTime, 104.6, 105, 104.4, 104.8),
      candle(entryTime + 900, 104.8, 104.9, 94.5, 95),
    ];
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime: null, hasPair: false,
      m15Candles, levels, contract: es, now: entryTime + 2000,
    });
    expect(s.state).toBe("WAITING_FOR_TAP");
  });

  it("yesterday's confirmation is not actionable today", () => {
    const { candles4h, obTimeline, m15Candles, entryTime } = build();
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime: null, hasPair: false,
      m15Candles, levels, contract: es,
      now: entryTime + 30 * 3600, // well into the next trading day
    });
    expect(s.state).toBe("WAITING_FOR_TAP");
  });

  it("surfaces the skip reason when a confirmation fired but the plan failed", () => {
    const { candles4h, obTimeline, m15Candles, entryTime } = build();
    const s = computeSetupState({
      bias, candles4h, forming4h: null, obTimeline, siblingByTime: null, hasPair: false,
      m15Candles, levels: { pdh: 100, pdl: 90, pwh: 101, pwl: 85 }, // both draws below entry
      contract: es, now: entryTime + 600,
    });
    expect(s.state).toBe("WAITING_FOR_TAP");
    expect(s.skipReason).toBe("no-target");
  });
});
