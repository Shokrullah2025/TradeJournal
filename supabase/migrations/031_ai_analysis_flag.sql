-- 031_ai_analysis_flag.sql
-- Seeds the feature flag for the AI Analysis futures-signal page
-- (rule-based direction/entry/stop/target with backtested hit-rates).
-- Mirrors the catalog entry in src/lib/featureFlags.js. Free users are
-- excluded by default, matching the other analysis features; admins can
-- adjust audiences from the admin dashboard.

INSERT INTO public.feature_flags (key, name, description, enabled, audiences, sort_order)
VALUES
  ('ai_analysis', 'AI Analysis', 'Rule-based futures signals with backtested hit-rates and an AI narrative.', TRUE, '{"free": false}'::JSONB, 9)
ON CONFLICT (key) DO NOTHING;
