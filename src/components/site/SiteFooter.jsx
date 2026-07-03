import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { FOOTER_LINKS, FOOTER_LEGAL_LINKS } from "./content";

/**
 * Public website footer (landing design): brand blurb + three curated link
 * columns (Product / Resources / Company), then a bottom line with the risk
 * disclaimer and compact legal links. Static content — no interactivity
 * beyond links.
 */
const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid="site-footer"
      className="border-t border-accent-100 dark:border-gray-800"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              to="/"
              data-testid="site-footer-brand-link"
              className="flex items-center gap-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 via-accent-600 to-accent-800">
                <TrendingUp className="h-4 w-4 text-white" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Trad<span className="text-accent-600 dark:text-accent-400">gella</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              The trading journal that turns your history into an edge.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                {column.heading}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link
                      to={link.to}
                      data-testid={`site-footer-${column.heading.toLowerCase()}-${link.label
                        .toLowerCase()
                        .replace(/\s+/g, "-")}-link`}
                      className="text-sm text-gray-600 transition-colors hover:text-accent-600 dark:text-gray-400 dark:hover:text-accent-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-accent-100 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            © {year} Tradgella. Trading involves risk. Past performance is not
            indicative of future results.
          </p>
          <div
            data-testid="site-footer-legal-links"
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`site-footer-legal-${link.label
                  .toLowerCase()
                  .replace(/\s+/g, "-")}-link`}
                className="text-xs text-gray-500 transition-colors hover:text-accent-600 dark:text-gray-400 dark:hover:text-accent-400"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
