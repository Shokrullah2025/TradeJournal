# supabase/ — Supabase Configuration

## Structure
```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql          Base tables (profiles, trades, etc.)
│   ├── 002_rls_policies.sql            Row Level Security policies
│   ├── 003_storage_policies.sql        Storage bucket policies (avatars)
│   ├── 004_grants.sql                  Permission grants
│   └── 005_fix_is_admin_rls_recursion.sql  Fix for infinite recursion in admin RLS check
└── seeds/
    └── seed_futures_trades.sql         Sample futures trade data for development/testing
```

## Row Level Security (RLS)
Every table has RLS enabled. The core rule: `auth.uid() = user_id`. Users can only read and write their own rows. The admin check (`is_admin`) had an RLS recursion bug that was fixed in migration 005.

## Storage
- Bucket: `avatars` — profile pictures
- Policies in `003_storage_policies.sql` restrict uploads to the authenticated user's own folder

## Running Migrations
Apply via Supabase CLI:
```bash
supabase db push
```
Or apply individual files in the Supabase dashboard SQL editor in order (001 → 005).

## Edge Functions
Secrets (Stripe secret key, broker client secrets) live in Edge Function environment variables set via the Supabase dashboard — never in the frontend codebase.
