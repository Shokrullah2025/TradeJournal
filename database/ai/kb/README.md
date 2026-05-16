# database/ — Database Reference

## Files
| File | Purpose |
|------|---------|
| `schema.sql` | Original database schema — tables, indexes, and constraints. |
| `schema_v2.sql` | Updated schema with additional tables and columns added during development. |
| `api-endpoints.js` | Reference file documenting API endpoint patterns used with Supabase. |

## Key Tables (from schema)
- `profiles` — user profile data linked to Supabase auth users
- `trades` — individual trade records (entry/exit price, instrument, P&L, dates)
- `backtest_sessions` — saved backtesting sessions
- `broker_connections` — OAuth tokens for connected brokers
- `subscriptions` — Stripe subscription and trial data

## Notes
- The actual live migrations are in `supabase/migrations/` — those are what Supabase runs
- `schema.sql` / `schema_v2.sql` here are reference docs, not the source of truth for production
- All tables have RLS enabled — see `supabase/migrations/002_rls_policies.sql`
- See `DATABASE.md` in this folder for the full schema documentation
