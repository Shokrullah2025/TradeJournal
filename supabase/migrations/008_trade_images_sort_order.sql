-- ============================================================
-- Trade Journal Pro — Add sort_order to trade_images
-- Migration: 008_trade_images_sort_order.sql
-- ============================================================

ALTER TABLE public.trade_images
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trade_images_sort ON public.trade_images (trade_id, sort_order);
