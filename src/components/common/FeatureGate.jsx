import React from "react";
import PropTypes from "prop-types";
import { Lock } from "lucide-react";
import { useFeatureFlags } from "../../context/FeatureFlagContext";

// ── Feature gate ───────────────────────────────────────────────────────────
// Route/section wrapper that enforces a feature flag for the current user's
// audience. When the feature is disabled it renders a friendly notice instead
// of the children — so gating is real, not just a hidden nav link. Fails open
// while flags are still loading to avoid a flash of the locked state.

const FeatureGate = ({ feature, children, title }) => {
  const { isFeatureEnabled, loading } = useFeatureFlags();

  if (loading || isFeatureEnabled(feature)) return children;

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
          This feature isn’t included in your current plan. Upgrade your
          subscription to unlock it, or contact support if you believe this is a
          mistake.
        </p>
      </div>
    </div>
  );
};

FeatureGate.propTypes = {
  feature: PropTypes.string.isRequired,
  children: PropTypes.node,
  title: PropTypes.string,
};

export default FeatureGate;
