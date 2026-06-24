# Mobile Feature Visibility

> Which features belong on mobile, which don't, and how to wire the gating together.
>
> Audience: Trade Journal Pro engineers. Scope: the authenticated app shell
> (`src/App.jsx`, `src/components/layout/*`) and the feature pages reachable from
> the sidebar / header / profile menu.

---

## 1. TL;DR

Mobile is for **capture and review on the go** — log a trade, check P&L, scan
recent trades, run a quick risk calc. It is **not** for heavy analysis, charting,
config, or admin work. Those stay desktop-only and we surface a friendly
"open on desktop" screen instead of a broken/cramped UI.

Three tiers:

- **✅ Full** — first-class mobile experience (responsive layout required).
- **⚠️ Limited** — reachable on mobile but trimmed to the essentials; deep/dense
  parts deferred to desktop.
- **❌ Desktop-only** — hidden from mobile nav + route-guarded with a redirect/notice.

---

## 2. Feature visibility matrix

| Feature | Route | Source | Mobile | Why | How it's put together on mobile |
|---|---|---|---|---|---|
| **Dashboard** | `/dashboard` | `pages/Dashboard.jsx` | ✅ Full | The at-a-glance check is *the* mobile use case (P&L, win rate, recent trades). | Single-column stack. Stat cards 1-up. Charts shrink to full-width; keep PnL + cumulative, lazy-render the rest below the fold. |
| **Trades** | `/trades` | `pages/Trades.jsx` | ✅ Full | Logging and reviewing trades is the #1 on-the-go task. | Replace the wide table with a stacked **card list** per trade. Filters collapse into a bottom sheet / dropdown. |
| **Trade Entry** | `/trade-entry` *(in-page links)* | `pages/TradeEntry.jsx` | ✅ Full | Quick capture right after a trade — the most valuable mobile flow. | Full-width single-column form, large touch targets, numeric keypads on number inputs. |
| **Risk Calculator** | `/risk-calculator` | `pages/RiskCalculator.jsx` | ✅ Full | Small, self-contained utility that's genuinely useful pre-trade. | Single-column inputs → result card. No multi-pane layout. |
| **Settings** | `/settings` | `pages/Settings_new.jsx` | ✅ Full | Account/preferences must stay reachable everywhere. | Section list → accordion/stacked panels instead of side-by-side tabs. |
| **Profile** | `/profile` *(profile menu)* | `pages/Profile.jsx` | ✅ Full | Account management is universal. | Stacked sections; avatar upload uses the device camera/gallery. |
| **Billing** | `/billing` *(profile menu)* | `pages/Billing.jsx` | ✅ Full | Users manage subscriptions from phones. | Single-column plan cards + Stripe form. **Verify** Stripe Element height + on-screen-keyboard behaviour — it's often the most cramped real-world mobile flow. |
| **Notifications** | header bell | `layout/NotificationBell` | ✅ Full | Lightweight, high-value on mobile. | Keep. Dropdown becomes a full-width sheet on small screens. |
| **Theme toggle** | header | `common/ThemeToggle` | ✅ Full | Tiny, no downside. | Keep in header. |
| **Analytics** | `/analytics` | `pages/Analytics.jsx` | ⚠️ Limited | Useful, but built around dense multi-series charts that don't read well on a phone. | Show **summary metrics + overview** only. Keep the view switcher but let wide charts scroll horizontally; flag deep strategy/instrument/time/drawdown breakdowns as "best on desktop". |
| **Brokers** | `/brokers` | `pages/BrokerSelection.jsx` | ⚠️ Limited | Connecting/disconnecting an OAuth broker works fine; field-mapping config is fiddly. | Allow **connect / disconnect / status**. Defer detailed symbol/account mapping config to desktop. |
| **Backtest** | `/backtest` | `pages/Backtest.jsx` (5.9k LOC) | ❌ Desktop-only | TradingView-style chart with **mouse-driven drawing tools** (mousedown/mousemove drag handles, R/R + Fib tools). Needs precision pointer + screen real estate. | Hide from mobile nav. Route guard → "Backtesting is available on desktop." |
| **Admin Panel** | `/admin` | `pages/Admin.jsx` | ❌ Desktop-only | Dense data tables, metrics dashboards, user management — rarely done from a phone. | Hide from nav. Route guard → desktop notice. |
| **Contact Inbox** | `/admin/contact-submissions` | `pages/ContactMessages.jsx` | ❌ Desktop-only | Wide message/triage table; admin workflow. | Hide from nav. Route guard → desktop notice. |
| **Header trade search** | header | `layout/Header.jsx` | ❌ Hidden *(already)* | No room; trades list has its own filter. | Already `hidden md:flex`. Leave as-is. |
| **Header P&L / Win-rate strip** | header | `layout/Header.jsx` | ❌ Hidden *(already)* | Duplicated on Dashboard; no room. | Already `hidden md:flex`. Leave as-is. |
| **Header profile name/plan text** | header | `layout/Header.jsx` | ❌ Hidden *(already)* | Space; avatar+menu is enough. | Already `hidden md:block`. Leave as-is. |

> Breakpoint: "mobile" = below Tailwind's `lg` (1024px), matching the existing
> sidebar drawer behaviour (`lg:translate-x-0` / `lg:hidden`). Tablets in
> landscape (≥1024px) get the desktop experience.
>
> Note the **768–1023px band**: the header already hides search / the P&L strip /
> profile text at `md` (768px), but the *sidebar* only becomes a drawer below
> `lg`. So in that band the new `useIsMobile` (cutoff `lg`) treats the device as
> mobile — the drawer nav and desktop-only route guards engage, while those
> header chrome items are already gone. This is intentional (a phone in landscape
> or a small tablet behaves as mobile), but call it out so the `md`/`lg` split
> isn't read as a bug.

---

## 3. How to wire it together

The app already gates nav items by **feature flag** in `Sidebar.jsx` (the
`feature` field + `isFeatureEnabled` filter) and guards routes with
`FeatureGate` / `AdminRoute`. Mobile gating should follow the **same shape** so
it's consistent and testable.

### 3.1 One source of truth for "is mobile"

There's currently ad-hoc `window.innerWidth` usage scattered across
`Backtest.jsx`, `BrokerContext.jsx`, etc. Add a single hook instead
(`src/hooks/useIsMobile.js`), with proper listener cleanup per CLAUDE.md §3:

```js
// src/hooks/useIsMobile.js
import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 1023px)"; // below Tailwind `lg`

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange); // required cleanup
  }, []);

  return isMobile;
}
```

### 3.2 Hide desktop-only items from the sidebar

Extend the existing `navigation` array with a `desktopOnly` flag and add it to
the same `.filter(...)` already present in `Sidebar.jsx`:

```js
const isMobile = useIsMobile();

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trades", href: "/trades", icon: BookOpen },
  { name: "Backtest", href: "/backtest", icon: Activity, feature: "backtesting", desktopOnly: true },
  { name: "Brokers", href: "/brokers", icon: Link, feature: "broker_sync" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, feature: "advanced_analytics" },
  { name: "Risk Calculator", href: "/risk-calculator", icon: Calculator, feature: "risk_calculator" },
  { name: "Settings", href: "/settings", icon: Settings },
]
  .filter((item) => !item.feature || isFeatureEnabled(item.feature))
  .filter((item) => !item.desktopOnly || !isMobile);

// adminNavigation has NO filter today — add the same desktopOnly filter to it
// (it currently renders unconditionally when user?.role === "admin")
```

### 3.3 Guard the routes (deep links / bookmarks)

Hiding the nav item isn't enough — a bookmarked `/backtest` or `/admin` URL must
not render a broken page on a phone. Add a small `DesktopOnlyRoute` wrapper next
to the existing guards in `components/auth/ProtectedRoute.jsx`:

```jsx
import { Monitor } from "lucide-react"; // ProtectedRoute.jsx imports no icons today
import { useIsMobile } from "../../hooks/useIsMobile";

function DesktopOnlyRoute({ children }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
           data-testid="desktop-only-notice">
        <Monitor className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold">Best on desktop</h2>
        <p className="text-gray-500 mt-2">
          This feature needs a larger screen. Open Trade Journal on a computer to use it.
        </p>
      </div>
    );
  }
  return children;
}
```

Wrap `Backtest`, `Admin`, and `ContactMessages` routes in `App.jsx`, stacking
with the existing `FeatureGate` / `AdminRoute`. Put `DesktopOnlyRoute` on the
**outside** — `FeatureGate` fails open while flags are loading (it renders
children during `loading`), so an outer desktop guard ensures a mobile user
never briefly renders the heavy Backtest page during flag load.

### 3.4 Make the ✅ Full / ⚠️ Limited pages responsive

These are layout changes inside each page, not gating:

- **Tables → cards** on Trades (and any dense `<table>`): render a stacked card
  list below `lg`. Tailwind: `hidden lg:table` on the table, `lg:hidden` on the
  card list.
- **Multi-column → single column**: swap `grid-cols-2/3/4` for
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` so panels stack on phones.
- **Charts**: full-width with a fixed mobile height; wrap wide charts in an
  `overflow-x-auto` scroller rather than squashing them.
- **Filter bars / tab strips**: collapse into a dropdown or bottom sheet.
- Keep the existing `hidden md:*` header patterns — they're already correct.

### 3.5 Don't break the existing rules

- `useIsMobile` must clean up its `matchMedia` listener (CLAUDE.md §3).
- New nav/route states still need `data-testid`s (CLAUDE.md §9) — e.g.
  `desktop-only-notice` above.
- No new server data, queries, or schema — this is presentation/gating only.

---

## 4. At-a-glance summary

```
✅ Full mobile      Dashboard · Trades · Trade Entry · Risk Calculator ·
                    Settings · Profile · Billing · Notifications · Theme

⚠️ Limited          Analytics (overview + summary; deep charts → desktop)
                    Brokers   (connect/disconnect; mapping config → desktop)

❌ Desktop-only      Backtest · Admin Panel · Contact Inbox
                    (+ already-hidden header search / stats strip / profile text)
```

---

## 5. Suggested rollout order

1. Add `useIsMobile` hook (foundation, no visible change).
2. Add `DesktopOnlyRoute` + guard Backtest / Admin / Contact Inbox.
3. Filter `desktopOnly` items out of the sidebar (incl. admin section).
4. Responsive passes per page, in value order: Trades → Dashboard →
   Trade Entry → Risk Calculator → Settings → Billing/Profile.
5. Trim Analytics + Brokers to their "limited" mobile scope.
6. Write Jest/RTL tests once each piece is signed off (CLAUDE.md §8).
