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

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3">
            {page.group}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            {page.hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            {page.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              data-testid={`detail-${page.slug}-getstarted-btn`}
              className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 text-base font-semibold"
            >
              Start free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/pricing"
              data-testid={`detail-${page.slug}-pricing-btn`}
              className="btn btn-ghost border border-gray-300 dark:border-gray-600 px-6 py-3 text-base font-semibold"
            >
              See pricing
            </Link>
          </div>

          {/* Product preview — shows the actual screen this page describes */}
          <div className="relative mx-auto mt-14 max-w-2xl">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-3xl bg-primary-500/10 blur-2xl dark:bg-primary-500/15"
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
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
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
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
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
                  className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6 transition-colors hover:border-primary-300 dark:hover:border-primary-700"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
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
