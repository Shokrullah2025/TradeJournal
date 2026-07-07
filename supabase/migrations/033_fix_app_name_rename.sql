-- Fix the app_name rename that never took effect.
--
-- Migrations 030 and 031 tried to rename system_settings.app_name
-- ("Trade Journal Pro" -> "Tradgella" -> "ZalorTrade") but referenced
-- columns `key`/`value`, which don't exist — the table (001) defines
-- `setting_key`/`setting_value`. Neither ever executed: the remote
-- history was baseline-stamped through 031, so db push skips them,
-- and production still holds 'Trade Journal Pro'.
--
-- Migrations are forward-only, so correct it here. Idempotent: only
-- touches the row while it still holds one of the superseded names.

UPDATE system_settings
SET setting_value = 'ZalorTrade'
WHERE setting_key = 'app_name'
  AND setting_value IN ('Trade Journal Pro', 'Tradgella');
