# src/pages/ — Page Components

## Files
| File | Route | Purpose |
|------|-------|---------|
| `Dashboard.jsx` | `/dashboard` | Main dashboard with stats cards and charts. |
| `Trades.jsx` | `/trades` | Trade list, filters, and management. |
| `TradeEntry.jsx` | `/trade-entry` | Dedicated trade entry page. |
| `Analytics.jsx` | `/analytics` | Deep analytics — strategy, instrument, time breakdowns. |
| `Backtest.jsx` | `/backtest` | Backtesting module. |
| `RiskCalculator.jsx` | `/risk` | Position sizing and risk calculator. |
| `Billing.jsx` | `/billing` | Subscription management, plan details, payment history. |
| `Billing_backup.jsx` | — | Old backup — not active. |
| `Settings.jsx` | `/settings` | User settings (account, notifications, preferences). |
| `Settings_new.jsx` | — | Newer iteration — check App.jsx for which is active. |
| `Profile.jsx` | `/profile` | User profile — name, avatar, account info. |
| `Login.jsx` | `/login` | Login form. |
| `Register.jsx` | `/register` | Simple registration entry point. |
| `MultiStepRegistration.jsx` | `/signup` | Full multi-step onboarding (account → trial → payment). |
| `OAuthCallback.jsx` | `/oauth/callback` | Handles broker OAuth redirects (Tradovate, Alpaca). |
| `BrokerSelection.jsx` | `/brokers` | Broker connection setup and management. |
| `Admin.jsx` | `/admin` | Admin panel — user management, platform stats. |

## Notes
- All pages behind `/` require authentication via `ProtectedRoute`
- Pages consume context directly — they do not fetch from Supabase themselves
- `_backup` and `_new` suffixed files are old iterations; the unsuffixed file is active
