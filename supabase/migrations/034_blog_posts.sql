-- ============================================================
-- Trade Journal Pro — Admin-managed blog posts
-- Migration: 034_blog_posts.sql
--
-- Backs the admin dashboard "Blog" tab: admins write, edit, publish and
-- unpublish articles from the app instead of editing the hardcoded
-- src/components/site/blogPosts.js content module. The public /blog pages
-- read published rows with the anon key; drafts stay admin-only.
--
--   1. blog_posts     — one row per article. `sections` and `faqs` mirror the
--                       shape of the static content module (heading +
--                       paragraphs / question + answer) so both sources render
--                       through the same components.
--   2. blog-images    — public storage bucket for cover images. Public read
--                       (they appear on the marketing site), admin-only write.
--
-- Forward-only, additive. Re-runnable: policies are dropped first.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(120) NOT NULL UNIQUE,
  title           VARCHAR(200) NOT NULL,
  seo_title       VARCHAR(200) NOT NULL DEFAULT '',
  seo_description TEXT         NOT NULL DEFAULT '',
  intro           TEXT         NOT NULL DEFAULT '',
  cover_image_url TEXT         NULL,
  -- JSON array of tag strings, e.g. ["Journaling","Beginners"].
  tags            JSONB        NOT NULL DEFAULT '[]',
  reading_time    INT          NOT NULL DEFAULT 1
                    CHECK (reading_time >= 1 AND reading_time <= 120),
  -- JSON array of { "heading": string, "paragraphs": string[] }.
  sections        JSONB        NOT NULL DEFAULT '[]',
  -- JSON array of { "question": string, "answer": string }.
  faqs            JSONB        NOT NULL DEFAULT '[]',
  status          TEXT         NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMPTZ  NULL,
  created_by      UUID         NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Public article lookup by slug, and the newest-first published listing.
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug
  ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published
  ON public.blog_posts (status, published_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.blog_posts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous marketing-site visitors) can read published
-- posts; admins also see drafts.
DROP POLICY IF EXISTS "blog_posts_select_published" ON public.blog_posts;
CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR is_admin());

-- Only admins may create / change / delete posts.
DROP POLICY IF EXISTS "blog_posts_write_admin" ON public.blog_posts;
CREATE POLICY "blog_posts_write_admin"
  ON public.blog_posts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Base table privileges (Postgres checks these before RLS — see the
-- 026_contact_submissions_grants.sql incident). anon gets SELECT only; the
-- write grant to authenticated is still scoped to admins by RLS above.
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;

-- ============================================================
-- BLOG IMAGES BUCKET
-- Public bucket so cover images render on the marketing site without signed
-- URLs. 5MB cap matches the client-side limit; uploads are re-encoded to WebP
-- in the browser before upload but JPEG/PNG are allowed as a fallback.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  TRUE,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "blog_images_select_all" ON storage.objects;
CREATE POLICY "blog_images_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "blog_images_insert_admin" ON storage.objects;
CREATE POLICY "blog_images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

DROP POLICY IF EXISTS "blog_images_update_admin" ON storage.objects;
CREATE POLICY "blog_images_update_admin"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog-images' AND public.is_admin());

DROP POLICY IF EXISTS "blog_images_delete_admin" ON storage.objects;
CREATE POLICY "blog_images_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-images' AND public.is_admin());
