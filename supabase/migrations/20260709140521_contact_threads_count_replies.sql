-- ============================================================
-- ZalorTrade — Count admin replies in the thread message count
-- Migration: 20260709140521_contact_threads_count_replies.sql
--
-- The inbox row badge (message icon + number) showed only visitor
-- emails: contact_threads.message_count was COUNT(*) over the sender's
-- rows in contact_submissions. Admin replies are not rows — they live
-- in metadata.replies (JSONB array written by the contact-reply Edge
-- Function) — so a thread with 1 email and 3 replies still showed "1".
--
-- Redefine the view so message_count adds the replies stored on each
-- row, matching the count the open-thread modal shows (emails +
-- replies). jsonb_typeof guards against a missing or malformed
-- metadata.replies value. Same shape/grants as 034 otherwise;
-- CREATE OR REPLACE keeps the 034 grant and security_invoker intact.
-- ============================================================

CREATE OR REPLACE VIEW public.contact_threads
WITH (security_invoker = true) AS
SELECT DISTINCT ON (email)
  email,
  id         AS latest_id,
  name       AS latest_name,
  subject    AS latest_subject,
  message    AS latest_message,
  status     AS latest_status,
  created_at AS last_message_at,
  COUNT(*) OVER (PARTITION BY email)
    + SUM(
        CASE
          WHEN jsonb_typeof(metadata -> 'replies') = 'array'
            THEN jsonb_array_length(metadata -> 'replies')
          ELSE 0
        END
      ) OVER (PARTITION BY email)                                 AS message_count,
  COUNT(*) FILTER (WHERE status = 'new') OVER (PARTITION BY email) AS new_count
FROM public.contact_submissions
ORDER BY email, created_at DESC;
