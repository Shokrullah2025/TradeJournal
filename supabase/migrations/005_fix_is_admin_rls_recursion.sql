-- Fix: is_admin() was a LANGUAGE sql STABLE function, which PostgreSQL inlines
-- directly into RLS policy expressions. When inlined, the SECURITY DEFINER
-- property is lost, so the inner SELECT from public.users also triggers the
-- users_select_own policy → calls is_admin() again → infinite recursion → hang.
--
-- Fix: switch to plpgsql (never inlined) + SET row_security = off (explicit bypass).

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
