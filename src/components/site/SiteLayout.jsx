import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ErrorBoundary from "../common/ErrorBoundary";
import SiteNavbar from "./SiteNavbar";
import SiteFooter from "./SiteFooter";

// Fallback shown while a lazily-loaded site page chunk is fetched.
const SitePageFallback = () => (
  <div
    data-testid="site-page-loading"
    className="flex min-h-[60vh] items-center justify-center"
  >
    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
  </div>
);

/**
 * Public shell for the product website. Renders the shared navbar and footer
 * around the active page (<Outlet/>), wrapped in an ErrorBoundary so a render
 * error in any page shows a graceful fallback rather than a blank screen.
 *
 * This layout is intentionally NOT auth-guarded — guests and signed-in users
 * can both browse it (the navbar adapts its CTAs based on auth state).
 */
const SiteLayout = () => {
  const { pathname, hash } = useLocation();

  // SPA navigation preserves scroll position, which reads as a broken page
  // when moving between long marketing pages. Jump to the top on every route
  // change — unless the link targets an in-page anchor (e.g. /pricing#faq),
  // in which case scroll to that element instead.
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
        <SiteNavbar />
        <main className="flex-1">
          <Suspense fallback={<SitePageFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter />
      </div>
    </ErrorBoundary>
  );
};

export default SiteLayout;
