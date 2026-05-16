-- ============================================================
-- Trade Journal Pro — Storage RLS Policies
-- Migration: 003_storage_policies.sql
-- Run this AFTER 001 and 002 have succeeded.
-- ============================================================

-- Avatars bucket (public read, owner write)
CREATE POLICY "avatars_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Trade images bucket (private — owner only)
CREATE POLICY "trade_images_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'trade-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "trade_images_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trade-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "trade_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trade-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
