import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";
import ModalPortal from "./ModalPortal";
import { formatUsage } from "../../utils/planLimits";

// ── Plan limit modal ────────────────────────────────────────────────────────
// Shown when a user hits a plan usage cap (manual trades / month, saved
// backtest sessions). Mirrors the FeatureGate upgrade card so the whole app
// speaks one "you've hit a limit → upgrade" language, and links to /billing
// (the in-app billing page, not the public /pricing route).

const PlanLimitModal = ({
  open,
  onClose,
  title,
  message,
  used,
  max,
  upgradeLabel,
  testId,
}) => {
  if (!open) return null;

  const planLabel = upgradeLabel || "a higher plan";

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 px-4"
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
      >
        <div
          className="card w-full max-w-md text-center py-10 relative"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          data-testid={testId}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
            data-testid={`${testId}-close-btn`}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
            {message}
          </p>

          {max > 0 && (
            <p
              className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300"
              data-testid={`${testId}-usage`}
            >
              Used this period:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatUsage(used, max)}
              </span>
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              data-testid={`${testId}-dismiss-btn`}
            >
              Not now
            </button>
            <Link
              to="/billing"
              onClick={onClose}
              className="btn-primary inline-flex items-center gap-2"
              data-testid={`${testId}-upgrade-btn`}
            >
              <Lock className="h-4 w-4" />
              Upgrade to {planLabel}
            </Link>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

PlanLimitModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  used: PropTypes.number,
  max: PropTypes.number,
  upgradeLabel: PropTypes.string,
  testId: PropTypes.string.isRequired,
};

PlanLimitModal.defaultProps = {
  used: 0,
  max: 0,
  upgradeLabel: null,
};

export default PlanLimitModal;
