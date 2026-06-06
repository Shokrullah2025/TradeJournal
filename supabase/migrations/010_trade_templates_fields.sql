-- Migration: 010_trade_templates_fields.sql
-- Adds the columns needed by the Settings template builder and Backtest
-- page that didn't exist in the original trade_templates schema.

ALTER TABLE public.trade_templates
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS fields       JSONB        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_default   BOOLEAN      NOT NULL DEFAULT FALSE;

-- Index for the fields JSONB so strategy/setup queries stay fast.
CREATE INDEX IF NOT EXISTS idx_trade_templates_fields
  ON public.trade_templates USING GIN (fields);
