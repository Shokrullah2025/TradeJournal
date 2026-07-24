-- Contact Inbox attachments
--
-- Inbound replies to support@ can carry files (a screenshot of a broken screen,
-- a PDF receipt). contact-inbound now downloads them from Resend and stores
-- them here, recording {path, filename, contentType, size} in
-- contact_submissions.metadata.attachments so the inbox can render them.
--
-- The bucket is PRIVATE: these files come from unauthenticated senders and may
-- contain personal data, so they are never publicly addressable. The admin UI
-- reads them through short-lived signed URLs (createSignedUrls), which the
-- SELECT policy below authorizes. Writes happen only from the Edge Function
-- with the service_role key, which bypasses RLS — no INSERT policy is granted
-- to any signed-in role on purpose.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-attachments',
  'contact-attachments',
  FALSE,
  10485760, -- 10MB per file; contact-inbound skips anything larger
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Admins read (via signed URLs) and delete. Deletes matter: the inbox removes a
-- conversation's files when the conversation or message is deleted, so nothing
-- is orphaned in storage after the row is gone.
DROP POLICY IF EXISTS "contact_attachments_select_admin" ON storage.objects;
CREATE POLICY "contact_attachments_select_admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contact-attachments' AND public.is_admin());

DROP POLICY IF EXISTS "contact_attachments_delete_admin" ON storage.objects;
CREATE POLICY "contact_attachments_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contact-attachments' AND public.is_admin());
