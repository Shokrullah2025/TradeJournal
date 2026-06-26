-- Tradgella — Rename app_name setting
--
-- The brand was renamed from "Trade Journal Pro" to "Tradgella". Migration 001
-- seeded system_settings.app_name = 'Trade Journal Pro'. Migrations are
-- forward-only (never edit a historical migration), so update the value here.
-- Idempotent: only touches the row if it still holds the old value.

UPDATE system_settings
SET value = 'Tradgella'
WHERE key = 'app_name'
  AND value = 'Trade Journal Pro';
