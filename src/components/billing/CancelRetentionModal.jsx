import React from "react";
import PropTypes from "prop-types";
import { Gift, X, Check } from "lucide-react";
import ModalPortal from "../common/ModalPortal";

// Shown when a subscriber starts cancelling. Presents a one-time "stay" offer
// (30% off) before letting them proceed to the Stripe portal to cancel. The
// parent owns the async actions and the working state so this component stays
// presentational.
const CancelRetentionModal = ({
  onAcceptOffer,
  onDeclineToCancel,
  onClose,
  isWorking,
}) => {
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 p-4"
        data-testid="cancel-retention-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            data-testid="cancel-retention-close-btn"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 mx-auto">
            <Gift className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          </div>

          <h2 className="mt-5 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Before you go — here's 30% off
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            You've put real work into your trading journal, and we'd love for you
            to keep the momentum going. Stay with us and we'll take{" "}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              30% off your subscription
            </span>{" "}
            — our way of saying thank you.
          </p>

          <ul className="mt-5 space-y-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-4">
            {[
              "Keep your full trade history and journal",
              "Hold on to your analytics and performance insights",
              "Pick up right where you left off — your data stays safe",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            The discount applies automatically to your upcoming invoices — no code
            needed. You can still cancel anytime.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={onAcceptOffer}
              disabled={isWorking}
              data-testid="cancel-retention-accept-btn"
              className="w-full flex justify-center items-center py-3 px-4 rounded-md text-sm font-medium text-white bg-primary-600 dark:bg-primary-700 hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isWorking ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Applying your discount…
                </>
              ) : (
                "Yes — keep my plan at 30% off"
              )}
            </button>

            <button
              type="button"
              onClick={onDeclineToCancel}
              disabled={isWorking}
              data-testid="cancel-retention-decline-btn"
              className="w-full flex justify-center py-2.5 px-4 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              No thanks, I'd still like to cancel
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

CancelRetentionModal.propTypes = {
  onAcceptOffer: PropTypes.func.isRequired,
  onDeclineToCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isWorking: PropTypes.bool,
};

export default CancelRetentionModal;
