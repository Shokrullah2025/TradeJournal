# Broker / Prop‑Firm Integrations — How It Works & How to Add More

> Purpose: explain how futures prop‑firm accounts actually connect to data, why
> Tradovate told us "no", and how to make Zalortrade integrate with **any**
> provider through one pluggable adapter contract. Read this before wiring a new
> broker.

---

## 1. The mental model (this is the part that's confusing)

There are **three different roles** in the futures prop world. They are often
conflated, which is the source of the confusion:

| Role | Who | What they give the trader |
|------|-----|---------------------------|
| **Prop firm** (the seller) | Apex, Topstep, MyFundedFutures, Bulenox, Take Profit Trader, Tradeify, Alpha Futures… | Sells the *evaluation* and *funded account* — i.e. the **capital, the rules, and the payout**. They do **not** run their own matching engine or market data. |
| **Platform / data‑feed provider** (the plumbing) | **Tradovate**, **Rithmic**, **CQG**, **ProjectX** | Provides the actual **execution + market data + account API**. The prop firm *provisions your account on top of one of these*. |
| **Journal / tool** (us + copiers) | Zalortrade, TradeZella, trade copiers | Reads the trader's fills/positions from the platform API and adds analytics. |

So when a trader "buys an Apex account", Apex creates that account **inside a
platform** — historically Tradovate or Rithmic, increasingly **ProjectX**. The
trader executes through that platform; Apex just owns the funding + rules layer.

**Key consequence for us:** to import trades we integrate with the **platform**
(Tradovate / Rithmic / ProjectX), *not* with the prop firm directly. The prop
firm has no trade API of its own — it delegates that to the platform.

```
 Trader ──buys account──▶ Prop firm (Apex)
                              │ provisions account on…
                              ▼
                    Platform / data feed (ProjectX / Tradovate / Rithmic)
                              │ exposes the trade + account API
                              ▼
                    Zalortrade adapter reads fills ──▶ journal
```

---

## 2. Why Tradovate said "no" (and why that's expected)

Tradovate **does** have a REST/WebSocket API, but their published policy is that
**prop‑firm and evaluation accounts are *not eligible* for API access** — API
keys require a *personal, live, funded* Tradovate account (min balance +
paid "API Access" add‑on). Prop/eval accounts are explicitly excluded.

That's why the Tradovate team said they don't share/integrate: our users' accounts
are prop/eval accounts, which their API tier deliberately locks out. **This is not
something we can negotiate around by emailing them** — it's the account‑type
boundary of their product. Building our primary flow on Tradovate OAuth (what the
app does today) is therefore a dead end for the real use case.

> The existing `tradovate` OAuth path in `BrokerContext.jsx` still works for a
> personal funded Tradovate account and for the demo flow, so we keep it — but it
> is **not** the path most prop‑firm users can use.

---

## 3. The provider landscape (2026) and our recommendation

| Provider | Auth model | Prop accounts allowed? | Effort | Notes |
|----------|-----------|------------------------|--------|-------|
| **ProjectX Gateway** ✅ *primary* | **API key → session JWT** (per‑user) | **Yes — built for prop firms** | Low | REST, purpose‑built "prop firm API". 19+ firms (Topstep/TopstepX, Alpha Futures, The Futures Desk, Goat, Blusky, TickTick, FXIfy Futures…). Clean docs. |
| **Rithmic (R\|API+)** | FCM/broker‑issued creds | Yes (via the firm) | High | Enterprise DMA plumbing; heavier onboarding, binary‑ish protocol. Good later for scalper/algo users. |
| **Tradovate** | OAuth (personal funded only) | **No (prop/eval excluded)** | Low | Keep for personal funded + demo only. |
| **CSV import** ✅ *universal fallback* | none | Always | Trivial | Works for **every** firm/platform. Already built (`CsvImportModal`). Keep prominent. |

**Recommendation:** make **ProjectX Gateway** the primary live integration,
keep **CSV** as the universal fallback that always works, and treat **Rithmic**
as a future add‑on for advanced users. Design the code so any of these is just
"another adapter" — see §5.

---

## 4. ProjectX Gateway — concrete integration spec

Enough detail to build the adapter + Edge Functions.

- **Style:** REST + JSON. Realtime via SignalR hubs (optional, phase 2).
- **Per‑firm base URL** (the firm decides which one the user is on), e.g.:
  - Topstep / TopstepX → `https://api.topstepx.com`
  - The Futures Desk → `https://api.thefuturesdesk.projectx.com/api`
  - …each supported firm publishes its own `api.<firm>.projectx.com` host.
  - ⇒ Store the **base URL per firm** in config, not hardcoded to one host.
- **Auth:** `POST {baseUrl}/api/Auth/loginKey` with `{ "userName", "apiKey" }`
  → returns a **session JWT**, valid **24h**. All later calls send
  `Authorization: Bearer <token>`, `Content-Type: application/json`.
  - The user gets their **API key** from *their prop‑firm/ProjectX dashboard* —
    we never see their password. We store the API key server‑side (encrypted).
- **Core endpoints** (see API reference for full shapes):
  - `POST /api/Account/search` — list the user's accounts.
  - `POST /api/Trade/search` — historical fills for an account + time window
    (this is what powers trade import/sync).
  - `POST /api/Order/search`, `POST /api/Position/searchOpen` — orders/positions.
- **Realtime (phase 2):** SignalR `user` hub (`https://rtc.<firm>/hubs/user`)
  pushes account/order/position updates; `market` hub pushes quotes. Lets us do
  live sync instead of polling.

**Auth‑model implication:** ProjectX is **API‑key**, not OAuth. Our current code
assumes OAuth popups. The adapter contract in §5 abstracts this so key‑based and
OAuth‑based providers coexist.

---

## 5. The pluggable adapter contract (what "easy to integrate" means)

Today `BrokerContext.jsx` hardcodes an OAuth popup flow and a `BROKERS` map. To
make new APIs drop‑in, we formalize a **provider adapter** with two halves:

### 5a. Provider descriptor (frontend, non‑secret) — `src/lib/brokers/providers.js`
```js
// NO secrets here. clientId/apiKey handling stays server‑side.
export const PROVIDERS = {
  projectx: {
    name: "ProjectX",
    authType: "apiKey",        // "apiKey" | "oauth" | "demo"
    // per prop firm on this platform
    firms: [
      { id: "topstep",  name: "Topstep",           baseUrl: "https://api.topstepx.com" },
      { id: "alpha",    name: "Alpha Futures",      baseUrl: "https://api.alphafutures.projectx.com" },
      // …
    ],
    fields: [                  // what the connect UI collects
      { key: "userName", label: "ProjectX username", type: "text" },
      { key: "apiKey",   label: "API key",           type: "password" },
    ],
  },
  tradovate: { name: "Tradovate", authType: "oauth", /* existing */ },
  // rithmic, csv, demo…
};
```

### 5b. Adapter interface (server, in the Edge Function) — one file per provider
Every provider implements the **same 3 functions**, so the rest of the app never
changes when we add one:
```ts
interface BrokerAdapter {
  // exchange the user's credentials/code for a stored, encrypted session
  connect(input): Promise<{ accounts: Account[]; sessionRef: string }>;
  // pull fills for an account since `fromDate`, normalized to our Trade shape
  fetchTrades(sessionRef: string, accountId: string, fromDate?: string): Promise<Trade[]>;
  // refresh/validate the session (re‑login for ProjectX's 24h JWT, refresh for OAuth)
  ensureSession(sessionRef: string): Promise<void>;
}
```
`broker-oauth` / `broker-sync` become thin routers: `const adapter =
ADAPTERS[provider]` then call the interface. Adding ProjectX = add
`adapters/projectx.ts` + one row in `PROVIDERS`. Nothing else moves.

### 5c. Normalization
All adapters must return trades in the **existing app Trade shape** (see
`transformDemoTrades` in `BrokerContext.jsx` for the target fields: `instrument,
tradeType, entryDate/Time, entryPrice, exitDate/Time, exitPrice, quantity,
status, fees, pnl, brokerTradeId, brokerSource`). PnL is computed with
`src/utils/pnl.js` — never re‑derive inline.

---

## 6. Requirements checklist to add a provider (e.g. ProjectX)

Security rules below are mandated by `CLAUDE.md` §2.

**Secrets & config**
- [ ] User credentials (ProjectX `apiKey`) are **never** stored in `localStorage`
      or any `VITE_` var. They go to an Edge Function and are stored **encrypted
      at rest** (Supabase, `broker_connections` table) — see §7.
- [ ] Only non‑secret descriptors (`name`, `authType`, firm `baseUrl`s) live in
      the frontend `PROVIDERS` map.

**Backend (Edge Functions)**
- [ ] `adapters/projectx.ts` implementing `connect / fetchTrades / ensureSession`.
- [ ] `broker-oauth` (rename → `broker-connect`) routes `authType:"apiKey"` to
      `adapter.connect()` (login → store encrypted session/token).
- [ ] `broker-sync` calls `adapter.ensureSession()` then `adapter.fetchTrades()`,
      upserts via `.upsert()` on `brokerTradeId` (idempotent, no dupes).
- [ ] Validate all inbound bodies with **Zod** before use.
- [ ] Resolve `user_id` from `supabase.auth.getUser()` server‑side — never trust
      a `user_id` from the client.
- [ ] p95 < 150 ms on hot paths; do the actual fills pull as background work, not
      in the user's request path (§7 of CLAUDE.md).

**Database**
- [ ] `broker_connections` table (see §7) with **RLS** scoping every row to
      `auth.uid()`; index `(user_id, provider)`.
- [ ] Store token/`apiKey` encrypted (pgcrypto / Vault), not plaintext.

**Frontend**
- [ ] Add the provider to `PROVIDERS`; the connect UI renders `fields`
      generically (text/password) for `authType:"apiKey"`, keeps the popup for
      `oauth`. Reuse the existing `BrokerSelection` cards + search.
- [ ] Loading + error states; friendly messages (map 401 → "reconnect").
- [ ] `data-test-id` on every new input/button per `CLAUDE.md` §9.

**Verification**
- [ ] Live: connect a real ProjectX key, run a sync, confirm imported fills match
      the firm dashboard exactly (PnL, timestamps, fees).
- [ ] Jest tests once confirmed working (adapter normalization + Zod schema +
      the query construction), per `CLAUDE.md` §8.

---

## 7. Suggested storage shape (`broker_connections`)

```sql
create table broker_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null,            -- 'projectx' | 'tradovate' | 'rithmic'
  firm_id       text,                     -- 'topstep' | 'apex' | …
  base_url      text,                     -- resolved per firm (ProjectX)
  -- secrets encrypted at rest; NEVER select into the browser
  credentials   bytea not null,           -- pgcrypto‑encrypted {apiKey|refresh_token}
  session_token bytea,                    -- short‑lived JWT cache (ProjectX 24h)
  session_expires_at timestamptz,
  status        text not null default 'connected',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table broker_connections enable row level security;
create policy "own rows" on broker_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on broker_connections (user_id, provider);
```

---

## 8. Phased plan

1. **Doc + contract (this file).** Agree the adapter interface. ← we are here
2. **Refactor** `BrokerContext` + Edge Functions to the router+adapter shape
   *without behavior change* (Tradovate/demo keep working).
3. **ProjectX adapter** behind a feature flag (`system_settings`) — API‑key
   connect + polling sync via `Trade/search`.
4. **DB + encryption** (`broker_connections`, RLS, pgcrypto).
5. **Realtime** via SignalR user hub (optional).
6. **Rithmic** adapter later for advanced users.
7. Keep **CSV** front‑and‑center throughout — it's the guaranteed path.

---

## 9. Deploy & live-test (ProjectX build)

The ProjectX integration is **built and shipped dark** on branch
`feature/projectx-broker-integration`. It stays invisible in production until the
rollout flag is flipped, so deploying it changes nothing for users until you're
ready. Steps:

1. **Apply the migration** (adds `broker_tokens` columns + the disabled
   `projectx_broker` flag):
   ```
   supabase db push          # or: supabase migration up
   ```
2. **Deploy the Edge Functions** (they type-check on deploy):
   ```
   supabase functions deploy broker-oauth
   supabase functions deploy broker-sync
   ```
   The shared adapter (`_shared/projectxAdapter.ts`) is bundled automatically.
3. **Deploy the frontend** as usual (Cloudflare Pages build).
4. **Admin smoke test (flag still OFF):** ProjectX bypasses the flag for admins.
   As your admin account, go to **Brokers → Connect**, pick a firm, paste a real
   ProjectX **username + API key** (from the firm's ProjectX dashboard), choose
   Evaluation/Funded, **Connect**. Then **Sync** and confirm the imported fills
   match the firm dashboard exactly (PnL, timestamps, fees).
   - ⚠️ **Verify the PnL sign convention:** the adapter stores
     `pnl = profitAndLoss − fees`. If ProjectX's `profitAndLoss` is already net of
     fees, drop the `− fees` in `normalizeProjectxTrades` (one line, commented).
5. **Enable for everyone** once verified:
   ```sql
   UPDATE public.feature_flags SET enabled = true WHERE key = 'projectx_broker';
   ```
   (Broker Sync is also plan-gated by the existing `broker_sync` flag — it's an
   Elite feature, and is currently in `COMING_SOON_FEATURES`. Confirm the plan
   gating is how you want it before wide release.)

**Rollback:** `UPDATE feature_flags SET enabled = false WHERE key='projectx_broker';`
instantly hides it again. The Tradovate/demo/CSV paths are untouched throughout.

**No secrets to add:** unlike Tradovate (which needs client-id/secret env vars),
ProjectX uses the user's own API key entered at connect time — nothing to
configure in Edge Function env vars.

---

## 10. Sources
- Damn Prop Firms — platform ecosystems (Tradovate/Rithmic/ProjectX): https://damnpropfirms.com/best-prop-firm-trading-platforms/
- ProjectX supported firms: https://vettedpropfirms.com/prop-firms-that-support-project-x/
- ProjectX Gateway API docs (intro): https://gateway.docs.projectx.com/docs/intro/
- ProjectX auth (API key → JWT): https://gateway.docs.projectx.com/docs/getting-started/authenticate/authenticate-api-key/
- ProjectX Trade/search endpoint: https://gateway.docs.projectx.com/docs/api-reference/trade/trade-search/
- ProjectX realtime (SignalR hubs): https://gateway.docs.projectx.com/docs/realtime/
- Tradovate API access (prop/eval excluded): https://support.tradovate.com/s/article/Tradovate-API-Access
- Rithmic vs Tradovate (access model): https://tradoxvps.com/rithmic-vs-tradovate/
