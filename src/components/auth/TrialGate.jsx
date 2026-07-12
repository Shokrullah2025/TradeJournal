import React from "react";
import PropTypes from "prop-types";
import { LogOut } from "lucide-react";
import TrialActivation from "./TrialActivation";
import SubscribeActivation from "./SubscribeActivation";
import { useBilling } from "../../context/BillingContext";
import { useAuth } from "../../context/AuthContext";

// Renders the app shell (e.g. the dashboard) blurred and non-interactive behind
// a non-dismissible activation overlay. Used by RequireSubscription for "free"
// users. Which overlay depends on trial history (user_subscriptions.trial_start,
// exposed as hasUsedTrial):
//   • never trialed  → the 7-day free-trial offer (card up front, no charge)
//   • trial consumed → a pay-now checkout — no second trial. The backend
//     (stripe-start-trial) enforces the same one-trial rule with a 409; this
//     just stops the UI from offering something that would be rejected.
// There is deliberately no close button — the only way past the gate is to
// activate a trial or subscribe. A "Sign out" escape hatch is provided though,
// so a locked-out customer (e.g. one whose subscription was removed and who now
// resolves to the "free" audience) isn't trapped and can leave or switch
// accounts. Admins never reach this gate, so this is only ever seen by the
// gated customer.
const TrialGate = ({ children }) => {
  const { hasUsedTrial, isLoading } = useBilling();
  const { logout } = useAuth();

  return (
    <div className="relative h-screen overflow-hidden" data-testid="trial-gate">
      {/* Background app shell — heavily blurred (unreadable) and fully inert. The
          strong blur, not opacity, is what hides the content, so the dim layer
          above can stay light/transparent. */}
      <div
        className="h-full blur-lg pointer-events-none select-none"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Foreground gate — a light, mostly-transparent dim plus a backdrop blur;
          blocks all interaction with the page behind it. */}
      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-gray-900/10 backdrop-blur-sm p-4"
        data-testid="trial-gate-overlay"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex w-full max-w-4xl flex-col items-center gap-4">
          {isLoading ? (
            // Don't flash the wrong offer while trial history is still loading.
            <div
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-10 flex justify-center"
              data-testid="trial-gate-loading"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : hasUsedTrial ? (
            <SubscribeActivation variant="overlay" planSlug="premium" billingCycle="monthly" />
          ) : (
            <TrialActivation variant="overlay" planSlug="premium" billingCycle="monthly" />
          )}

          {/* Escape hatch — the gate is otherwise non-dismissible, so this lets
              a trapped customer sign out and switch accounts. Hidden while the
              offer is still resolving to avoid a lone button on a blank gate. */}
          {!isLoading && (
            <button
              type="button"
              onClick={logout}
              data-testid="trial-gate-signout-btn"
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-white hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Not you? Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

TrialGate.propTypes = {
  children: PropTypes.node,
};

export default TrialGate;
