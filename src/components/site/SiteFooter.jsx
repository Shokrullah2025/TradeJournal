import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { FOOTER_LINKS } from "./content";

/**
 * Public website footer: brand blurb, link columns (Product / Company /
 * Legal), and copyright. Static content — no interactivity beyond links.
 */
const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid="site-footer"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2">
            <Link
              to="/"
              data-testid="site-footer-brand-link"
              className="flex items-center gap-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Trade Journal Pro
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-600 dark:text-gray-400">
              The journal, analytics, and backtesting platform that helps
              traders find their edge and stick to it.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link
                      to={link.to}
                      data-testid={`site-footer-${column.heading.toLowerCase()}-${link.label
                        .toLowerCase()
                        .replace(/\s+/g, "-")}-link`}
                      className="text-sm text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {year} Trade Journal Pro. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
