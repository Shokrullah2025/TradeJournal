import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "../../components/seo/Seo";

/**
 * Public 404 page, rendered inside SiteLayout for unknown feature, solution,
 * and blog slugs. Marked noindex so crawlers drop dead URLs instead of
 * indexing a soft duplicate of the page they were redirected to (the previous
 * behavior — a silent redirect to /features — looked like a soft 404 and
 * created duplicate-content signals).
 */
const NotFound = () => (
  <div
    data-test-id="site-not-found-page"
    className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8"
  >
    <Seo title="Page not found" path="/404" noindex />

    <p className="font-nums text-sm font-semibold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
      404
    </p>
    <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
      This page doesn&apos;t exist
    </h1>
    <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-400">
      The link may be outdated or mistyped. Everything worth finding is one
      click away below.
    </p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Link
        to="/"
        data-test-id="not-found-home-link"
        className="btn btn-site inline-flex items-center gap-2 px-6 py-3 text-base font-semibold"
      >
        Back to home
        <ArrowRight className="h-5 w-5" />
      </Link>
      <Link
        to="/features"
        data-test-id="not-found-features-link"
        className="btn inline-flex items-center gap-2 border border-accent-200 bg-white px-6 py-3 text-base font-semibold text-gray-900 hover:bg-accent-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        Explore features
      </Link>
      <Link
        to="/blog"
        data-test-id="not-found-blog-link"
        className="btn inline-flex items-center gap-2 border border-accent-200 bg-white px-6 py-3 text-base font-semibold text-gray-900 hover:bg-accent-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        Read the blog
      </Link>
    </div>
  </div>
);

export default NotFound;
