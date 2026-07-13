import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import Seo from "../../components/seo/Seo";
import CTASection from "../../components/site/CTASection";
import { BLOG_POSTS } from "../../components/site/blogPosts";
import { fetchPublishedBlogPosts } from "../../lib/blogApi";
import { formatLongDate } from "../../utils/date";
import { absoluteUrl, SITE_NAME } from "../../utils/seo";

// The index lists every post, so a CollectionPage + ItemList schema tells
// crawlers this is the hub that links out to the articles. Built from the
// static posts only — those are the prerendered, sitemap-listed URLs.
const BLOG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `${SITE_NAME} Blog`,
  url: absoluteUrl("/blog"),
  mainEntity: {
    "@type": "ItemList",
    itemListElement: BLOG_POSTS.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: post.title,
      url: absoluteUrl(`/blog/${post.slug}`),
    })),
  },
};

/**
 * Blog index (route "/blog"). Merges two content sources: the static posts
 * shipped in the bundle (prerendered at build time) and admin-authored posts
 * from the blog_posts table (Admin → Blog tab). Static posts render
 * immediately — including during prerender — and database posts are merged in
 * when the fetch resolves, newest first. An admin post whose slug collides
 * with a static one replaces it.
 */
const Blog = () => {
  const [posts, setPosts] = useState(BLOG_POSTS);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedBlogPosts()
      .then((dynamicPosts) => {
        if (cancelled || dynamicPosts.length === 0) return;
        const dynamicSlugs = new Set(dynamicPosts.map((p) => p.slug));
        const merged = [
          ...dynamicPosts,
          ...BLOG_POSTS.filter((p) => !dynamicSlugs.has(p.slug)),
        ].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
        setPosts(merged);
      })
      .catch((err) => {
        // The static articles still render — just log and move on.
        console.error("[Blog] could not load published posts:", err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div data-test-id="blog-index-page">
      <Seo
        title="Blog"
        description="Practical guides on trading journals, performance metrics, risk management, and prop firm evaluations — written for traders who trust data over hunches."
        path="/blog"
        jsonLd={BLOG_JSON_LD}
      />

      {/* Header — hand-rolled instead of SectionHeading because the page's top
          heading must be an <h1> for search engines (SectionHeading emits <h2>). */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400">
            Blog
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Trade smarter with data
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Practical, no-fluff guides on journaling, metrics, and risk — the
            same principles ZalorTrade is built on.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div
          data-test-id="blog-post-list"
          className="mx-auto grid max-w-4xl grid-cols-1 gap-6"
        >
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              data-test-id={`blog-card-${post.slug}`}
              className="group overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 transition-colors hover:border-accent-300 dark:hover:border-accent-700"
            >
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt=""
                  loading="lazy"
                  data-test-id={`blog-card-cover-${post.slug}`}
                  className="aspect-[2/1] w-full object-cover"
                />
              )}
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <time dateTime={post.publishedAt} className="font-nums">
                    {formatLongDate(post.publishedAt)}
                  </time>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readingTime} min read
                  </span>
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent-50 dark:bg-accent-900/40 px-2.5 py-0.5 font-medium text-accent-700 dark:text-accent-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  {post.seo.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 dark:text-accent-400">
                  Read article
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CTASection />
    </div>
  );
};

export default Blog;
