import React from "react";
import { Link } from "react-router-dom";

const LEGAL_LINKS = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/disclaimer", label: "Financial Disclaimer" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/refund", label: "Refund & Billing" },
  { to: "/aup", label: "Acceptable Use" },
  { to: "/dmca", label: "DMCA / Copyright" },
];

/**
 * Shared shell for every legal document. Rendered inside the public SiteLayout,
 * so the site navbar and footer wrap it automatically — this component only
 * owns the document header, the prose body, and an in-page cross-link bar
 * between the legal pages.
 */
const LegalPageWrapper = ({ title, effectiveDate, lastUpdated, children, slug }) => {
  return (
    <div
      className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      data-testid={`legal-page-${slug}`}
    >
      {/* Content — SiteLayout already owns the page <main> landmark, so this
          is a plain container to avoid a nested/duplicate <main>. */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 print:py-4">
        {/* Document header */}
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <h1
            className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
            data-testid="legal-page-title"
          >
            {title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span data-testid="legal-page-effective-date">
              Effective date: {effectiveDate}
            </span>
            {lastUpdated && lastUpdated !== effectiveDate && (
              <span>Last updated: {lastUpdated}</span>
            )}
          </div>
        </div>

        {/* Document body */}
        <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary-600 dark:prose-a:text-primary-400">
          {children}
        </article>

        {/* In-page cross-links between the legal documents */}
        <nav className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Legal Documents
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm transition-colors ${
                  slug && to === `/${slug}`
                    ? "text-primary-600 dark:text-primary-400 font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default LegalPageWrapper;
