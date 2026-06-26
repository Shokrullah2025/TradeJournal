import React from "react";
import PropTypes from "prop-types";
import TrialActivation from "./TrialActivation";

// Renders the app shell (e.g. the dashboard) blurred and non-interactive behind
// a non-dismissible trial-activation overlay. Used by RequireSubscription for
// "free" users: they can see their dashboard blurred in the background but
// cannot use any page until they add a card and start the 7-day trial. There is
// deliberately no close button — the only way past it is to activate the trial.
const TrialGate = ({ children }) => (
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
      <TrialActivation variant="overlay" planSlug="premium" billingCycle="monthly" />
    </div>
  </div>
);

TrialGate.propTypes = {
  children: PropTypes.node,
};

export default TrialGate;
