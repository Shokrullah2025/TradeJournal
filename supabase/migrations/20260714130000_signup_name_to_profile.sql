-- ─────────────────────────────────────────────────────────────────────────
-- Copy the signup first/last name into user_profiles
-- ─────────────────────────────────────────────────────────────────────────
-- Registration captures first_name / last_name and stores them in the auth
-- user's metadata (raw_user_meta_data). But handle_new_auth_user only created
-- the public.users row — it never created a user_profiles row, so the name was
-- stranded in auth metadata and never reached the tables the app reads:
--   • the header/dashboard name (user.firstName ← user_profiles.first_name)
--     fell back to the email handle, and
--   • stripe-create-customer (which reads user_profiles.first_name/last_name)
--     created Stripe customers with no name.
--
-- Fix the trigger to also create the profile row, seeded from the signup
-- metadata, and backfill every existing user who is missing one.
-- Forward-only and idempotent.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  -- Seed the profile with the name captured at signup. first_name/last_name are
  -- NOT NULL (default ''), so coalesce missing metadata to an empty string.
  INSERT INTO public.user_profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: create the missing profile rows for existing users, pulling the
-- name from their auth metadata. Users who already have a profile are left
-- untouched (ON CONFLICT DO NOTHING).
INSERT INTO public.user_profiles (user_id, first_name, last_name)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', '')
FROM auth.users au
LEFT JOIN public.user_profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
