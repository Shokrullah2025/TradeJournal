import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import ErrorBoundary from "../common/ErrorBoundary";
import SiteNavbar from "./SiteNavbar";
import SiteFooter from "./SiteFooter";

// Fallback shown while a lazily-loaded site page chunk is fetched.
const SitePageFallback = () => (
  <div
    data-test-id="site-page-loading"
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
const SiteLayout = () => (
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

export default SiteLayout;
