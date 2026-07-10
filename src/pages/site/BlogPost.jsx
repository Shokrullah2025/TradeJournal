import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Seo from "../../components/seo/Seo";
import SectionHeading from "../../components/site/SectionHeading";
import FAQAccordion from "../../components/site/FAQAccordion";
import CTASection from "../../components/site/CTASection";
import NotFound from "./NotFound";
import { getBlogPost } from "../../components/site/blogPosts";
import { fetchPublishedBlogPost } from "../../lib/blogApi";
import { formatLongDate } from "../../utils/date";
import { absoluteUrl, SITE_NAME, DEFAULT_OG_IMAGE } from "../../utils/seo";
import { sanitizeNoteHtml } from "../../utils/sanitizeHtml";

// Admin posts store rich-text HTML in intro/paragraphs; static posts store plain
// strings. Render markup safely (sanitized) and leave plain text on the escaped
// React path, so existing static articles are byte-for-byte unchanged.
const containsHtml = (s) => typeof s === "string" && /<[a-z][\s\S]*>/i.test(s);

/**
 * Blog article page (route "/blog/:slug"). Static posts (blogPosts content
 * module) resolve synchronously — so build-time prerendering still sees full
 * HTML — and any other slug is looked up in the blog_posts table, where
 * admin-authored articles live (Admin → Blog tab). Unknown slugs render the
 * 404 page rather than silently redirecting, so crawlers see an explicit
 * noindex instead of a soft duplicate.
 */
const BlogPost = () => {
  const { slug } = useParams();
  const staticPost = getBlogPost(slug);
  const [dynamicPost, setDynamicPost] = useState(null);
  const [loading, setLoading] = useState(!staticPost);

  useEffect(() => {
    if (staticPost) return undefined;
    let cancelled = false;
    setLoading(true);
    setDynamicPost(null);
    fetchPublishedBlogPost(slug)
      .then((post) => {
        if (!cancelled) setDynamicPost(post);
      })
      .catch((err) => {
        console.error("[BlogPost] could not load post:", err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, staticPost]);

  const post = staticPost ?? dynamicPost;

  if (!post && loading) {
    return (
      <div
        className="flex items-center justify-center py-32"
        data-testid="blog-post-loading-spinner"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-600" />
      </div>
    );
  }

  if (!post) return <NotFound />;

  const path = `/blog/${post.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.seo.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      image: post.coverImage ?? absoluteUrl(DEFAULT_OG_IMAGE),
      mainEntityOfPage: absoluteUrl(path),
      author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: absoluteUrl(path) },
      ],
    },
    ...(post.faqs?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <div data-testid={`blog-post-${post.slug}`}>
      <Seo
        title={post.seo.title}
        description={post.seo.description}
        path={path}
        type="article"
        jsonLd={jsonLd}
      />

      {/* Article header */}
      <header className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <Link
          to="/blog"
          data-testid={`blog-post-${post.slug}-back-link`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>
        <h1 className="mt-5 text-3xl sm:text-[40px] font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
          <time dateTime={post.publishedAt} className="font-nums">
            {formatLongDate(post.publishedAt)}
          </time>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {post.readingTime} min read
          </span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent-50 dark:bg-accent-900/40 px-2.5 py-0.5 text-xs font-medium text-accent-700 dark:text-accent-300"
            >
              {tag}
            </span>
          ))}
        </div>
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            data-testid={`blog-post-${post.slug}-cover-img`}
            className="mt-8 aspect-[2/1] w-full rounded-2xl border border-gray-200 dark:border-gray-700 object-cover"
          />
        )}
        {containsHtml(post.intro) ? (
          <div
            data-testid={`blog-post-${post.slug}-intro`}
            className="rich-text-content mt-8 text-lg leading-relaxed text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(post.intro) }}
          />
        ) : (
          <p className="mt-8 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            {post.intro}
          </p>
        )}
      </header>

      {/* Body sections — the long-form substance search engines index */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
        {post.sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, i) =>
              containsHtml(paragraph) ? (
                <div
                  key={i}
                  className="rich-text-content mt-5 text-base leading-relaxed text-gray-600 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(paragraph) }}
                />
              ) : (
                <p
                  key={paragraph.slice(0, 40)}
                  className="mt-5 text-base leading-relaxed text-gray-600 dark:text-gray-400"
                >
                  {paragraph}
                </p>
              )
            )}
          </section>
        ))}
      </article>

      {/* FAQ — mirrored in the FAQPage JSON-LD above */}
      {post.faqs?.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-800/40">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <SectionHeading eyebrow="FAQ" title="Common questions" />
            <div className="mt-10">
              <FAQAccordion items={post.faqs} idPrefix={`blog-${post.slug}-faq`} />
            </div>
          </div>
        </section>
      )}

      {/* Related articles — internal links keep crawlers and readers moving */}
      {post.related?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <SectionHeading eyebrow="Keep reading" title="Related articles" />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
            {post.related.map((relatedSlug) => {
              const related = getBlogPost(relatedSlug);
              if (!related) return null;
              return (
                <Link
                  key={relatedSlug}
                  to={`/blog/${relatedSlug}`}
                  data-testid={`blog-post-${post.slug}-related-${relatedSlug}`}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6 transition-colors hover:border-accent-300 dark:hover:border-accent-700"
                >
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400">
                    {related.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {related.seo.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 dark:text-accent-400">
                    Read article
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <CTASection />
    </div>
  );
};

export default BlogPost;
