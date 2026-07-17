import React from "react";
import { Link } from "react-router-dom";

const LEGAL_LINKS = [
  { to: "/terms", label: "Terms of Service", testId: "footer-terms-link" },
  { to: "/privacy", label: "Privacy Policy", testId: "footer-privacy-link" },
  { to: "/disclaimer", label: "Financial Disclaimer", testId: "footer-disclaimer-link" },
  { to: "/cookies", label: "Cookie Policy", testId: "footer-cookies-link" },
  { to: "/refund", label: "Refund & Billing", testId: "footer-refund-link" },
  { to: "/aup", label: "Acceptable Use", testId: "footer-aup-link" },
  { to: "/dmca", label: "DMCA / Copyright", testId: "footer-dmca-link" },
];

const Footer = () => (
  <footer
    className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto"
    data-test-id="site-footer"
  >
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <nav className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center">
        {LEGAL_LINKS.map(({ to, label, testId }) => (
          <Link
            key={to}
            to={to}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            data-test-id={testId}
          >
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} ZalorTrade LLC. All rights reserved. ZalorTrade is not a registered investment adviser and does not provide financial or trading advice.
      </p>
    </div>
  </footer>
);

export default Footer;
