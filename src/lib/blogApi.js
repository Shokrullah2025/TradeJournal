import { supabase } from "./supabase";

// Read-side access to admin-authored blog posts (public.blog_posts) for the
// public /blog pages. Rows are mapped to the exact shape of the static content
// module (src/components/site/blogPosts.js) so Blog.jsx and BlogPost.jsx render
// both sources through the same markup. Kept separate from blogPosts.js on
// purpose: that module is imported by the build-time prerender script and must
// stay a pure-data module with no Supabase dependency.

const BLOG_COLUMNS =
  "id, slug, title, seo_title, seo_description, intro, cover_image_url, tags, reading_time, sections, faqs, status, published_at, updated_at";

/** Map a blog_posts row to the static-post shape used by the site pages. */
export function mapBlogRow(row) {
  if (!row) return null;
  const publishedAt = row.published_at ?? row.updated_at;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    seo: {
      title: row.seo_title || row.title,
      description: row.seo_description || "",
    },
    publishedAt,
    updatedAt: row.updated_at ?? publishedAt,
    readingTime: row.reading_time ?? 1,
    tags: Array.isArray(row.tags) ? row.tags : [],
    intro: row.intro || "",
    sections: Array.isArray(row.sections) ? row.sections : [],
    faqs: Array.isArray(row.faqs) ? row.faqs : [],
    related: [],
    coverImage: row.cover_image_url || null,
    isDynamic: true,
  };
}

/** All published posts, newest first. Throws on query error. */
export async function fetchPublishedBlogPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBlogRow);
}

/** One published post by slug, or null when it doesn't exist. */
export async function fetchPublishedBlogPost(slug) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mapBlogRow(data);
}
