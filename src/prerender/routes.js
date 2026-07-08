import { FEATURE_PAGES, SOLUTION_PAGES } from "../components/site/detailPages";
import { BLOG_POSTS } from "../components/site/blogPosts";

/**
 * Single source of truth for every public (crawlable) URL. Consumed by
 * scripts/prerender.mjs to decide which routes get a static dist/<route>/
 * index.html AND which entries go into the generated sitemap.xml — so adding
 * a feature page or blog post here-adjacent (detailPages.js / blogPosts.js)
 * automatically prerenders it and lists it in the sitemap on the next build.
 *
 * changefreq/priority mirror the values the previous hand-maintained
 * public/sitemap.xml used; lastmod is only emitted where we have a real
 * content date (blog posts) — a fabricated lastmod is worse than none.
 */
export const PUBLIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/features", changefreq: "monthly", priority: "0.9" },
  ...FEATURE_PAGES.map((page) => ({
    path: `/features/${page.slug}`,
    changefreq: "monthly",
    priority: "0.8",
  })),
  ...SOLUTION_PAGES.map((page) => ({
    path: `/solutions/${page.slug}`,
    changefreq: "monthly",
    priority: "0.8",
  })),
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.9" },
  ...BLOG_POSTS.map((post) => ({
    path: `/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    lastmod: post.updatedAt,
  })),
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/refund", changefreq: "yearly", priority: "0.3" },
  { path: "/aup", changefreq: "yearly", priority: "0.3" },
  { path: "/dmca", changefreq: "yearly", priority: "0.3" },
];
