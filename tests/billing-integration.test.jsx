import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
    <div data-testid="stripe-payment-form-mock">Stripe checkout for ${amount}</div>
  ),
}));
// Stub the address step (real one loads Stripe Elements). Clicking it submits a
// sample EU address so the two-step checkout flow can be driven in tests.
vi.mock("../src/components/billing/BillingAddressForm", () => ({
  default: ({ onSubmit }) => (
    <button
      data-testid="billing-address-form-mock"
      onClick={() => onSubmit({ address: { country: "DE" }, taxId: null })}
    >
      Submit address
    </button>
  ),
}));

import Billing from "../src/pages/Billing";

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
    render(<Billing />);

    expect(screen.getByText("Subscription & Billing")).toBeInTheDocument();
    expect(screen.getByText("Payment Information")).toBeInTheDocument();
    expect(screen.getByText("Plans & Subscriptions")).toBeInTheDocument();
    expect(screen.getByText("Invoice History")).toBeInTheDocument();
  });

  it("shows the pricing plans on the Plans tab", () => {
    render(<Billing />);
    goToPlansTab();

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getByText("$29")).toBeInTheDocument(); // Premium monthly
  });

  it("updates prices when the billing cycle switches to yearly", () => {
    render(<Billing />);
    goToPlansTab();

    fireEvent.click(screen.getByText("Yearly"));

    expect(screen.getByText("$290")).toBeInTheDocument(); // Premium yearly
    expect(screen.getByText("$990")).toBeInTheDocument(); // Enterprise yearly
  });

  it("opens the modal at the address step, then advances to payment after address submit", async () => {
    billingState.createCheckoutSession.mockResolvedValue({
      clientSecret: "cs_test_123",
      totals: { subtotal: 2900, tax: 551, total: 3451, currency: "eur" },
    });
    render(<Billing />);
    goToPlansTab();

    const upgradeButtons = screen.getAllByText(/Upgrade to/);
    fireEvent.click(upgradeButtons[0]); // Premium

    // Step 1: address form is shown and no subscription is created yet.
    expect(await screen.findByTestId("billing-payment-modal")).toBeInTheDocument();
    expect(screen.getByTestId("billing-address-form-mock")).toBeInTheDocument();
    expect(billingState.createCheckoutSession).not.toHaveBeenCalled();

    // Step 2: submitting the address creates the session and shows the card form.
    fireEvent.click(screen.getByTestId("billing-address-form-mock"));

    await waitFor(() => {
      expect(billingState.createCheckoutSession).toHaveBeenCalledWith(
        "premium",
        "monthly",
        { address: { country: "DE" }, taxId: null }
      );
    });
    expect(await screen.findByTestId("stripe-payment-form-mock")).toBeInTheDocument();
  });

  it("opens the Stripe portal when Manage Payment Methods is clicked", async () => {
    billingState.openPortal.mockResolvedValue(undefined);
    render(<Billing />);

    // Payment Information is the default tab.
    fireEvent.click(screen.getByTestId("billing-update-payment-btn"));

    await waitFor(() => {
      expect(billingState.openPortal).toHaveBeenCalled();
    });
  });

  // ── Edge case: empty states ───────────────────────────────────────────────
  it("shows the empty payment-method and invoice states", () => {
    render(<Billing />);

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
    render(<Billing />);
    goToPlansTab();

    fireEvent.click(screen.getAllByText(/Upgrade to/)[0]);
    // Advance past the address step to trigger the failing checkout call.
    fireEvent.click(await screen.findByTestId("billing-address-form-mock"));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        "Failed to initialize checkout. Please try again."
      );
    });
  });
});
