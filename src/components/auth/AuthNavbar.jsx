import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight, Home } from "lucide-react";
import ThemeToggle from "../common/ThemeToggle";

/**
 * Slim top navigation for the authentication pages (Login / Register).
 *
 * Mirrors the public SiteNavbar pattern so the two surfaces feel consistent:
 * the brand returns to the marketing home, and a clear primary CTA lets the
 * user jump straight to the dashboard. The route guards (PublicRoute /
 * ProtectedRoute) still govern access — this bar only provides the link.
 *
 * The dashboard's own Header provides the reverse navigation (Sign Out →
 * back to login), so this completes the login ↔ dashboard loop.
 */
const AuthNavbar = ({ ctaLabel, ctaTo }) => (
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
            Trade Journal{" "}
            <span className="text-primary-600 dark:text-primary-400">Pro</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            data-testid="auth-nav-home-link"
            className="hidden items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white sm:inline-flex"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>

          <ThemeToggle size="sm" />

          <Link
            to={ctaTo}
            data-testid="auth-nav-dashboard-btn"
            className="btn btn-primary btn-sm inline-flex items-center gap-1"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  </header>
);

AuthNavbar.propTypes = {
  /** Text shown on the primary call-to-action button. */
  ctaLabel: PropTypes.string,
  /** Route the primary call-to-action navigates to. */
  ctaTo: PropTypes.string,
};

AuthNavbar.defaultProps = {
  ctaLabel: "Go to Dashboard",
  ctaTo: "/dashboard",
};

export default AuthNavbar;
