import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeatureFlags } from "../../context/FeatureFlagContext";
import { FEATURE_CATALOG, PLAN_LABELS } from "../../lib/featureFlags";
import { GenericLockedPreview } from "./LockedPreview";

// ── Feature gate ───────────────────────────────────────────────────────────
// Route/section wrapper that enforces a feature flag for the current user's
// audience. When the feature is locked for the user's plan we render a FAKE
// grayscale preview (never the real children) behind an "Upgrade" card linking
// to billing. Rendering a mock — not the real page — is the whole point: the
// real component and its Supabase queries never mount for a locked user, so
// there is no live data in the browser to reveal by stripping the blur in
// devtools. Fails open while flags load to avoid a flash of the locked state.
//
// States (see getFeatureState in lib/featureFlags.js):
//   "on"     → render the real children.
//   "locked" → fake preview (blurred, inert) + upgrade overlay; NO real data.
//   "hidden" → master kill-switch off; plain "unavailable" card, no upsell.
//
// `preview` lets a call site supply a feature-specific mock; otherwise a
// generic analytics-style ghost is shown. `inert=""` blocks keyboard focus
// into the preview — React 18 passes it through as a plain attribute (the
// boolean form only works in React 19).

const FeatureGate = ({ feature, children, title, variant, preview }) => {
  const { user } = useAuth();
  const { getFeatureState, requiredPlan, loading } = useFeatureFlags();

  // Fail open: never flash the locked state while flags are still resolving.
  if (loading) return children;

  const state = getFeatureState(feature);

  if (state === "on") return children;

  // Master kill-switch: the feature is off for everyone (not a plan barrier),
  // so there is nothing to upsell — show the plain unavailable notice.
  if (state === "hidden") {
    return (
      <div
        className="card text-center py-16"
        data-test-id={`feature-gate-locked-${feature}`}
      >
        <div className="max-w-md mx-auto">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <Lock className="h-7 w-7 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title || "Feature unavailable"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This feature isn’t available right now. Please check back later, or
            contact support if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  // state === "locked" from here on.

  const meta = FEATURE_CATALOG.find((f) => f.key === feature);
  const plan = requiredPlan(feature);
  const planLabel = plan ? PLAN_LABELS[plan] : "Pro";

  // Admins resolve to the `admin` audience, which passes every flag, so a
  // locked state for an admin only happens when an admin explicitly denied the
  // admin audience to preview the gate. Let them through (they need to QA the
  // real page) with a banner — mirrors ComingSoonGate.
  if (user?.role === "admin") {
    return (
      <div className="space-y-4">
        <div
          data-test-id={`feature-gate-admin-banner-${feature}`}
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            <span className="font-semibold">Admin preview.</span>{" "}
            {meta?.name || title || "This feature"} is locked to {planLabel} —
            regular users on a lower plan see this page blurred behind an
            upgrade prompt.
          </p>
        </div>
        {children}
      </div>
    );
  }

  const overlayPosition =
    variant === "inline"
      ? "absolute inset-0 z-10 flex items-center justify-center px-4"
      : "absolute inset-0 z-10 flex justify-center px-4 pt-16 sm:pt-24";

  // Fake teaser only — the real `children` are intentionally NOT rendered so
  // no live query runs and there is nothing real to un-blur.
  const previewContent =
    preview ?? (variant === "inline" ? null : <GenericLockedPreview />);

  return (
    <div className="relative" data-test-id={`feature-gate-locked-${feature}`}>
      <div
        className={`pointer-events-none select-none opacity-80 blur-[3px] ${
          variant === "inline" ? "min-h-[8rem]" : "min-h-[16rem]"
        }`}
        aria-hidden="true"
        inert=""
      >
        {previewContent}
      </div>

      <div className={overlayPosition}>
        <div
          data-test-id={`feature-gate-overlay-${feature}`}
          className={`card h-fit w-full text-center ${
            variant === "inline" ? "max-w-sm py-6" : "max-w-md py-10"
          }`}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <Lock className="h-7 w-7" />
          </div>
          <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {planLabel} plan
          </span>
          <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {meta?.name || title || "Upgrade to unlock"}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
            {meta?.description ||
              "This feature is included in a higher plan. Upgrade to unlock it."}
          </p>
          <Link
            to="/billing"
            data-test-id={`feature-gate-upgrade-btn-${feature}`}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Upgrade to {planLabel}
          </Link>
        </div>
      </div>
    </div>
  );
};

FeatureGate.propTypes = {
  feature: PropTypes.string.isRequired,
  children: PropTypes.node,
  title: PropTypes.string,
  variant: PropTypes.oneOf(["page", "inline"]),
  // Feature-specific fake preview shown when locked. Defaults to a generic
  // grayscale ghost (page variant) or nothing (inline).
  preview: PropTypes.node,
};

FeatureGate.defaultProps = {
  variant: "page",
};

export default FeatureGate;
