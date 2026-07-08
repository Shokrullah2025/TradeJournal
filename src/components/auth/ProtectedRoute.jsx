import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFeatureFlags } from "../../context/FeatureFlagContext";
import TrialGate from "./TrialGate";
import MfaStepUp from "./MfaStepUp";

// ── Shared loading spinner ────────────────────────────────────────────────
const LoadingScreen = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
    data-testid="auth-loading-screen"
  >
    <div className="text-center">
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"
        data-testid="auth-loading-spinner"
      />
      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// ── Requires authentication ───────────────────────────────────────────────
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, mfaRequired } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  // aal1 session with a verified TOTP factor: block until the code is entered.
  // Rendered in place (not a redirect) to avoid a loop with PublicRoute.
  if (mfaRequired) return <MfaStepUp />;
  return children;
};

// ── Requires an entitling subscription (active plan or live trial) ─────────
// Enforces the card-up-front trial: an authenticated, non-admin user with no
// paid plan and no active trial ("free") sees the app shell rendered behind a
// non-dismissible TrialGate overlay — the dashboard is visible but blurred and
// inert until they add a card and start the trial. Without this, ProtectedRoute
// alone lets any signed-in user into the dashboard, so the trial was never
// enforced.
//
// Entitlement is read from FeatureFlagContext, which already resolves the
// user's audience from their active/trialing subscription and is auth-reactive.
// Admins resolve to "admin" and always pass; "free" means no plan and no live
// trial.
//
// Caveats handled elsewhere:
//   • Post-activation, FeatureFlagContext's audience is stale until the app
//     re-resolves it, so TrialActivation finishes with a full reload so the
//     gate clears and the user lands in the unblurred app.
//   • FeatureFlagContext fails open to "free" on a lookup error, so a transient
//     DB error shows the gate rather than free access — it errs toward "must
//     subscribe", never toward free access.
export const RequireSubscription = ({ children }) => {
  const { isAuthenticated, loading: authLoading, mfaRequired } = useAuth();
  const { audience, loading: flagsLoading } = useFeatureFlags();
  const location = useLocation();

  if (authLoading || flagsLoading) return <LoadingScreen />;
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;
  // Enforce the 2FA step-up before the subscription gate so a half-signed-in
  // (aal1) user can never reach the app shell.
  if (mfaRequired) return <MfaStepUp />;
  if (audience === "free") return <TrialGate>{children}</TrialGate>;
  return children;
};

// ── Redirects authenticated users away (login / register pages) ──────────
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, bootstrapped } = useAuth();

  if (loading) {
    // Bootstrap: blank the page so an already-signed-in user never sees the
    // login form flash before the redirect below.
    if (!bootstrapped) return <LoadingScreen />;
    // In-flight sign-in: `loading` also goes true while login() runs. Keep
    // the form mounted (its submit button shows the spinner) instead of
    // swapping to a full-screen loader — unmounting the form mid-submit is
    // what caused the loading-screen → login-flash → MFA-gate bounce.
    return children;
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

// ── Admin only ────────────────────────────────────────────────────────────
export const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  if (user?.role !== "admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
        data-testid="admin-access-denied"
      >
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4 font-bold">403</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access this page.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return children;
};

// ── Billing admin only ────────────────────────────────────────────────────
export const BillingRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  if (user?.role !== "admin") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
        data-testid="billing-access-denied"
      >
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4 font-bold">403</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This section is only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
