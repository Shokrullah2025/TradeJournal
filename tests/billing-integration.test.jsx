import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The Billing page is now tab-based (Payment Information / Plans & Subscriptions
// / Invoice History) and drives checkout through Stripe via BillingContext. We
// mock the Auth + Billing hooks so the page's own UI logic is what's under test,
// and stub StripePaymentForm so no real Stripe Elements / network is loaded.
const { authState, billingState, toastMock } = vi.hoisted(() => ({
  authState: { user: null },
  billingState: {},
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user }),
}));
vi.mock("../src/context/BillingContext", () => ({
  useBilling: () => billingState,
}));
vi.mock("react-hot-toast", () => ({ toast: toastMock, default: toastMock }));
vi.mock("../src/components/billing/StripePaymentForm", () => ({
  default: ({ amount }) => (
    <div data-test-id="stripe-payment-form-mock">Stripe checkout for ${amount}</div>
  ),
}));

import Billing from "../src/pages/Billing";

// Billing resolves its active section from `?section=` (the app's upgrade CTAs
// deep-link straight to the plan cards), so it needs a router in the tree.
const renderBilling = (path = "/billing") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Billing />
    </MemoryRouter>
  );

const goToPlansTab = () => {
  fireEvent.click(screen.getByText("Plans & Subscriptions"));
};

describe("Billing Page Integration", () => {
  beforeEach(() => {
    authState.user = { role: "user", currency: "USD" };
    billingState.payments = [];
    billingState.subscription = null; // no active sub → current plan is "basic"
    billingState.paymentMethods = [];
    billingState.userInvoices = [];
    billingState.isLoading = false;
    billingState.getSubscriptionAnalytics = vi.fn(() => ({
      totalRevenue: 0,
      totalSubscribers: 0,
      averageRevenuePerUser: 0,
      subscriptionsByPlan: { basic: 0, premium: 0, enterprise: 0 },
      failedPayments: 0,
    }));
    billingState.createCheckoutSession = vi.fn();
    billingState.openPortal = vi.fn();
    vi.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────
  it("renders the billing header and the three tabs", () => {
    renderBilling();

    expect(screen.getByText("Subscription & Billing")).toBeInTheDocument();
    expect(screen.getByText("Payment Information")).toBeInTheDocument();
    expect(screen.getByText("Plans & Subscriptions")).toBeInTheDocument();
    expect(screen.getByText("Invoice History")).toBeInTheDocument();
  });

  // The upgrade CTAs (FeatureGate's "Upgrade to Pro", PlanLimitModal) send the
  // user to UPGRADE_PLANS_PATH — /settings?tab=billing&section=plans. Landing on
  // the default Payment Information tab would show someone who just asked to
  // upgrade their saved cards, leaving them to hunt for the plans themselves.
  it("opens the Plans section directly when deep-linked with ?section=plans", () => {
    renderBilling("/settings?tab=billing&section=plans");

    // Plan cards are on screen with no click — this is the Plans section.
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Elite")).toBeInTheDocument();
    // ...and not the Payment Information section it would otherwise default to.
    expect(screen.queryByTestId("billing-no-payment-method")).not.toBeInTheDocument();
  });

  it("falls back to Payment Information for a missing or unknown ?section=", () => {
    const { unmount } = renderBilling("/billing");
    expect(screen.getByTestId("billing-no-payment-method")).toBeInTheDocument();
    unmount();

    renderBilling("/billing?section=bogus");
    expect(screen.getByTestId("billing-no-payment-method")).toBeInTheDocument();
  });

  it("shows the pricing plans on the Plans tab", () => {
    renderBilling();
    goToPlansTab();

    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Elite")).toBeInTheDocument();
    // Pro monthly. Prices are DB-driven (useSubscriptionPlans); with no plans
    // loaded in the test the card shows the fallback, which is $18.
    expect(screen.getByText("$18")).toBeInTheDocument();
  });

  it("updates prices when the billing cycle switches to yearly", () => {
    renderBilling();
    goToPlansTab();

    fireEvent.click(screen.getByText("Yearly"));

    // With no live plans loaded the cards fall back to the static annual prices,
    // which mirror the seeded subscription_plans rows Stripe charges against.
    expect(screen.getByText("$180")).toBeInTheDocument(); // Pro yearly
    expect(screen.getByText("$360")).toBeInTheDocument(); // Elite yearly
  });

  it("opens the Stripe checkout modal when an upgrade button is clicked", async () => {
    billingState.createCheckoutSession.mockResolvedValue({
      clientSecret: "cs_test_123",
      paidInFull: false,
      setupClientSecret: null,
    });
    renderBilling();
    goToPlansTab();

    const upgradeButtons = screen.getAllByText(/Upgrade to/);
    fireEvent.click(upgradeButtons[0]); // Premium

    await waitFor(() => {
      expect(billingState.createCheckoutSession).toHaveBeenCalledWith(
        "premium",
        "monthly"
      );
    });
    expect(await screen.findByTestId("billing-payment-modal")).toBeInTheDocument();
    expect(screen.getByTestId("stripe-payment-form-mock")).toBeInTheDocument();
  });

  it("still collects a card (setup mode, $0 due) when a coupon zeroes the first invoice", async () => {
    // paidInFull + SetupIntent secret: nothing to pay today, but the card must
    // be saved or the renewal after the free period could never be charged.
    billingState.createCheckoutSession.mockResolvedValue({
      clientSecret: null,
      paidInFull: true,
      setupClientSecret: "seti_test_123",
    });
    renderBilling();
    goToPlansTab();

    fireEvent.click(screen.getAllByText(/Upgrade to/)[0]); // Premium

    expect(await screen.findByTestId("billing-payment-modal")).toBeInTheDocument();
    expect(screen.getByTestId("stripe-payment-form-mock")).toBeInTheDocument();
    expect(screen.getByTestId("billing-payment-modal-setup-note")).toBeInTheDocument();
    expect(screen.getByTestId("billing-payment-modal-price")).toHaveTextContent("$0/month");
  });

  it("opens the Stripe portal when Manage Payment Methods is clicked", async () => {
    billingState.openPortal.mockResolvedValue(undefined);
    renderBilling();

    // Payment Information is the default tab.
    fireEvent.click(screen.getByTestId("billing-update-payment-btn"));

    await waitFor(() => {
      expect(billingState.openPortal).toHaveBeenCalled();
    });
  });

  // ── Edge case: empty states ───────────────────────────────────────────────
  it("shows the empty payment-method and invoice states", () => {
    renderBilling();

    // Default Payment tab: no saved cards.
    expect(screen.getByTestId("billing-no-payment-method")).toBeInTheDocument();

    // Invoice History tab: no invoices yet.
    fireEvent.click(screen.getByText("Invoice History"));
    expect(screen.getByTestId("invoices-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
  });

  // ── Error state ───────────────────────────────────────────────────────────
  it("surfaces a toast error when checkout initialization fails", async () => {
    billingState.createCheckoutSession.mockRejectedValue(
      new Error("Failed to initialize checkout. Please try again.")
    );
    renderBilling();
    goToPlansTab();

    fireEvent.click(screen.getAllByText(/Upgrade to/)[0]);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Failed to initialize checkout. Please try again."
      );
    });
  });
});
