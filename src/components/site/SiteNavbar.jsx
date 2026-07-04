import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { TrendingUp, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NAV_MENUS } from "./content";

const slugify = (label) => label.toLowerCase().replace(/\s+/g, "-");

// Tailwind can't build class names from template strings, so the mega-menu
// column count (groups + optional highlight card) maps to explicit classes.
const MEGA_GRID_COLS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/**
 * Public top navigation for the product website, with mega-menu dropdowns.
 *
 * Desktop: "mega" menus (Features) render a multi-column panel with a
 * highlight card; "dropdown" menus render a simple list; "link" items are
 * flat NavLinks. Panels open on hover (with a short close delay so the
 * pointer can travel into the panel) and toggle on click; Escape, an outside
 * click, or a route change closes them.
 *
 * Mobile: a full drawer where each menu becomes an accordion section.
 *
 * "Sign in" is session-aware: a visitor whose JWT/session is still alive is
 * sent straight to the dashboard, while one whose session is missing or
 * expired lands on the login page.
 */
const SiteNavbar = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // label of the open desktop menu
  const [expandedSection, setExpandedSection] = useState(null); // mobile accordion
  const closeTimer = useRef(null);
  const headerRef = useRef(null);

  // "Sign in" doubles as the path back into the app. isAuthenticated mirrors
  // the live Supabase session (AuthContext flips it on sign-out / failed token
  // refresh), so a still-valid session skips the login form entirely.
  const handleSignIn = () => {
    navigate(isAuthenticated ? "/dashboard" : "/login");
  };

  const openNow = useCallback((label) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(label);
  }, []);

  // Delay closing so the pointer can cross the gap between button and panel.
  const scheduleClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 150);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close everything whenever the route (or in-page anchor) changes.
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [location.pathname, location.hash]);

  // Escape closes any open desktop panel; clicks outside the header do too.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const onClick = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // Lock body scroll while the mobile drawer is open; always restore on cleanup.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "text-accent-600 dark:text-accent-400"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
    }`;

  const menuButtonClass = (label) =>
    `flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      openMenu === label
        ? "text-gray-900 bg-gray-50 dark:text-white dark:bg-gray-800"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
    }`;

  const renderDropdownItem = (item, menuLabel) => (
    <Link
      key={item.to}
      to={item.to}
      data-testid={`site-nav-${slugify(menuLabel)}-${slugify(item.label)}-link`}
      className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      {item.emoji && (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-lg dark:bg-accent-900/50"
        >
          {item.emoji}
        </span>
      )}
      <span>
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {item.label}
        </span>
        {item.description && (
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            {item.description}
          </span>
        )}
      </span>
    </Link>
  );

  return (
    <>
      {/* Announcement bar — scrolls away; only the nav below is sticky */}
      <div
        data-testid="site-announcement-bar"
        className="bg-accent-600 px-4 py-2 text-center text-[13px] text-white"
      >
        New — <strong className="font-semibold">AI Trade Insights</strong> now
        reads your journal and tells you exactly where you leak money.{" "}
        <Link
          to="/features/ai-insights"
          data-testid="site-announcement-link"
          className="underline underline-offset-2"
        >
          See how →
        </Link>
      </div>

    <header
      ref={headerRef}
      data-testid="site-navbar"
      className="sticky top-0 z-40 w-full border-b border-accent-100 dark:border-gray-800 bg-accent-50/85 dark:bg-gray-950/85 backdrop-blur-md"
    >
      <nav className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Brand */}
          <Link
            to="/"
            data-testid="site-nav-brand-link"
            className="flex items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Trad<span className="text-accent-600 dark:text-accent-400">gella</span>
            </span>
          </Link>

          {/* Desktop menus — grouped next to the brand, like the mock */}
          <div className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV_MENUS.map((menu) => {
              if (menu.type === "link") {
                return (
                  <NavLink
                    key={menu.label}
                    to={menu.to}
                    data-testid={`site-nav-${slugify(menu.label)}-link`}
                    className={linkClass}
                  >
                    {menu.label}
                  </NavLink>
                );
              }

              return (
                <div
                  key={menu.label}
                  className={menu.type === "mega" ? "" : "relative"}
                  onMouseEnter={() => openNow(menu.label)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    data-testid={`site-nav-${slugify(menu.label)}-menu-btn`}
                    aria-haspopup="true"
                    aria-expanded={openMenu === menu.label}
                    onClick={() =>
                      setOpenMenu(openMenu === menu.label ? null : menu.label)
                    }
                    className={menuButtonClass(menu.label)}
                  >
                    {menu.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        openMenu === menu.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Simple dropdown panel */}
                  {menu.type === "dropdown" && openMenu === menu.label && (
                    <div
                      data-testid={`site-nav-${slugify(menu.label)}-panel`}
                      className="absolute left-1/2 top-full w-72 -translate-x-1/2 pt-3"
                    >
                      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                        {menu.items.map((item) =>
                          renderDropdownItem(item, menu.label)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop actions — pushed to the right edge */}
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={handleSignIn}
              data-testid="site-nav-signin-btn"
              className="btn btn-ghost btn-sm"
            >
              Sign in
            </button>
            <Link
              to="/login"
              data-testid="site-nav-getstarted-btn"
              className="btn btn-site btn-sm"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
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

        {/* Mega menu panel — spans the nav container so wide content fits */}
        {NAV_MENUS.filter(
          (menu) => menu.type === "mega" && openMenu === menu.label
        ).map((menu) => (
          <div
            key={menu.label}
            data-testid={`site-nav-${slugify(menu.label)}-panel`}
            onMouseEnter={() => openNow(menu.label)}
            onMouseLeave={scheduleClose}
            className="absolute left-1/2 top-full hidden w-full max-w-4xl -translate-x-1/2 pt-3 lg:block"
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <div
                className={`grid ${
                  MEGA_GRID_COLS[
                    menu.groups.length + (menu.highlight ? 1 : 0)
                  ] || "grid-cols-4"
                }`}
              >
                {menu.groups.map((group, groupIndex) => (
                  <div
                    key={group.heading}
                    className={`p-6 ${
                      groupIndex > 0
                        ? "border-l border-gray-100 dark:border-gray-700/60"
                        : ""
                    }`}
                  >
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group.heading}
                    </p>
                    {group.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          data-testid={`site-nav-${slugify(menu.label)}-${slugify(item.label)}-link`}
                          className="group -mx-3 flex gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-lg dark:bg-accent-900/50"
                          >
                            {item.emoji}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                    ))}
                  </div>
                ))}

                {/* Highlight card */}
                {menu.highlight && (
                  <div className="flex flex-col bg-gray-50 p-6 dark:bg-gray-900/60">
                    <span className="mb-3 inline-flex w-fit items-center rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-900/60 dark:text-accent-300">
                      {menu.highlight.badge}
                    </span>
                    <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {menu.highlight.title}
                    </h4>
                    <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {menu.highlight.description}
                    </p>
                    <Link
                      to={menu.highlight.to}
                      data-testid={`site-nav-${slugify(menu.label)}-highlight-link`}
                      className="mt-auto text-sm font-semibold text-accent-600 hover:underline dark:text-accent-400"
                    >
                      Learn more →
                    </Link>
                  </div>
                )}
              </div>

              {/* Bottom strip */}
              {menu.footerLink && (
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-3 dark:border-gray-700/60 dark:bg-gray-900/40">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Everything you need to trade with discipline.
                  </span>
                  <Link
                    to={menu.footerLink.to}
                    data-testid={`site-nav-${slugify(menu.label)}-all-link`}
                    className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400"
                  >
                    {menu.footerLink.label} →
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Mobile drawer — each menu becomes an accordion section */}
      {mobileOpen && (
        <div
          data-testid="site-nav-mobile-menu"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:hidden"
        >
          <div className="space-y-1 px-4 py-4">
            {NAV_MENUS.map((menu) => {
              if (menu.type === "link") {
                return (
                  <NavLink
                    key={menu.label}
                    to={menu.to}
                    data-testid={`site-nav-mobile-${slugify(menu.label)}-link`}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-3 text-base font-medium ${
                        isActive
                          ? "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`
                    }
                  >
                    {menu.label}
                  </NavLink>
                );
              }

              const items =
                menu.type === "mega"
                  ? menu.groups.flatMap((group) => group.items)
                  : menu.items;
              const expanded = expandedSection === menu.label;

              return (
                <div key={menu.label}>
                  <button
                    type="button"
                    data-testid={`site-nav-mobile-${slugify(menu.label)}-btn`}
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedSection(expanded ? null : menu.label)
                    }
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {menu.label}
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expanded && (
                    <div className="space-y-1 pb-2 pl-4">
                      {items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          data-testid={`site-nav-mobile-${slugify(menu.label)}-${slugify(item.label)}-link`}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {item.emoji && (
                            <span
                              aria-hidden="true"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-100 text-sm dark:bg-accent-900/50"
                            >
                              {item.emoji}
                            </span>
                          )}
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

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
                to="/login"
                data-testid="site-nav-mobile-getstarted-btn"
                className="btn btn-site w-full justify-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  );
};

export default SiteNavbar;
