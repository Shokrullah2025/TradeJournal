-- Migration: contact_submissions table
-- Backs the public Contact form (/contact). Every submission from an anonymous
-- visitor is stored here durably. Writes happen ONLY through the contact-submit
-- Edge Function using the service_role key (which bypasses RLS). RLS is enabled
-- with NO policies, so the anon/authenticated clients can neither read nor write
-- this table directly — submissions and the email addresses they contain are
-- never exposed to the browser.

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'read', 'archived', 'spam')),
  metadata    JSONB       NOT NULL DEFAULT '{}',  -- ip, user_agent, email_status
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newest-first review/listing for a future admin inbox, and the lookback used by
-- the Edge Function's per-IP rate limit.
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created
  ON public.contact_submissions (created_at DESC);

-- RLS enabled, intentionally no policies: only the service_role (Edge Function)
-- can touch this table. (CLAUDE.md §1 RLS, §2 never expose PII to the client.)
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
