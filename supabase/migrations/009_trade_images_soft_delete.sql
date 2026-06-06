-- Add soft-delete support to trade_images.
-- Deleted images are hidden from normal queries but remain in storage
-- and can be recovered by an admin via deleted_at IS NOT NULL filter.
ALTER TABLE public.trade_images
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_images_active
  ON public.trade_images (trade_id, sort_order)
  WHERE deleted_at IS NULL;
