-- Seed: 44 futures trades, Apr 14 – May 13, 2026
-- Pure SQL — no DO blocks. Paste into Supabase SQL Editor and run.
--
-- P&L math (gross, before commission):
--   ES  1 contract = $50/point     NQ  1 contract = $20/point
--   CL  1 contract = $1,000/point  GC  1 contract = $100/point

WITH
  ctx AS (
    SELECT id AS uid FROM public.users LIMIT 1
  ),
  acct AS (
    INSERT INTO public.trading_accounts (
      user_id, account_name, broker, account_number,
      account_type, base_currency, initial_balance, current_balance
    )
    SELECT uid, 'Futures Pro Account', 'Tradovate', 'TRD-2026-001',
           'live', 'USD', 50000.00, 50000.00
    FROM ctx
    RETURNING id AS aid, user_id AS uid
  )
INSERT INTO public.trades (
  user_id, account_id,
  instrument, instrument_type, direction,
  quantity, entry_price, exit_price,
  entry_date, exit_date, status,
  pnl, commission,
  strategy, setup_type, market_condition,
  notes, stop_loss, take_profit, risk_reward_ratio, tags
)
SELECT
  acct.uid, acct.aid,
  t.inst, t.itype, t.dir,
  t.qty, t.ep, t.xp,
  t.edate, t.xdate, 'closed',
  t.pnl, t.comm,
  t.strat, t.setup, t.mktcond,
  t.notes, t.sl, t.tp, t.rrr, t.tags
FROM acct
CROSS JOIN (VALUES

  -- Apr 14 | ES Long +$2,500
  ('ES'::varchar(100), 'future'::text, 'long'::text,
   2::decimal(15,4), 5480.00::decimal(15,6), 5505.00::decimal(15,6),
   '2026-04-14 09:35:00-04'::timestamptz, '2026-04-14 10:15:00-04'::timestamptz,
   2500.00::decimal(15,2), 10.00::decimal(15,2),
   'Momentum'::varchar(100), 'Opening Range Breakout'::varchar(100), 'Trending'::varchar(100),
   'Strong open, clear momentum off the open. Held for the first-hour trend.'::text,
   5465.00::decimal(15,6), 5510.00::decimal(15,6), 3.00::decimal(5,2),
   '["ES","momentum","winner"]'::jsonb),

  -- Apr 14 | NQ Short -$800
  ('NQ', 'future', 'short',
   1, 19200.00, 19240.00,
   '2026-04-14 11:00:00-04', '2026-04-14 11:45:00-04',
   -800.00, 5.00,
   'Mean Reversion', 'VWAP Bounce', 'Ranging',
   'Faded the morning spike but market kept pushing. Cut loss at stop.',
   19220.00, 19120.00, 2.00,
   '["NQ","reversion","loser"]'),

  -- Apr 15 | ES Long +$500
  ('ES', 'future', 'long',
   1, 5490.00, 5500.00,
   '2026-04-15 09:45:00-04', '2026-04-15 10:30:00-04',
   500.00, 5.00,
   'Breakout', 'Support Resistance', 'Trending',
   'Clean breakout above prior-day high. Quick scalp.',
   5482.00, 5510.00, 2.25,
   '["ES","breakout","winner"]'),

  -- Apr 15 | CL Long +$1,200
  ('CL', 'future', 'long',
   1, 78.50, 79.70,
   '2026-04-15 10:00:00-04', '2026-04-15 11:30:00-04',
   1200.00, 5.00,
   'Trend Following', 'Trend Continuation', 'Trending',
   'Oil trending higher on inventory data. Rode the move up.',
   78.00, 80.00, 3.00,
   '["CL","oil","trend","winner"]'),

  -- Apr 16 | ES Short -$1,500
  ('ES', 'future', 'short',
   2, 5495.00, 5510.00,
   '2026-04-16 09:30:00-04', '2026-04-16 10:00:00-04',
   -1500.00, 10.00,
   'Mean Reversion', 'Gap Fill', 'Volatile',
   'Faded the gap up but bulls overwhelmed. Stopped out fast.',
   5505.00, 5465.00, 2.00,
   '["ES","gap","loser"]'),

  -- Apr 16 | NQ Long +$3,200
  ('NQ', 'future', 'long',
   1, 19150.00, 19310.00,
   '2026-04-16 10:30:00-04', '2026-04-16 12:15:00-04',
   3200.00, 5.00,
   'Momentum', 'Trend Continuation', 'Trending',
   'Tech sector ripping. NQ leading all day. Great momentum trade.',
   19100.00, 19350.00, 4.00,
   '["NQ","tech","momentum","winner"]'),

  -- Apr 17 | GC Long +$750
  ('GC', 'future', 'long',
   1, 2310.00, 2317.50,
   '2026-04-17 10:00:00-04', '2026-04-17 11:00:00-04',
   750.00, 5.00,
   'Breakout', 'Support Resistance', 'Ranging',
   'Gold holding key support. Bounce trade worked well.',
   2305.00, 2325.00, 3.00,
   '["GC","gold","bounce","winner"]'),

  -- Apr 18 | ES Long +$7,500
  ('ES', 'future', 'long',
   3, 5500.00, 5550.00,
   '2026-04-18 09:30:00-04', '2026-04-18 11:00:00-04',
   7500.00, 15.00,
   'Momentum', 'Opening Range Breakout', 'Trending',
   'Monster open. Scaled into 3 contracts on the breakout. Best trade of the week.',
   5480.00, 5560.00, 4.00,
   '["ES","momentum","breakout","big-win","winner"]'),

  -- Apr 18 | NQ Short -$2,100
  ('NQ', 'future', 'short',
   1, 19400.00, 19505.00,
   '2026-04-18 13:00:00-04', '2026-04-18 13:45:00-04',
   -2100.00, 5.00,
   'Mean Reversion', 'VWAP Bounce', 'Volatile',
   'Tried to fade afternoon rally. NQ just kept going. Big loss.',
   19425.00, 19310.00, 1.50,
   '["NQ","reversion","loser"]'),

  -- Apr 21 | ES Long -$3,000
  ('ES', 'future', 'long',
   2, 5520.00, 5490.00,
   '2026-04-21 09:45:00-04', '2026-04-21 10:30:00-04',
   -3000.00, 10.00,
   'Breakout', 'Opening Range Breakout', 'Choppy',
   'Choppy Monday open. Breakout failed and reversed hard.',
   5505.00, 5555.00, 2.00,
   '["ES","breakout","loser"]'),

  -- Apr 21 | CL Short +$600
  ('CL', 'future', 'short',
   1, 79.20, 78.60,
   '2026-04-21 11:00:00-04', '2026-04-21 12:00:00-04',
   600.00, 5.00,
   'Mean Reversion', 'Support Resistance', 'Ranging',
   'Oil rejected at resistance. Short worked nicely.',
   79.50, 78.50, 2.33,
   '["CL","oil","resistance","winner"]'),

  -- Apr 22 | NQ Long +$5,400
  ('NQ', 'future', 'long',
   2, 19300.00, 19435.00,
   '2026-04-22 09:30:00-04', '2026-04-22 11:30:00-04',
   5400.00, 10.00,
   'Momentum', 'Opening Range Breakout', 'Trending',
   'Strong earnings catalyst. NQ exploded out of the gate. 2 contracts paid well.',
   19260.00, 19450.00, 4.75,
   '["NQ","earnings","momentum","big-win","winner"]'),

  -- Apr 22 | ES Short -$250
  ('ES', 'future', 'short',
   1, 5505.00, 5510.00,
   '2026-04-22 14:00:00-04', '2026-04-22 14:30:00-04',
   -250.00, 5.00,
   'Mean Reversion', 'VWAP Bounce', 'Ranging',
   'Tried fading afternoon high. Minor loss, stopped out.',
   5509.00, 5490.00, 2.00,
   '["ES","reversion","loser"]'),

  -- Apr 23 | GC Long +$1,800
  ('GC', 'future', 'long',
   1, 2325.00, 2343.00,
   '2026-04-23 09:30:00-04', '2026-04-23 11:00:00-04',
   1800.00, 5.00,
   'Trend Following', 'Trend Continuation', 'Trending',
   'Gold continued its uptrend. Safe-haven buying continues.',
   2315.00, 2350.00, 2.80,
   '["GC","gold","trend","winner"]'),

  -- Apr 23 | ES Long +$2,000
  ('ES', 'future', 'long',
   2, 5480.00, 5500.00,
   '2026-04-23 10:30:00-04', '2026-04-23 12:00:00-04',
   2000.00, 10.00,
   'VWAP Strategy', 'VWAP Bounce', 'Trending',
   'VWAP reclaim after morning dip. Great entry point.',
   5470.00, 5515.00, 3.33,
   '["ES","VWAP","winner"]'),

  -- Apr 24 | CL Short -$1,100
  ('CL', 'future', 'short',
   1, 79.50, 80.60,
   '2026-04-24 10:00:00-04', '2026-04-24 11:00:00-04',
   -1100.00, 5.00,
   'Mean Reversion', 'Support Resistance', 'Volatile',
   'Shorted oil at resistance but EIA data spiked it higher. Stopped out.',
   79.80, 78.90, 2.00,
   '["CL","oil","volatile","loser"]'),

  -- Apr 24 | NQ Long +$850
  ('NQ', 'future', 'long',
   1, 19250.00, 19292.50,
   '2026-04-24 13:30:00-04', '2026-04-24 14:30:00-04',
   850.00, 5.00,
   'VWAP Strategy', 'VWAP Bounce', 'Ranging',
   'Afternoon VWAP bounce. Clean setup, clean exit.',
   19230.00, 19310.00, 2.13,
   '["NQ","VWAP","winner"]'),

  -- Apr 25 | ES Long -$5,250
  ('ES', 'future', 'long',
   3, 5530.00, 5495.00,
   '2026-04-25 09:30:00-04', '2026-04-25 10:15:00-04',
   -5250.00, 15.00,
   'Breakout', 'Opening Range Breakout', 'Volatile',
   'Tried to catch opening breakout with 3 contracts. Reversed on bad macro news. Big loss.',
   5515.00, 5570.00, 2.00,
   '["ES","breakout","macro","big-loss","loser"]'),

  -- Apr 25 | NQ Short +$1,200
  ('NQ', 'future', 'short',
   1, 19350.00, 19290.00,
   '2026-04-25 11:00:00-04', '2026-04-25 12:00:00-04',
   1200.00, 5.00,
   'Mean Reversion', 'Support Resistance', 'Volatile',
   'Recovered some losses by shorting the bounce. Good discipline.',
   19365.00, 19290.00, 5.00,
   '["NQ","recovery","winner"]'),

  -- Apr 28 | ES Long +$3,500
  ('ES', 'future', 'long',
   2, 5470.00, 5505.00,
   '2026-04-28 09:45:00-04', '2026-04-28 11:30:00-04',
   3500.00, 10.00,
   'Momentum', 'Opening Range Breakout', 'Trending',
   'Monday bounce. Market opened strong and never looked back.',
   5455.00, 5520.00, 3.33,
   '["ES","momentum","winner"]'),

  -- Apr 28 | GC Long -$450
  ('GC', 'future', 'long',
   1, 2340.00, 2335.50,
   '2026-04-28 13:00:00-04', '2026-04-28 14:00:00-04',
   -450.00, 5.00,
   'Trend Following', 'Trend Continuation', 'Ranging',
   'Gold pullback caught me on the wrong side. Small loss, moved on.',
   2336.00, 2355.00, 5.00,
   '["GC","gold","loser"]'),

  -- Apr 29 | NQ Short +$6,800
  ('NQ', 'future', 'short',
   2, 19500.00, 19330.00,
   '2026-04-29 09:30:00-04', '2026-04-29 11:00:00-04',
   6800.00, 10.00,
   'Mean Reversion', 'Gap Fill', 'Volatile',
   'NQ gapped up huge on earnings then faded. Shorted the fade with 2 contracts. Excellent trade.',
   19520.00, 19330.00, 9.50,
   '["NQ","gap-fill","short","big-win","winner"]'),

  -- Apr 29 | ES Long -$750
  ('ES', 'future', 'long',
   1, 5495.00, 5480.00,
   '2026-04-29 13:30:00-04', '2026-04-29 14:00:00-04',
   -750.00, 5.00,
   'VWAP Strategy', 'VWAP Bounce', 'Choppy',
   'VWAP reclaim attempt failed. Market too weak in the afternoon.',
   5488.00, 5515.00, 3.00,
   '["ES","VWAP","loser"]'),

  -- Apr 30 | CL Long +$2,300
  ('CL', 'future', 'long',
   1, 78.80, 81.10,
   '2026-04-30 09:30:00-04', '2026-04-30 12:00:00-04',
   2300.00, 5.00,
   'Trend Following', 'Trend Continuation', 'Trending',
   'Oil surged on OPEC headlines. Long from support paid off.',
   78.30, 81.50, 5.40,
   '["CL","oil","OPEC","winner"]'),

  -- Apr 30 | ES Short +$1,800
  ('ES', 'future', 'short',
   2, 5520.00, 5502.00,
   '2026-04-30 14:00:00-04', '2026-04-30 15:30:00-04',
   1800.00, 10.00,
   'Mean Reversion', 'Support Resistance', 'Ranging',
   'End-of-month selling pressure. Faded the high into the close.',
   5526.00, 5500.00, 3.33,
   '["ES","end-of-month","winner"]'),

  -- May 1 | NQ Long -$1,600
  ('NQ', 'future', 'long',
   1, 19400.00, 19320.00,
   '2026-05-01 09:30:00-04', '2026-05-01 10:15:00-04',
   -1600.00, 5.00,
   'Breakout', 'Opening Range Breakout', 'Choppy',
   'May started choppy. Breakout faked out hard. Stopped out.',
   19375.00, 19480.00, 3.20,
   '["NQ","breakout","fakeout","loser"]'),

  -- May 1 | ES Short +$400
  ('ES', 'future', 'short',
   1, 5510.00, 5502.00,
   '2026-05-01 11:30:00-04', '2026-05-01 12:15:00-04',
   400.00, 5.00,
   'Mean Reversion', 'VWAP Bounce', 'Ranging',
   'Faded the midday bounce. Quick scalp.',
   5513.00, 5500.00, 2.67,
   '["ES","scalp","winner"]'),

  -- May 2 | GC Long +$4,200
  ('GC', 'future', 'long',
   2, 2350.00, 2371.00,
   '2026-05-02 09:30:00-04', '2026-05-02 11:30:00-04',
   4200.00, 10.00,
   'Trend Following', 'Trend Continuation', 'Trending',
   'Gold on a tear. Doubled up on size. Breakout from consolidation.',
   2340.00, 2380.00, 4.00,
   '["GC","gold","trend","big-win","winner"]'),

  -- May 2 | ES Long -$2,800
  ('ES', 'future', 'long',
   2, 5505.00, 5477.00,
   '2026-05-02 13:00:00-04', '2026-05-02 13:45:00-04',
   -2800.00, 10.00,
   'VWAP Strategy', 'VWAP Bounce', 'Volatile',
   'Afternoon VWAP reclaim failed. Fed minutes released, market tanked.',
   5495.00, 5530.00, 2.50,
   '["ES","VWAP","fed","loser"]'),

  -- May 5 | NQ Long +$10,200
  ('NQ', 'future', 'long',
   1, 19200.00, 19710.00,
   '2026-05-05 09:30:00-04', '2026-05-05 15:00:00-04',
   10200.00, 5.00,
   'Momentum', 'Opening Range Breakout', 'Trending',
   'Best trade of the month. NQ ripped all day. Held through pullbacks. Textbook.',
   19150.00, 19800.00, 11.00,
   '["NQ","home-run","big-win","momentum","winner"]'),

  -- May 5 | ES Short -$350
  ('ES', 'future', 'short',
   1, 5490.00, 5497.00,
   '2026-05-05 10:30:00-04', '2026-05-05 11:00:00-04',
   -350.00, 5.00,
   'Mean Reversion', 'VWAP Bounce', 'Trending',
   'Shorted against the trend. Rookie mistake on a strong day.',
   5493.00, 5476.00, 2.33,
   '["ES","counter-trend","loser"]'),

  -- May 6 | CL Short +$1,500
  ('CL', 'future', 'short',
   1, 80.00, 78.50,
   '2026-05-06 09:30:00-04', '2026-05-06 11:30:00-04',
   1500.00, 5.00,
   'Breakout', 'Support Resistance', 'Trending',
   'Oil breaking down from key resistance. Short from the top paid off.',
   80.30, 78.50, 5.00,
   '["CL","oil","breakdown","winner"]'),

  -- May 6 | ES Long +$3,000
  ('ES', 'future', 'long',
   2, 5480.00, 5510.00,
   '2026-05-06 10:00:00-04', '2026-05-06 12:00:00-04',
   3000.00, 10.00,
   'Momentum', 'Opening Range Breakout', 'Trending',
   'ES followed NQ higher. Caught the continuation move.',
   5468.00, 5520.00, 3.46,
   '["ES","momentum","winner"]'),

  -- May 7 | NQ Short -$2,400
  ('NQ', 'future', 'short',
   1, 19350.00, 19470.00,
   '2026-05-07 09:30:00-04', '2026-05-07 10:15:00-04',
   -2400.00, 5.00,
   'Mean Reversion', 'Gap Fill', 'Volatile',
   'Tried fading opening strength. Market ignored all levels. Took full stop.',
   19380.00, 19270.00, 2.17,
   '["NQ","gap","fading","loser"]'),

  -- May 7 | GC Long +$900
  ('GC', 'future', 'long',
   1, 2360.00, 2369.00,
   '2026-05-07 11:00:00-04', '2026-05-07 12:30:00-04',
   900.00, 5.00,
   'VWAP Strategy', 'VWAP Bounce', 'Ranging',
   'Gold consolidated and bounced off VWAP. Clean trade.',
   2355.00, 2375.00, 1.80,
   '["GC","gold","VWAP","winner"]'),

  -- May 8 | ES Long -$9,750
  ('ES', 'future', 'long',
   3, 5550.00, 5485.00,
   '2026-05-08 09:30:00-04', '2026-05-08 10:00:00-04',
   -9750.00, 15.00,
   'Breakout', 'Opening Range Breakout', 'Volatile',
   'CPI data came in hot. Huge gap and immediate reversal. 3 contracts destroyed equity. No size on data days.',
   5530.00, 5590.00, 2.00,
   '["ES","CPI","data-day","big-loss","loser","lesson"]'),

  -- May 8 | NQ Short +$5,600
  ('NQ', 'future', 'short',
   1, 19600.00, 19320.00,
   '2026-05-08 10:30:00-04', '2026-05-08 13:00:00-04',
   5600.00, 5.00,
   'Momentum', 'Trend Continuation', 'Volatile',
   'Pivoted short after ES disaster. NQ collapsed post-CPI. Made back a lot.',
   19625.00, 19325.00, 11.00,
   '["NQ","CPI","short","recovery","big-win","winner"]'),

  -- May 9 | CL Long +$1,800
  ('CL', 'future', 'long',
   1, 79.20, 81.00,
   '2026-05-09 09:30:00-04', '2026-05-09 11:30:00-04',
   1800.00, 5.00,
   'Trend Following', 'Trend Continuation', 'Trending',
   'Oil recovering from weekly lows. Long with the trend.',
   78.80, 81.50, 4.25,
   '["CL","oil","recovery","winner"]'),

  -- May 9 | ES Short +$2,500
  ('ES', 'future', 'short',
   2, 5525.00, 5500.00,
   '2026-05-09 13:00:00-04', '2026-05-09 14:30:00-04',
   2500.00, 10.00,
   'Mean Reversion', 'Support Resistance', 'Ranging',
   'Faded resistance level. Clean rejection, good execution.',
   5530.00, 5500.00, 6.00,
   '["ES","resistance","short","winner"]'),

  -- May 12 | NQ Long -$1,200
  ('NQ', 'future', 'long',
   1, 19450.00, 19390.00,
   '2026-05-12 09:30:00-04', '2026-05-12 10:15:00-04',
   -1200.00, 5.00,
   'Breakout', 'Opening Range Breakout', 'Choppy',
   'Monday open, failed breakout. Choppy conditions.',
   19430.00, 19510.00, 4.00,
   '["NQ","choppy","loser"]'),

  -- May 12 | ES Long +$4,000
  ('ES', 'future', 'long',
   2, 5480.00, 5520.00,
   '2026-05-12 10:30:00-04', '2026-05-12 13:00:00-04',
   4000.00, 10.00,
   'Momentum', 'VWAP Bounce', 'Trending',
   'Market found footing at VWAP. Added second contract at confirmation.',
   5468.00, 5530.00, 3.17,
   '["ES","VWAP","momentum","winner"]'),

  -- May 13 | GC Short +$2,100
  ('GC', 'future', 'short',
   1, 2385.00, 2364.00,
   '2026-05-13 09:30:00-04', '2026-05-13 11:00:00-04',
   2100.00, 5.00,
   'Mean Reversion', 'Support Resistance', 'Ranging',
   'Gold rejected at multi-week resistance. Short from the top.',
   2388.00, 2360.00, 9.33,
   '["GC","gold","resistance","winner"]'),

  -- May 13 | ES Long -$500
  ('ES', 'future', 'long',
   1, 5500.00, 5490.00,
   '2026-05-13 10:30:00-04', '2026-05-13 11:00:00-04',
   -500.00, 5.00,
   'Breakout', 'Support Resistance', 'Choppy',
   'Support level failed. Small stop, moved on quickly.',
   5494.00, 5516.00, 3.67,
   '["ES","support-fail","loser"]'),

  -- May 13 | NQ Long +$8,400
  ('NQ', 'future', 'long',
   2, 19300.00, 19510.00,
   '2026-05-13 13:00:00-04', '2026-05-13 15:30:00-04',
   8400.00, 10.00,
   'Momentum', 'Trend Continuation', 'Trending',
   'End-of-day monster move. NQ broke out to new highs. 2 contracts, held the whole move.',
   19270.00, 19530.00, 7.00,
   '["NQ","new-highs","momentum","big-win","winner"]')

) AS t(inst, itype, dir, qty, ep, xp, edate, xdate, pnl, comm, strat, setup, mktcond, notes, sl, tp, rrr, tags);
