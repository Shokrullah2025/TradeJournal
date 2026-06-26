import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { TrendingUp, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../common/ThemeToggle";
import { NAV_LINKS } from "./content";

/**
 * Public top navigation for the product website. The actions are the same for
 * everyone — "Sign in" and "Get started" — but "Sign in" is session-aware:
 * a visitor whose JWT/session is still alive is sent straight to the dashboard,
 * while one whose session is missing or expired lands on the login page.
 */
const SiteNavbar = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // "Sign in" doubles as the path back into the app. isAuthenticated mirrors
  // the live Supabase session (AuthContext flips it on sign-out / failed token
  // refresh), so a still-valid session skips the login form entirely.
  const handleSignIn = () => {
    navigate(isAuthenticated ? "/dashboard" : "/login");
  };

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile drawer is open; always restore on cleanup.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? "text-primary-600 dark:text-primary-400"
        : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
    }`;

  return (
    <header
      data-testid="site-navbar"
      className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            data-testid="site-nav-brand-link"
            className="flex items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Trad<span className="text-primary-600 dark:text-primary-400">gella</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`site-nav-${item.label.toLowerCase()}-link`}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle size="sm" />
            <button
              type="button"
              onClick={handleSignIn}
              data-testid="site-nav-signin-btn"
              className="btn btn-ghost btn-sm"
            >
              Sign in
            </button>
            <Link
              to="/register"
              data-testid="site-nav-getstarted-btn"
              className="btn btn-primary btn-sm"
            >
              Get started
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle size="sm" />
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              data-testid="site-nav-mobile-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              className="btn-icon text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          data-testid="site-nav-mobile-menu"
          className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 md:hidden"
        >
          <div className="space-y-1 px-4 py-4">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`site-nav-mobile-${item.label.toLowerCase()}-link`}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-base font-medium ${
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={handleSignIn}
                data-testid="site-nav-mobile-signin-btn"
                className="btn btn-ghost w-full justify-center border border-gray-200 dark:border-gray-700"
              >
                Sign in
              </button>
              <Link
                to="/register"
                data-testid="site-nav-mobile-getstarted-btn"
                className="btn btn-primary w-full justify-center"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteNavbar;
