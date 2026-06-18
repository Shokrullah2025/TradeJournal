import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";

const LEGAL_LINKS = [
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/disclaimer", label: "Financial Disclaimer" },
  { to: "/cookies", label: "Cookie Policy" },
  { to: "/refund", label: "Refund & Billing" },
  { to: "/aup", label: "Acceptable Use" },
  { to: "/dmca", label: "DMCA / Copyright" },
];

const LegalPageWrapper = ({ title, effectiveDate, lastUpdated, children, slug }) => {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      data-testid={`legal-page-${slug}`}
    >
      {/* Top navigation bar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            data-testid="legal-nav-back-link"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Trade Journal Pro</span>
          </Link>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Scale className="w-4 h-4" />
            <span className="text-sm font-medium">Legal Documents</span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 print:py-4">
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
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-4 py-2">
            <strong>Note:</strong> These documents are templates aligned to Colorado and US law. They should be reviewed by a licensed Colorado attorney before you rely on them in any legal proceeding.
          </p>
        </div>

        {/* Document body */}
        <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-p:leading-relaxed prose-li:leading-relaxed">
          {children}
        </article>
      </main>

      {/* Footer with cross-links to all legal pages */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-16 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Legal Documents
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm transition-colors ${
                  slug && to === `/${slug}`
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            © 2026 [COMPANY LEGAL NAME]. All rights reserved. Trade Journal Pro is not a registered investment adviser and does not provide financial or trading advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LegalPageWrapper;
