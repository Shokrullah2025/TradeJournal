-- ZalorTrade — Rename app_name setting
--
-- The brand was renamed from "Tradgella" to "ZalorTrade". Migration 030 set
-- system_settings.app_name = 'Tradgella'. Migrations are forward-only (never
-- edit a historical migration), so update the value here.
-- Idempotent: only touches the row if it still holds the old value.

UPDATE system_settings
SET value = 'ZalorTrade'
WHERE key = 'app_name'
  AND value = 'Tradgella';
