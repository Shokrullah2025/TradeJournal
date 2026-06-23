-- Migration: 028_trade_templates_visible_fields.sql
-- Persist the per-field visibility config and custom fields built in the
-- Settings template editor (Configure Fields tab). Previously these were
-- dropped on save because no column existed to hold them.

ALTER TABLE public.trade_templates
  ADD COLUMN IF NOT EXISTS visible_fields JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_fields  JSONB NOT NULL DEFAULT '[]';
