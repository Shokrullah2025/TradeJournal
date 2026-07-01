-- 031_ai_analysis_flag.sql
-- Seeds the feature flag for the AI Analysis page (ICT top-down daily bias
-- for futures with measured historical accuracy).
-- Mirrors the catalog entry in src/lib/featureFlags.js. Free users are
-- excluded by default, matching the other analysis features; admins can
-- adjust audiences from the admin dashboard.

INSERT INTO public.feature_flags (key, name, description, enabled, audiences, sort_order)
VALUES
  ('ai_analysis', 'AI Analysis', 'ICT top-down daily bias for futures with measured historical accuracy.', TRUE, '{"free": false}'::JSONB, 9)
ON CONFLICT (key) DO NOTHING;
