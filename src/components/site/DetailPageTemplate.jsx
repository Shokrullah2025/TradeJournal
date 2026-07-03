import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Seo from "../seo/Seo";
import SectionHeading from "./SectionHeading";
import FAQAccordion from "./FAQAccordion";
import CTASection from "./CTASection";
import ProductVisual from "./ProductVisual";
import { getRelatedPage } from "./detailPages";
import { absoluteUrl, SITE_NAME } from "../../utils/seo";

/**
 * Shared template for the feature (/features/:slug) and solution
 * (/solutions/:slug) detail pages. Everything is driven by the page object
 * from detailPages.js: hero, capability bullets, long-form sections, optional
 * steps, FAQs (also emitted as FAQPage JSON-LD), and related-page cards for
 * internal linking. One template guarantees consistent structure, SEO markup,
 * and data-testids across all detail pages.
 */
const DetailPageTemplate = ({ page, basePath }) => {
  const path = `${basePath}/${page.slug}`;

  // FAQPage rich-result markup must mirror the visible FAQs exactly, and the
  // breadcrumb trail helps crawlers understand where the page sits.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: page.group, item: absoluteUrl(basePath === "/features" ? "/features" : "/") },
        { "@type": "ListItem", position: 3, name: page.navLabel, item: absoluteUrl(path) },
      ],
    },
    ...(page.faqs?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <div data-testid={`detail-page-${page.slug}`}>
      <Seo
        title={page.seo.title}
        description={page.seo.description}
        path={path}
        jsonLd={jsonLd}
      />

      {/* Hero — landing-style split: copy left, app screenshot right */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-accent-200/60 blur-3xl dark:bg-accent-900/30"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr,1.1fr] lg:gap-14 lg:px-8 lg:py-20">
          <div>
            <p className="font-nums text-xs font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
              {page.group}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-[44px]">
              {page.hero.title}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              {page.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                data-testid={`detail-${page.slug}-getstarted-btn`}
                className="btn btn-site inline-flex items-center gap-2 px-6 py-3 text-base font-semibold"
              >
                Start free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/pricing"
                data-testid={`detail-${page.slug}-pricing-btn`}
                className="btn inline-flex items-center gap-2 border border-accent-200 bg-white px-6 py-3 text-base font-semibold text-gray-900 hover:bg-accent-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                See pricing
              </Link>
            </div>
          </div>

          {/* Product preview — the actual app screen this page describes */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-accent-500/25 to-transparent blur-md"
            />
            <div className="relative">
              <ProductVisual variant={page.visual} />
            </div>
          </div>
        </div>
      </section>

      {/* Capability bullets */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div
          data-testid={`detail-${page.slug}-bullets`}
          className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {page.bullets.map((bullet) => (
            <div
              key={bullet}
              className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-600 dark:text-accent-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {bullet}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Long-form content sections — the substance search engines index */}
      {page.sections.map((section, index) => (
        <section
          key={section.heading}
          className={
            index % 2 === 0
              ? "bg-gray-50 dark:bg-gray-800/40"
              : "bg-white dark:bg-gray-900"
          }
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="mt-5 text-base leading-relaxed text-gray-600 dark:text-gray-400"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}

      {/* Optional how-it-works steps */}
      {page.steps?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <SectionHeading eyebrow="How it works" title="Up and running in minutes" />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {page.steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6"
              >
                <span className="text-sm font-bold text-accent-600 dark:text-accent-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {page.faqs?.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-800/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <SectionHeading eyebrow="FAQ" title="Common questions" />
            <div className="mt-10">
              <FAQAccordion items={page.faqs} idPrefix={`detail-${page.slug}-faq`} />
            </div>
          </div>
        </section>
      )}

      {/* Related pages — internal links keep crawlers and readers moving */}
      {page.related?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <SectionHeading eyebrow="Keep exploring" title="Related tools" />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {page.related.map((slug) => {
              const related = getRelatedPage(slug);
              if (!related) return null;
              const Icon = related.icon;
              return (
                <Link
                  key={slug}
                  to={related.to}
                  data-testid={`detail-${page.slug}-related-${slug}`}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6 transition-colors hover:border-accent-300 dark:hover:border-accent-700"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400">
                    {related.navLabel}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {related.navDescription}
                  </p>
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

const faqShape = PropTypes.shape({
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
});

DetailPageTemplate.propTypes = {
  page: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    group: PropTypes.string.isRequired,
    navLabel: PropTypes.string.isRequired,
    visual: PropTypes.string.isRequired,
    seo: PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    }).isRequired,
    hero: PropTypes.shape({
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string.isRequired,
    }).isRequired,
    bullets: PropTypes.arrayOf(PropTypes.string).isRequired,
    sections: PropTypes.arrayOf(
      PropTypes.shape({
        heading: PropTypes.string.isRequired,
        paragraphs: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ).isRequired,
    steps: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ),
    faqs: PropTypes.arrayOf(faqShape),
    related: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  basePath: PropTypes.oneOf(["/features", "/solutions"]).isRequired,
};

export default DetailPageTemplate;
