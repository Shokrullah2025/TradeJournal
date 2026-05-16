# Trade Journal Pro — Project Overview

## What this project is
A SaaS trade journaling platform where traders can log, analyse, and review their trading activity. Users connect their broker accounts, enter trades, view dashboard analytics, run backtests, and manage their subscription.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + custom CSS variables |
| Charts | Recharts |
| Routing | React Router v6 |
| State | React Context API |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Stripe (subscriptions + trials) |
| Broker APIs | Tradovate (OAuth), Alpaca (OAuth) |

## Key Entry Points
- `src/main.jsx` — app bootstrap, provider wrappers
- `src/App.jsx` — route definitions
- `src/lib/supabase.js` — Supabase client (uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)

## Environment Variables (in .env, never commit)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_TRADOVATE_DEMO_CLIENT_ID=
VITE_TRADOVATE_LIVE_CLIENT_ID=
VITE_ALPACA_CLIENT_ID=
```
Secrets (Stripe secret key, broker client secrets, webhook secrets) live ONLY in Supabase Edge Function environment variables — never in the frontend.

## Features
- Trade entry and management (futures + stocks)
- Dashboard with P&L charts, win rate, drawdown, R-multiple
- Calendar view of trading days
- Analytics (strategy, instrument, time-of-day breakdown)
- Backtesting module
- Risk calculator
- Broker OAuth integration (Tradovate, Alpaca)
- Multi-step registration with trial activation
- Stripe billing and subscription management
- Admin panel
- Dark/light theme toggle

## Architecture Notes
- Supabase Row Level Security (RLS) enforces per-user data isolation at the database level
- Broker client secrets never touch the frontend — all secret-bearing calls go through Supabase Edge Functions
- `dist/` is gitignored — never commit build output
- `.env` is gitignored — rotate keys if ever accidentally committed
