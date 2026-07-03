import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Home } from "lucide-react";

/**
 * Slim top navigation for the authentication pages (Login / Register).
 *
 * Mirrors the public SiteNavbar pattern so the two surfaces feel consistent:
 * the brand and the primary action both return to the marketing home. Getting
 * into the app is handled by signing in — an already-authenticated visitor is
 * routed to the dashboard from the public "Sign in" entry point — so this bar
 * only needs a clear path back home. The route guards (PublicRoute /
 * ProtectedRoute) still govern access.
 */
const AuthNavbar = () => (
  <header
    data-testid="auth-navbar"
    className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
  >
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        {/* Brand — returns to the public home page */}
        <Link
          to="/"
          data-testid="auth-nav-brand-link"
          className="flex items-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Trad<span className="text-primary-600 dark:text-primary-400">gella</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Home — primary action back to the marketing site, in the slot the
              dashboard CTA used to occupy. */}
          <Link
            to="/"
            data-testid="auth-nav-home-link"
            className="btn btn-primary btn-sm inline-flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </nav>
  </header>
);

export default AuthNavbar;
