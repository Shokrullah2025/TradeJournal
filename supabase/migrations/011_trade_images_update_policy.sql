-- Add missing UPDATE policy for trade_images.
-- Without this, both soft-delete (setting deleted_at) and sort-order reordering
-- were silently blocked by RLS — the .update() call returned success but matched 0 rows.
CREATE POLICY "trade_images_update_own"
  ON public.trade_images FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
