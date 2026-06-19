import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BillingProvider, useBilling } from "../src/context/BillingContext";
import { AuthProvider } from "../src/context/AuthContext";

// Billing was refactored from a mock client-side `processPayment` flow to real
// Stripe checkout via Supabase Edge Functions. These tests cover the current
// implementation: the admin mock-analytics data exposed by BillingContext and
// the Stripe action helpers (createCheckoutSession / openPortal). The supabase
// singleton is mocked so the provider mounts without touching the network.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

vi.mock("../src/lib/supabase", () => {
  // Chainable query builder that is also awaitable (resolves to empty data).
  const makeBuilder = () => {
    const builder = {};
    ["select", "eq", "in", "order", "limit"].forEach((m) => {
      builder[m] = vi.fn(() => builder);
    });
    builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
    builder.then = (resolve) => resolve({ data: [], error: null });
    return builder;
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      },
      from: vi.fn(() => makeBuilder()),
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
      functions: { invoke: mockInvoke },
    },
  };
});

// Captures the live context value so tests can invoke async actions directly.
let api;
const Probe = () => {
  api = useBilling();
  const analytics = api.getSubscriptionAnalytics();
  return (
    <div>
      <div data-testid="total-revenue">{api.subscriptions.totalRevenue}</div>
      <div data-testid="total-subscribers">{api.subscriptions.totalSubscribers}</div>
      <div data-testid="payments-count">{api.payments.length}</div>
      <div data-testid="failed-payments">{analytics.failedPayments}</div>
      <div data-testid="premium-count">{analytics.subscriptionsByPlan.premium}</div>
      <div data-testid="arpu">{analytics.averageRevenuePerUser}</div>
    </div>
  );
};

const renderBilling = async () => {
  await act(async () => {
    render(
      <AuthProvider>
        <BillingProvider>
          <Probe />
        </BillingProvider>
      </AuthProvider>
    );
  });
};

describe("BillingContext", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    api = undefined;
  });

  // ── Happy path ────────────────────────────────────────────────────────────
  it("provides the admin analytics totals derived from completed payments", async () => {
    await renderBilling();

    // 3 completed payments: $29 + $290 + $99 = $418 across 3 subscribers,
    // out of 4 total payment records (one failed).
    expect(screen.getByTestId("total-revenue")).toHaveTextContent("418");
    expect(screen.getByTestId("total-subscribers")).toHaveTextContent("3");
    expect(screen.getByTestId("payments-count")).toHaveTextContent("4");
  });

  it("computes subscription analytics (ARPU, plan breakdown, failures)", async () => {
    await renderBilling();

    expect(screen.getByTestId("premium-count")).toHaveTextContent("2");
    expect(screen.getByTestId("failed-payments")).toHaveTextContent("1");
    // 418 / 3 subscribers ≈ 139.33 (substring match tolerates the float tail).
    expect(screen.getByTestId("arpu")).toHaveTextContent("139.33");
  });

  it("createCheckoutSession returns the clientSecret from the Edge Functions", async () => {
    await renderBilling();

    mockInvoke
      .mockResolvedValueOnce({
        data: { success: true, data: { customerId: "cus_123" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { clientSecret: "cs_test_abc" } },
        error: null,
      });

    let clientSecret;
    await act(async () => {
      clientSecret = await api.createCheckoutSession("premium", "monthly");
    });

    expect(clientSecret).toBe("cs_test_abc");
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "stripe-create-customer");
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "stripe-create-subscription", {
      body: { customerId: "cus_123", planSlug: "premium", billingCycle: "monthly" },
    });
  });

  // ── Edge case ─────────────────────────────────────────────────────────────
  it("getPaymentsByUser returns only the matching user's payments", async () => {
    await renderBilling();

    expect(api.getPaymentsByUser("user2")).toHaveLength(1);
    expect(api.getPaymentsByUser("nobody")).toEqual([]);
  });

  // ── Error state ───────────────────────────────────────────────────────────
  it("createCheckoutSession throws a friendly error when checkout init fails", async () => {
    await renderBilling();

    mockInvoke.mockResolvedValueOnce({
      data: { success: false, error: "Failed to initialize checkout" },
      error: null,
    });

    await expect(
      api.createCheckoutSession("premium", "monthly")
    ).rejects.toThrow("Failed to initialize checkout");
  });
});
