-- Migration 014: Add preferences JSONB column to user_profiles
-- Stores app preferences (dateFormat, notifications, theme, etc.) in the DB
-- so they persist across devices and are covered by existing user_profiles RLS.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';
