# Trade Journal Pro — Engineering Standards

> Claude must read and apply every rule in this file before writing any code.
> These are non-negotiable standards. When in doubt, be more strict, not less.

---

## 1. Database — Supabase (PostgreSQL)

- **All data operations go through the Supabase SDK** (`@supabase/supabase-js`). Never bypass it with raw fetch to PostgREST.
- **Never store sensitive data in localStorage or sessionStorage** — no tokens, no user PII, no trade data. Supabase Auth manages the session cookie automatically.
- **Every table must have Row Level Security (RLS) enabled.** Every query is implicitly scoped to `auth.uid()`. Never add a `WHERE user_id = ?` in application code to compensate for missing RLS — fix the policy instead.
- **Always use `.single()` when expecting one row.** If the query can return zero rows, handle the `null` case explicitly — do not assume data exists.
- **Supabase client is a singleton.** Import from `src/lib/supabase.js` only. Never call `createClient()` more than once.
- **Migrations live in `supabase/migrations/`.** Never alter the production schema directly in the Supabase dashboard — always write a migration file first and commit it.
- **Use `BIGSERIAL` or `UUID` (via `gen_random_uuid()`) as primary keys.** Never use `Date.now()` or `Math.random()` as an ID — these cause collisions.
- **Use `TIMESTAMPTZ` (timestamp with time zone) for all date/time columns.** Store everything in UTC. Format for display in the UI layer using the user's timezone preference.

---

## 2. Security

### Authentication & Authorization
- **Never trust the client for user identity.** Always resolve `user_id` from `supabase.auth.getUser()` server-side (in Edge Functions). Never accept `user_id` as a request body parameter.
- **Never store secrets in the frontend.** `VITE_` prefixed env vars are public — they appear in the compiled JS bundle. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe to expose. All broker client secrets, Stripe secret keys, and SMTP credentials go in Supabase Edge Function environment variables only.
- **Broker OAuth token exchange must happen in a Supabase Edge Function.** Never exchange OAuth authorization codes in the browser — the client secret would be exposed.
- **JWT tokens are managed by Supabase Auth.** Do not manually issue, decode, or verify JWTs in application code. Use `supabase.auth.getSession()` and `supabase.auth.getUser()`.
- **Bootstrap auth state with `getSession()`, not `onAuthStateChange()` alone.** On page load, `onAuthStateChange` only fires after Supabase completes a token refresh network request. If that request is slow or pending, the app stays stuck on the loading screen. Always call `supabase.auth.getSession()` first — it reads the stored session from localStorage instantly with no network round-trip — then register `onAuthStateChange` to handle all subsequent events (sign-in, sign-out, token refresh). Skip the `INITIAL_SESSION` event in `onAuthStateChange` since `getSession()` already resolved it. This pattern was added after a confirmed production bug where the loading screen hung indefinitely waiting for the `/token` endpoint to respond.
  ```js
  // Correct pattern in AuthContext
  supabase.auth.getSession().then(({ data: { session } }) => {
    resolveSession(session); // unblocks loading immediately
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return; // already handled above
    resolveSession(session);
  });
  ```
- **Implement rate limiting on all mutation operations.** Use Supabase's built-in rate limiting or add it in Edge Functions. Sensitive endpoints (login, register, password reset) must be rate-limited.

### Input Validation
- **Validate all user input with Zod before it touches the database.** Define schemas in `src/lib/schemas/` and reuse them across forms and API calls. Never insert raw form values.
- **Sanitize all string inputs** that will be displayed as HTML. Use React's default JSX escaping — never use `dangerouslySetInnerHTML` unless the content is explicitly sanitized with DOMPurify first.
- **Numeric fields (price, quantity, PnL) must be parsed and validated as numbers** before storage. Reject `NaN`, `Infinity`, and values outside domain-valid ranges (e.g., price cannot be negative).
- **File uploads**: validate MIME type and file size server-side in the Edge Function before uploading to Supabase Storage. Never trust the `Content-Type` header from the client. Maximum file size: 5MB for trade images, 2MB for avatars.

### General Security Rules
- **No SQL string concatenation.** Always use parameterized queries (the Supabase SDK handles this — do not construct raw SQL strings with user input).
- **Audit log sensitive actions** — login, logout, password change, payment method add/remove, subscription changes — by inserting into the `audit_logs` table.
- **Never log sensitive data** — no passwords, tokens, card numbers, or PII in `console.log()`, even in development. Use `[REDACTED]` placeholders in error messages shown to users.
- **HTTPS only.** Never make API calls over HTTP. All Supabase and external service calls use HTTPS by default — do not downgrade.

---

## 3. Memory & Performance

### Memory Leaks (React)
- **Every `useEffect` that sets up a subscription, listener, or timer must return a cleanup function.**
  ```js
  useEffect(() => {
    const channel = supabase.channel('trades').on(...).subscribe()
    return () => supabase.removeChannel(channel)  // required
  }, [])
  ```
- **Supabase realtime subscriptions must be unsubscribed on component unmount.** Use `supabase.removeChannel()` in the cleanup.
- **`setInterval` and `setTimeout` must be cleared in cleanup.** Store the handle and call `clearInterval`/`clearTimeout` in the return function.
- **Event listeners added to `window` or `document` must be removed in cleanup.**
- **Cancel async operations on unmount.** Use an `isMounted` flag or AbortController to prevent `setState` calls after a component has unmounted.
  ```js
  useEffect(() => {
    let cancelled = false
    fetchData().then(data => { if (!cancelled) setState(data) })
    return () => { cancelled = true }
  }, [])
  ```
- **Do not store large arrays in component state when they can live in context.** Trade lists, analytics data, and any dataset over 100 items must live in the appropriate Context, not in local component state.
- **Memoize expensive computations** with `useMemo`. Statistics calculations (win rate, profit factor, drawdown, Sharpe ratio) that iterate over trade arrays must be wrapped in `useMemo` with the trades array as the dependency.
- **Memoize callbacks passed as props** with `useCallback` to prevent unnecessary child re-renders.

### Performance
- **Paginate trade queries.** Never fetch all trades at once. Use `.range(from, to)` for paginated loads. Default page size: 50 trades.
- **Cache analytics in the `daily_performance` and `monthly_performance` tables.** Do not compute aggregate stats live on every dashboard load by scanning all trades. Trigger a recalculation only when trades are added/modified.
- **Lazy load routes.** All page-level components must use `React.lazy()` and `<Suspense>`. Never import pages directly at the top of `App.jsx`.
- **Images must be optimized before upload.** Resize and compress trade screenshots client-side (max 1200px wide, 80% quality JPEG) before sending to Supabase Storage. Use the browser Canvas API for resizing.
- **Debounce search and filter inputs** (300ms minimum) to avoid a query on every keystroke.
- **Charts must only render when visible.** Use `IntersectionObserver` to defer chart rendering until the chart container enters the viewport.

---

## 4. API Standards (Supabase SDK)

### Query Patterns
- **Always select only the columns you need.** Never use `.select('*')` in production code — enumerate columns explicitly. This reduces payload size and avoids accidentally exposing new columns added to the schema.
  ```js
  // Bad
  supabase.from('trades').select('*')
  
  // Good
  supabase.from('trades').select('id, instrument, entry_price, exit_price, pnl, entry_date, status')
  ```
- **Always handle both `data` and `error` from Supabase responses.**
  ```js
  const { data, error } = await supabase.from('trades').select(...)
  if (error) throw new Error(error.message)
  ```
  Never silently ignore the `error` field.
- **Use `.order()` on all list queries.** Never rely on database insertion order. Default: `order('entry_date', { ascending: false })`.
- **Use `.eq('user_id', userId)` as a belt-and-suspenders check** even when RLS is enabled — defense in depth.
- **Use Supabase's `upsert()` for idempotent operations** (e.g., broker trade sync) to avoid duplicates without extra round-trips.

### Edge Functions
- **Edge Functions handle:** Stripe webhooks, broker OAuth token exchange, email triggers, scheduled analytics recalculation.
- **Edge Functions must validate the request origin** (e.g., verify Stripe webhook signature with `stripe.webhooks.constructEvent()`).
- **Edge Functions must return consistent JSON responses:**
  ```json
  { "success": true, "data": {} }
  { "success": false, "error": "Human-readable message" }
  ```
- **Edge Functions must not exceed 150ms for p95 latency** on hot paths. Offload slow work (email, analytics recalc) to background tasks.

---

## 5. Code Quality & Consistency

### Structure & Reuse
- **Check for an existing function, hook, or utility before writing a new one.** Common patterns live in:
  - `src/lib/supabase.js` — Supabase client
  - `src/lib/schemas/` — Zod validation schemas
  - `src/hooks/` — custom React hooks (`useTrades`, `useAuth`, `useBilling`)
  - `src/utils/` — pure utility functions (PnL calculation, date formatting, number formatting)
  - `src/context/` — global state (Auth, Trade, Billing, Broker, Backtest, Theme)
- **PnL calculation lives in one place: `src/utils/pnl.js`.** Never duplicate the formula inline in a component.
- **Date formatting lives in one place: `src/utils/date.js`** using `date-fns`. Never call `new Date().toLocaleDateString()` inline — use the shared formatter so timezone and locale settings are respected.
- **Currency formatting lives in one place: `src/utils/currency.js`.** Always use the user's currency preference from their profile.

### Naming Conventions
- **Components**: PascalCase (`TradeCalendar.jsx`, `StatsCard.jsx`)
- **Hooks**: camelCase with `use` prefix (`useTradeStats.js`, `useAuth.js`)
- **Utilities**: camelCase (`calculatePnL`, `formatCurrency`, `parseDate`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE_BYTES`, `DEFAULT_PAGE_SIZE`)
- **Database columns**: snake_case (match the SQL schema exactly)
- **React props and state**: camelCase

### Component Rules
- **One component per file.** No multi-component files except for tightly coupled sub-components that are never used independently.
- **Props must be typed with PropTypes or TypeScript.** Every component that accepts props must declare them. No bare `props` spreading without explicit destructuring.
- **No inline styles.** Use Tailwind classes only. If a style cannot be expressed with Tailwind, add it to the component's CSS module — never use `style={{}}` for layout decisions.
- **Error boundaries must wrap every major page section.** Users must never see a white screen from a React render error — show a graceful fallback UI.
- **Loading states are mandatory.** Every async operation must have an explicit loading state shown to the user. Never leave the user staring at empty content while data loads.

### State Management
- **Local state (`useState`)**: UI-only state — modal open/close, form field values, hover states.
- **Context state**: data shared across multiple components — user auth, trade list, subscription status.
- **Never put server data in both local state and context simultaneously** — pick one source of truth.
- **Context actions must be atomic.** When an action modifies both local state and the database, the DB write must succeed before updating local state (or use optimistic updates with explicit rollback on error).

---

## 6. Error Handling

- **All async functions must be wrapped in try/catch.** Never let unhandled promise rejections reach the user.
- **User-facing error messages must be human-readable.** Never show raw Supabase/PostgreSQL error strings to users. Map known error codes to friendly messages:
  - `23505` (unique violation) → "An account with this email already exists."
  - `PGRST116` (no rows) → "Not found."
  - Network errors → "Connection error. Please check your internet and try again."
- **Log full error details to the console in development only.** In production, send errors to an error tracking service (Sentry or similar) — not to `console.error`.
- **Validate Supabase storage upload errors** — storage quota exceeded, file too large, invalid MIME type — and show specific messages.
- **Stripe errors must map to subscription status updates** — failed payment → show billing alert, not a generic error.

---

## 7. Scalability

- **Design for stateless operation.** No server-side sessions — all state is in Supabase (DB + Auth). Multiple Edge Function instances can run in parallel without coordination.
- **Background jobs for heavy work.** Analytics recalculation (`daily_performance`, `monthly_performance`) must run asynchronously — triggered by a Supabase database webhook after a trade is inserted/updated, not synchronously in the user's request path.
- **Index every foreign key and every column used in `WHERE`, `ORDER BY`, or `GROUP BY`.** If you add a new query pattern, add the corresponding index in a migration.
- **Avoid N+1 queries.** Use Supabase's relational queries (`.select('trades(id, pnl), trading_accounts(name)')`) to join data in a single query. Never loop and query.
- **Use Supabase connection pooler (PgBouncer) for all queries.** Use the pooler connection string (port 6543) in Edge Functions. Direct connections (port 5432) are only for migrations.
- **Feature flags for large rollouts.** New features that change data schema or user flow must be released behind a flag queryable from `system_settings` table. Never push breaking changes to all users simultaneously.

---

## 8. Testing Requirements

### When to Write Tests — Test-Driven Development (TDD) is mandatory

**Before writing any code, write the Jest tests first.** This is non-negotiable. The workflow is:

1. **Write the tests** — define every expected behaviour, edge case, and error state in a `.test.js` / `.test.jsx` file before a single line of implementation exists.
2. **Run the tests** — confirm they all fail (red). If a test passes before the code is written, the test is wrong.
3. **Write the code** — implement only enough to make the tests pass.
4. **Run the tests again** — confirm they all pass (green).
5. **Refactor if needed** — clean up the code while keeping all tests green.

This applies to **every** feature, function, component, and bug fix — no exceptions.

**Why:** Writing tests first forces you to define exactly what the code must do before writing it. This catches design problems early, ensures every code path is covered, and prevents regressions as the codebase grows.

**What the tests must cover before writing code:**
- Happy path — the feature works correctly with valid input
- Every edge case — empty arrays, zero values, null/undefined, boundary values, long strings
- Every error state — what the user sees when something fails, network errors, validation failures
- Every input variation — different trade directions, account types, date ranges, currencies

- **Once a test is written, it must never be deleted** unless the feature itself is removed. Tests are a contract.

### Jest Setup & Convention
- **Use Jest + React Testing Library** for all component and integration tests. Vitest is used for pure utility unit tests (it is already configured in `vitest.config.js`). Both coexist.
- **Test file naming**:
  - Component tests: `ComponentName.test.jsx` — co-located in the same folder as the component
  - Hook tests: `useHookName.test.js` — co-located with the hook
  - Utility tests: `utilName.test.js` — co-located with the utility
  - Integration tests: `tests/integration/featureName.test.js`
- **Each test file must have at minimum:**
  1. A happy path test (the feature works as expected with valid input)
  2. An edge case test (empty data, zero values, null, long strings)
  3. An error state test (what the user sees when something fails)

### What to Test
- **Utility functions** (`src/utils/`): pure unit tests — input in, output verified. Every function, no exceptions once confirmed happy.
- **Context actions** (`src/context/`): test that dispatching an action updates state correctly (e.g., adding a trade updates the trades array and recalculates stats).
- **Components with user interaction**: test that clicking a button, submitting a form, or selecting a dropdown produces the correct output or calls the correct function.
- **Supabase query logic**: use `supabase-js` mock (`jest.mock('@supabase/supabase-js')`) to verify correct table, filters, and columns are used — not to test Supabase itself, but to verify your query is constructed correctly.
- **Data validation (Zod schemas)**: test that valid data passes and invalid data (wrong type, out of range, missing required field) is correctly rejected with the right error message.
- **RLS enforcement**: in integration tests against the test Supabase project, verify that a logged-in user cannot read, update, or delete another user's trades, templates, or profile data.

### Data Verification Tests
- **After any trade CRUD operation, verify the database reflects the change.** In integration tests, insert a trade, read it back, and assert the returned data matches exactly — including PnL calculation, timestamps, and all fields.
- **PnL calculation must have a dedicated test suite** in `src/utils/pnl.test.js` covering:
  - Long trade profit, long trade loss
  - Short trade profit, short trade loss
  - Zero quantity, zero price (edge cases)
  - Trades with commission and swap costs included
  - Fractional quantities (crypto/forex)
- **Statistics calculations (win rate, profit factor, drawdown, Sharpe ratio) must each have a test** with a known dataset where the expected output can be manually verified.

### Example Test Structure
```js
// src/utils/pnl.test.js
import { calculatePnL } from './pnl'

describe('calculatePnL', () => {
  it('calculates profit for a long trade', () => {
    expect(calculatePnL({ direction: 'long', entry: 100, exit: 110, qty: 10, fees: 5 })).toBe(95)
  })
  it('calculates loss for a long trade', () => {
    expect(calculatePnL({ direction: 'long', entry: 110, exit: 100, qty: 10, fees: 5 })).toBe(-105)
  })
  it('returns 0 for zero quantity', () => {
    expect(calculatePnL({ direction: 'long', entry: 100, exit: 110, qty: 0, fees: 0 })).toBe(0)
  })
})
```

---

## 9. `data-testid` Attributes (Automation Readiness)

### Rule: Every Interactive and Data-Displaying Element Must Have a `data-testid`
Adding `data-testid` attributes now costs nothing and makes automated testing, QA, and debugging possible without touching the component code later.

### Where to Add `data-testid`
Add `data-testid` to every element that:
- Is a **button or clickable action** (`<button>`, `<a>` used as action)
- Is a **form input, select, or textarea**
- Is a **form itself** (for submit targeting)
- Displays **key data values** (PnL amount, win rate, trade count, account balance)
- Is a **modal, drawer, or dialog container**
- Is a **navigation link** in the sidebar or header
- Is a **table row or list item** that represents a data record
- Is an **error message or alert** shown to the user
- Is a **loading spinner or skeleton** state
- Is a **chart container** (even if the chart internals can't be tested)

### Naming Convention
Format: `data-testid="[section]-[element]-[modifier?]"`

```
// Buttons
data-testid="trade-form-submit-btn"
data-testid="trade-form-cancel-btn"
data-testid="modal-close-btn"
data-testid="sidebar-logout-btn"

// Inputs
data-testid="trade-form-instrument-input"
data-testid="trade-form-entry-price-input"
data-testid="trade-form-direction-select"

// Data display
data-testid="stats-win-rate-value"
data-testid="stats-total-pnl-value"
data-testid="stats-trade-count-value"
data-testid="trade-row-{id}"           // dynamic: use the trade ID
data-testid="trade-row-pnl-{id}"

// Navigation
data-testid="sidebar-dashboard-link"
data-testid="sidebar-trades-link"
data-testid="sidebar-analytics-link"
data-testid="header-profile-menu-btn"

// Modals & containers
data-testid="trade-entry-modal"
data-testid="backtest-modal"
data-testid="billing-modal"
data-testid="day-detail-modal"

// States
data-testid="trades-loading-spinner"
data-testid="trades-empty-state"
data-testid="error-banner"
data-testid="auth-error-message"

// Forms
data-testid="login-form"
data-testid="register-form"
data-testid="trade-entry-form"
```

### Rules
- **`data-testid` values must be unique within a page** unless they are part of a list (where the ID is appended, e.g., `trade-row-{id}`).
- **Never use `data-testid` as a CSS selector** — it is for testing only. Style with class names.
- **`data-testid` must not change once assigned** — renaming them breaks automated tests. Treat them like a public API.
- **Do not add `data-testid` to purely decorative elements** (icons, dividers, background shapes) — only meaningful UI elements.
- **Dynamic lists**: the container gets a `data-testid`, and each item gets `data-testid="[item-name]-{id}"` using the record's database ID.

### Example
```jsx
// Trade list item
<tr data-testid={`trade-row-${trade.id}`}>
  <td data-testid={`trade-row-instrument-${trade.id}`}>{trade.instrument}</td>
  <td data-testid={`trade-row-pnl-${trade.id}`}
      className={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
    {formatCurrency(trade.pnl)}
  </td>
</tr>

// Stats card
<div data-testid="stats-win-rate-card">
  <span data-testid="stats-win-rate-value">{winRate}%</span>
</div>

// Submit button
<button data-testid="trade-form-submit-btn" type="submit">
  Save Trade
</button>
```

---

## 9. Git & Deployment

- **Never commit secrets.** `.env` is gitignored. `.env.example` must exist with placeholder values for every variable the app needs.
- **Branch naming**: `feature/short-description`, `fix/short-description`, `chore/short-description`.
- **Every PR must include**: what changed, why, and how to test it.
- **Database migrations are forward-only.** Write migrations that can be applied without downtime (add columns as nullable first, backfill, then add constraint). Never drop a column without a deprecation period.
- **Supabase schema changes go through `supabase db push`** — never alter production tables manually.

---

## 10. Checklist Before Writing Any Code

Before implementing any feature or fix, confirm:

- [ ] **Have the Jest tests been written first?** Write tests before writing any implementation code. Define the happy path, all edge cases, and all error states in the test file first — then write the code to make them pass. This is mandatory, not optional.
- [ ] Does an existing utility, hook, or component already do this? (Check `src/utils/`, `src/hooks/`, `src/context/`)
- [ ] Does this query have RLS to enforce user data isolation?
- [ ] Does this input go through Zod validation before hitting the database?
- [ ] Are all secrets in Edge Function env vars, not in `VITE_` vars?
- [ ] Does every `useEffect` with a subscription/timer have a cleanup function?
- [ ] Are loading and error states handled and visible to the user?
- [ ] Is this query paginated or does it risk fetching thousands of rows?
- [ ] Does the column selection avoid `SELECT *`?
- [ ] Are user-facing error messages friendly and not exposing internals?
- [ ] Do all interactive elements and data displays have a `data-testid`?
- [ ] Are `data-testid` values unique, stable, and following the `[section]-[element]-[modifier]` naming convention?
