# Tradovate / NinjaTrader Partner Playbook — Getting OAuth Sync for Prop Accounts

> Goal: obtain a vendor/partner OAuth agreement with NinjaTrader (owner of
> Tradovate) so Zalortrade can auto-sync fills from Tradovate-based prop-firm
> accounts (Apex, TradeDay, Lucid…) the way TradeZella and TradesViz do.
> Companion doc: `broker-integrations.md` (architecture) — this file is the
> business/process side.

---

## 0. Live status log (most recent first)

### NinjaTrader / Tradovate — ✅ ACCEPTED (green light)
Reply from **Michaelanne Chapel, Business Development Manager – North America**
(michaelanne.chapel@ninjatrader.com). Key terms offered:
- The **same API serves both NinjaTrader and Tradovate users** — one build, no
  per-platform branching ("it is the same path").
- Access is via the **NinjaTrader Vendor Program**, which is **free to join**.
- As a Vendor Program member they will **waive the API fee AND the financial
  requirements** (the $1,000-funded-account + paid add-on barrier that blocks
  the retail tier — see §1 — is removed for us).
- It's a **co-marketing program**: we must have a public-facing website/landing
  page and agree to be listed as a **Connection / Integration (not a
  Brokerage)**. Free directory exposure for us.
- ⚠️ **No dedicated API support** — build independently from the provided docs.
  Acceptable for us: we already shipped the ProjectX/TopstepX adapter from
  public docs, and Tradovate OAuth is simpler.

**Next step:** reply YES, confirm the integration listing + our live site,
enroll in the Vendor Program, request API docs + OAuth app credentials
(client ID/secret). Then wire into the existing `tradovate` adapter slot
(`BrokerContext.jsx` / `broker-oauth`). **Blocker on our side:** public website
must be live for the co-marketing listing.

### Rithmic — 🟡 ENGAGED, dev kit released, commercial conformance required
Reply from **Shyam** — released the **RProtocol dev kit** to our download
directory. Answers received:
- **Conformance depends on personal vs. product use.** We're a product for
  customers ⇒ **commercial conformance** (formal certification) is required.
  Process details still to be clarified.
- **Auth: the trader's own Rithmic login suffices** (we don't provision
  accounts). BUT there **may be a third-party API fee charged to the trader**
  (monthly, discussed with their broker/IB — reference ~$100+/mo via FCMs).
- **Trade history is exposed** as long as trades occurred on the Rithmic
  platform; **searchable by date** — good for journaling.
- ⚠️ **Concurrent-session risk:** an API login may **kick the trader out of
  RTrader Pro** if it exceeds their max concurrent session count. Must confirm a
  read-only history pull can avoid consuming a live session slot. This is the
  key architecture risk.
- Access is scoped to the **systems we're permissioned for** (per firm/FCM).
- One question still pending ("we will get back to you").

**Open follow-ups sent to Shyam:** commercial conformance process/timeline/cost;
concurrent-session avoidance for read-only sync; the per-trader API fee amount;
vendor permissioning across firms; history depth/date-range limits; test vs.
production environments.

**Architecture note:** Rithmic needs stateful WebSocket/protobuf sessions and
careful concurrent-session handling — does **not** fit Supabase Edge Functions.
A Rithmic adapter requires a small always-on worker service holding the
connections and writing normalized trades into Supabase.

### Sequencing decision
Land **NinjaTrader/Tradovate first** (green light, waived fees, cleaner OAuth
model, covers NT + Tradovate in one build). Keep **Rithmic warm** as the second
integration — dev kit is already in hand at no cost. **TopstepX/ProjectX** stays
the shipped-dark path (flip `projectx_broker` after live verify). **CSV** remains
the universal fallback throughout.

---

## 1. Know which program you're applying to (don't mix these up)

| Program | Who it's for | Is it us? |
|---------|--------------|-----------|
| **Retail "API Access" add-on** | Individual trader, personal live funded account ($1,000+ min, paid add-on). Prop/eval accounts excluded. | ❌ No — this is the tier that turned us down. |
| **Partner API** (partner.tradovate.com) | Prop-firm **operators** — creating and managing trader accounts, evaluations, risk rules. This is what Apex/Topstep-style firms use. | ❌ No — we don't provision accounts. |
| **Vendor / third-party OAuth integration** (NinjaTrader Ecosystem) | Apps that connect to users' existing accounts — journals, analytics, copiers. Registered OAuth app, user logs in and consents, read-only scopes possible. | ✅ **Yes — this is our ask.** |

## 2. Contacts and where to apply

1. **Primary:** email `info@ninjatraderecosystem.com` — the NinjaTrader
   Ecosystem vendor program. Their own docs say: "If you would like to become a
   vendor, please send an email to info [at] ninjatraderecosystem.com."
   - Vendor program page: https://ninjatraderecosystem.com/article/ninjatrader-vendor-program/
   - Vendor dashboard (after acceptance): https://vendor-support.ninjatrader.com/
2. **Public thread:** post the same request in the Tradovate forum, API
   Developers category: https://community.tradovate.com/c/api-developers/15
   Staff reply there; an open thread + the email doubles response odds.
   Relevant existing threads (link them in your post so staff see precedent):
   - https://community.tradovate.com/t/third-party-oauth-integration/12456
   - https://community.tradovate.com/t/api-access-for-3rd-party-app-development/11941
   - https://community.tradovate.com/t/how-do-i-register-an-oauth-app/2393
3. **Warm intro:** ask a prop firm (Apex/TradeDay partnerships or support) to
   introduce you to their NinjaTrader/Tradovate contact. Firms benefit when
   their traders journal — this ask lands well.
4. **OAuth self-registration** (once you have any Tradovate account):
   Application Settings → API Access tab → OAuth Registration. Some developers
   open a small funded personal account purely for development/registration.

The email drafts for (1) and (3) are in §6 below.

## 3. Follow-up cadence after sending

- **Day 0:** send the ecosystem email + post the forum thread.
- **Day 7:** no reply → polite follow-up on the same email thread ("bumping
  this — happy to provide anything you need"). Reply to your own forum post.
- **Day 14:** second follow-up + send the prop-firm warm-intro emails if you
  haven't already.
- **Day 21+:** try secondary channels — NinjaTrader support chat asking to be
  routed to the ecosystem/vendor team, or LinkedIn to NinjaTrader business
  development. Persistence is normal and expected for B2B onboarding.
- Log every contact (date, person, promise) — you'll need it when the
  conversation resumes weeks later.

## 4. Materials to have ready BEFORE they reply

They will evaluate legitimacy fast. Prepare:

- [ ] **Live, polished website** at the domain you email from. A Gmail sender
      with no site is an instant soft-reject; ideally email from
      `you@zalortrade.com`.
- [ ] **Privacy policy + terms** pages published (already exist in
      `src/pages/legal/`) — link them in the application.
- [ ] **One-paragraph product description** and 2–3 screenshots or a 60-second
      demo video of the journal.
- [ ] **Security one-pager**: OAuth tokens exchanged and stored server-side
      only (Supabase Edge Functions), encrypted at rest, never in the browser
      or localStorage; read-only scopes; no order routing; user can disconnect
      anytime. (All already true of our architecture — see
      `broker-integrations.md` §6–7.)
- [ ] **Requested scopes, written down:** account list, fills/executions,
      positions. Explicitly: no order placement, no fund movement, no market
      data redistribution.
- [ ] **Redirect URIs** you'll register: production
      (`https://<domain>/auth/callback/tradovate`) and local dev
      (`http://localhost:5173/auth/callback/tradovate`).
- [ ] **Business details:** legal entity name (register one if you haven't —
      most vendor agreements are signed with a company, not an individual),
      country, contact person.
- [ ] **User numbers** framed honestly: "early stage, N active users, growing
      X%/month, top requested feature is Tradovate sync."

## 5. After approval — technical integration checklist

The code is already shaped for this; approval mostly means filling in real
credentials and scopes.

1. Receive **client ID + client secret** (likely staging first, then
   production — expect a staging key for testing before a prod key is issued).
2. Put secrets in **Supabase Edge Function env vars only**
   (`TRADOVATE_CLIENT_ID`, `TRADOVATE_CLIENT_SECRET`) — never `VITE_` vars.
   Note: `.env.example` / the old KB doc mention `VITE_TRADOVATE_CLIENT_SECRET`;
   that predates the Edge Function architecture and must NOT be used.
3. Register redirect URIs with them (see §4).
4. Wire into the existing adapter slot: `BrokerContext.jsx` OAuth popup →
   `supabase/functions/broker-oauth` token exchange → tokens encrypted in
   `broker_tokens` → `broker-sync` pulls fills. Same contract as the ProjectX
   adapter (`broker-integrations.md` §5).
5. **Live test with a real prop account** (Apex/TradeDay eval): connect, sync,
   verify fills/PnL/timestamps/fees against the platform. Remember prop
   accounts may classify as **demo** environment — test both toggles.
6. Ship behind a feature flag (like `projectx_broker`), admin smoke test,
   then enable.
7. Whatever agreement you sign, check for: permitted use of data, uptime/rate
   limits, fees, co-marketing rights (being listed in their ecosystem
   directory is free distribution), and termination terms.

## 6. Email drafts

### 6a. To NinjaTrader Ecosystem (send first)

> **To:** info@ninjatraderecosystem.com
> **Subject:** Partner integration request — read-only trade sync for a trading journal (OAuth)
>
> Hi NinjaTrader Ecosystem team,
>
> My name is [name], founder of **Zalortrade** ([domain]) — a trading journal
> and analytics platform for futures traders. Many of our users trade prop-firm
> evaluation and funded accounts provisioned on Tradovate (Apex Trader Funding,
> TradeDay, and others), and they've asked for automatic trade sync — the same
> read-only integration journals like TradeZella and TradesViz offer today.
>
> **What we're requesting:**
> - A registered OAuth application (client ID/secret) under a vendor/partner
>   integration agreement
> - **Read-only scopes only:** account list, fills/executions, positions
> - No order placement, no fund movement, no market data redistribution — ever
>
> **How we handle it technically:** users authenticate through Tradovate's own
> login and consent screen; we never see or store passwords. Token exchange and
> storage are server-side only, encrypted at rest.
>
> **Questions:**
> 1. What is the process and timeline to become an approved integration partner?
> 2. What are the fees or commercial terms for this type of vendor agreement?
> 3. Does partner OAuth access cover prop-firm evaluation/funded accounts, as it
>    does for existing journal integrations?
> 4. Is there a partner onboarding doc or technical contact you can point me to?
>
> Happy to complete any technical review, self-attestation, or security
> questionnaire. Thanks for your time.
>
> [Name] · Founder, Zalortrade · [email] · [phone] · [domain]

### 6b. To a prop firm (Apex / TradeDay / …) — send in parallel

> **To:** partners@ / support@ [firm]
> **Subject:** Integration partnership — trade journaling for your traders
>
> Hi [firm] team,
>
> I'm [name], founder of **Zalortrade** ([domain]), a trading journal built for
> futures prop traders — analytics, evaluation-rule tracking, and daily
> performance review.
>
> Many of our users are [firm] traders who want fills to sync automatically
> instead of importing CSVs. Since [firm] accounts run on Tradovate, that
> requires a vendor/OAuth agreement with the NinjaTrader/Tradovate ecosystem
> team, which we're pursuing.
>
> **Two asks:**
> 1. **An introduction** to your NinjaTrader/Tradovate partnerships contact —
>    we're requesting read-only access only (fills, positions, account list —
>    no execution).
> 2. **A partnership:** would [firm] be open to Zalortrade as a recommended
>    journal for your traders — discounts for your community or co-marketing?
>    Journaling helps traders pass evaluations and stay funded.
>
> If [firm] offers any direct data export or reporting API for traders' fills,
> we'd gladly integrate with that as an alternative path. Happy to share a demo
> account so your team can see the product.
>
> [Name] · Founder, Zalortrade · [email] · [domain]

## 7. While waiting — nothing is blocked

- **ProjectX** integration is built (flag `projectx_broker`) → covers Topstep,
  Alpha Futures, etc. Verify live and enable.
- **CSV import** (`CsvImportModal`) covers Tradovate-based firms today — keep
  it prominent in the UI and docs.
- **Rithmic** remains the later add-on (also a vendor-certification model).

## 8. Sources

- NinjaTrader Vendor Program: https://ninjatraderecosystem.com/article/ninjatrader-vendor-program/
- Vendor dashboard: https://vendor-support.ninjatrader.com/
- Tradovate API Access (retail tier rules): https://support.tradovate.com/s/article/Tradovate-API-Access
- Tradovate Partner API (prop-firm operator program): https://partner.tradovate.com/overview/welcome/introduction-to-tradovate-partner-api
- Forum — OAuth app registration: https://community.tradovate.com/t/how-do-i-register-an-oauth-app/2393
- Forum — third-party OAuth integration: https://community.tradovate.com/t/third-party-oauth-integration/12456
- Forum — API access for 3rd-party apps: https://community.tradovate.com/t/api-access-for-3rd-party-app-development/11941
- TradesViz Tradovate sync (read-only precedent): https://www.tradesviz.com/blog/auto-import-tradovate/
- TradeZella Tradovate sync: https://help.tradezella.com/en/articles/9557659-tradovate-how-to-sync-your-tradovate-account-with-tradezella
