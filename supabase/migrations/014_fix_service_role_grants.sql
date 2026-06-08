-- Edge Functions use the service_role key which bypasses RLS but still
-- requires table-level GRANT permissions. Without these, every Supabase
-- SDK query from an Edge Function fails with "permission denied for table".

GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure future tables created in migrations also get these grants automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
