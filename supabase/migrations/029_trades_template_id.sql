-- Migration: 029_trades_template_id.sql
-- Record which template a trade was created from, so the trade entry form can
-- reload that template when editing an existing trade. Forward-only and
-- nullable: trades created before this column simply have no template link and
-- fall back to inferring the template from strategy/setup.

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS template_id UUID NULL
    REFERENCES public.trade_templates(id) ON DELETE SET NULL;

-- Index the FK so "trades using template X" lookups and the ON DELETE SET NULL
-- cascade stay fast (CLAUDE.md §7: index every foreign key).
CREATE INDEX IF NOT EXISTS idx_trades_template_id
  ON public.trades (template_id);
