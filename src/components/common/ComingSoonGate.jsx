import React from "react";
import PropTypes from "prop-types";
import { Hourglass, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { isComingSoon } from "../../lib/featureFlags";

// ── Coming-soon gate ────────────────────────────────────────────────────────
// Wraps a feature that is announced but not yet released (listed in
// COMING_SOON_FEATURES). The page still renders underneath so users can see
// what's coming, but it is blurred, non-interactive, and covered by a
// "Coming soon" card. Admins bypass the blur (they need to test the feature
// before launch) and instead see a banner reminding them users can't get in.
// `inert=""` blocks keyboard focus into the blurred content — React 18 passes
// it through as a plain attribute (the boolean form only works in React 19).

const ComingSoonGate = ({ feature, title, description, children }) => {
  const { user } = useAuth();

  if (!isComingSoon(feature)) return children;

  if (user?.role === "admin") {
    return (
      <div className="space-y-4">
        <div
          data-test-id={`coming-soon-admin-banner-${feature}`}
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            <span className="font-semibold">Admin preview.</span> {title} is
            marked “Coming soon” — regular users see this page blurred and
            can’t interact with it.
          </p>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative" data-test-id={`coming-soon-gate-${feature}`}>
      <div
        className="pointer-events-none select-none opacity-70 blur-[6px]"
        aria-hidden="true"
        inert=""
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex justify-center px-4 pt-16 sm:pt-24">
        <div
          data-test-id={`coming-soon-overlay-${feature}`}
          className="card h-fit w-full max-w-md text-center py-10"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <Hourglass className="h-7 w-7" />
          </div>
          <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            Coming soon
          </span>
          <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

ComingSoonGate.propTypes = {
  feature: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default ComingSoonGate;
