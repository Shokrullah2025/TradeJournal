import React, { useState } from "react";
import PropTypes from "prop-types";
import { ArrowLeft, LogOut } from "lucide-react";
import TrialActivation from "./TrialActivation";
import SubscribeActivation from "./SubscribeActivation";
import PlanSelection from "./PlanSelection";
import { useBilling } from "../../context/BillingContext";
import { useAuth } from "../../context/AuthContext";
import { PLAN_ORDER } from "../../lib/featureFlags";

// Renders the app shell (e.g. the dashboard) blurred and non-interactive behind
// a non-dismissible activation overlay. Used by RequireSubscription for "free"
// users.
//
// Two steps:
//   1. "plan"  → pick a plan (PlanSelection). Skipped when the user already
//                chose one on the marketing pricing page: that choice rides
//                through signup in auth metadata and arrives as
//                user.selectedPlan, so those users open straight on the card
//                step — they've already decided.
//   2. "activate" → add a card. Which panel depends on trial history
//                (user_subscriptions.trial_start, exposed as hasUsedTrial):
//                  • never trialed  → 7-day free-trial offer (card up front,
//                    no charge). The trial only starts once Stripe confirms
//                    the card via the SetupIntent — a card is mandatory.
//                  • trial consumed → pay-now checkout; no second trial. The
//                    backend (stripe-start-trial) enforces the same one-trial
//                    rule with a 409; this just stops the UI offering something
//                    that would be rejected.
//
// There is deliberately no close button — the only way past the gate is to
// activate a trial or subscribe. A "Sign out" escape hatch is provided though,
// so a locked-out customer (e.g. one whose subscription was removed and who now
// resolves to the "free" audience) isn't trapped and can leave or switch
// accounts. Admins never reach this gate, so this is only ever seen by the
// gated customer.
const TrialGate = ({ children }) => {
  const { hasUsedTrial, isLoading } = useBilling();
  const { logout, user } = useAuth();

  // Only trust a slug that's actually a real plan — the metadata originates
  // from a URL query on the pricing page.
  const preselected = PLAN_ORDER.includes(user?.selectedPlan)
    ? user.selectedPlan
    : null;
  const [choice, setChoice] = useState(
    preselected
      ? { planSlug: preselected, billingCycle: user?.selectedCycle === "annually" ? "annually" : "monthly" }
      : null
  );

  const showPlanStep = !isLoading && !choice;

  return (
    <div className="relative h-screen overflow-hidden" data-test-id="trial-gate">
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
        data-test-id="trial-gate-overlay"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex w-full max-w-4xl flex-col items-center gap-4 py-4">
          {isLoading ? (
            // Don't flash the wrong offer while trial history is still loading.
            <div
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-10 flex justify-center"
              data-test-id="trial-gate-loading"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : showPlanStep ? (
            <PlanSelection
              onSelect={(planSlug, billingCycle) =>
                setChoice({ planSlug, billingCycle })
              }
            />
          ) : hasUsedTrial ? (
            <SubscribeActivation
              variant="overlay"
              planSlug={choice.planSlug}
              billingCycle={choice.billingCycle}
            />
          ) : (
            <TrialActivation
              variant="overlay"
              planSlug={choice.planSlug}
              billingCycle={choice.billingCycle}
            />
          )}

          {/* Back to the plan chooser. Hidden on the plan step itself, and for a
              user who arrived with a plan already chosen (there is no earlier
              step of theirs to go back to — but they can still change it, so we
              show it once they're past the choice). */}
          {!isLoading && choice && (
            <button
              type="button"
              onClick={() => setChoice(null)}
              data-test-id="trial-gate-change-plan-btn"
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-white hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Choose a different plan
            </button>
          )}

          {/* Escape hatch — the gate is otherwise non-dismissible, so this lets
              a trapped customer sign out and switch accounts. Hidden while the
              offer is still resolving to avoid a lone button on a blank gate. */}
          {!isLoading && (
            <button
              type="button"
              onClick={logout}
              data-test-id="trial-gate-signout-btn"
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
