-- ZalorTrade — Rename app_name setting
--
-- The brand was renamed from "Tradgella" to "ZalorTrade". Migration 030
-- intended to set the Tradgella name but referenced columns key/value that
-- don't exist — the live table uses setting_key/setting_value — so production
-- still holds the original 'Trade Journal Pro'. Migrations are forward-only
-- (never edit a historical migration), so this one corrects the column names
-- and covers both possible current values.
-- Idempotent: only touches the row while it still holds a pre-rebrand value.

UPDATE system_settings
SET setting_value = 'ZalorTrade'
WHERE setting_key = 'app_name'
  AND setting_value IN ('Trade Journal Pro', 'Tradgella');
