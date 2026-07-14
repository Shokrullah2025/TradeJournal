-- ============================================================
-- Add the 'account' notification category.
--
-- Notifications only ever covered broker_sync / billing / performance /
-- security / contact. There was no category for account-lifecycle messages, so
-- the welcome notification a new user should see on their first sign-in had
-- nowhere to live and was never written.
--
-- The CHECK constraint was created inline on the column in 020 and re-created
-- by name in 20260708210946, so it carries that explicit name now.
-- ============================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (category IN (
    'broker_sync',
    'billing',
    'performance',
    'security',
    'contact',
    'account'
  ));
