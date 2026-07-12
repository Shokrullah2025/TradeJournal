import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { BillingProvider, useBilling } from "../src/context/BillingContext";
import { AuthProvider } from "../src/context/AuthContext";

// Billing was refactored from a mock client-side `processPayment` flow to real
// Stripe checkout via Supabase Edge Functions. The admin mock-analytics that
// BillingContext used to expose (getSubscriptionAnalytics / getPaymentsByUser /
// payments) has been removed — real admin figures now come from the
// useAdminBillingData hook (DB queries under admin RLS). These tests cover the
// Stripe action helper that remains on the context: createCheckoutSession. The
// supabase singleton is mocked so the provider mounts without touching the
// network.
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
  return null;
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

    let session;
    await act(async () => {
      session = await api.createCheckoutSession("premium", "monthly");
    });

    expect(session).toEqual({
      clientSecret: "cs_test_abc",
      paidInFull: false,
      setupClientSecret: null,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "stripe-create-customer");
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "stripe-create-subscription", {
      body: { customerId: "cus_123", planSlug: "premium", billingCycle: "monthly" },
    });
  });

  it("createCheckoutSession surfaces paidInFull and the SetupIntent secret for a $0 checkout", async () => {
    await renderBilling();

    mockInvoke
      .mockResolvedValueOnce({
        data: { success: true, data: { customerId: "cus_123" } },
        error: null,
      })
      .mockResolvedValueOnce({
        // 100%-off coupon: no PaymentIntent; the SetupIntent saves the card
        // that renewal invoices will auto-charge after the free period.
        data: {
          success: true,
          data: { clientSecret: null, paidInFull: true, setupClientSecret: "seti_secret_1" },
        },
        error: null,
      });

    let session;
    await act(async () => {
      session = await api.createCheckoutSession("premium", "monthly", "FRIEND100");
    });

    expect(session).toEqual({
      clientSecret: null,
      paidInFull: true,
      setupClientSecret: "seti_secret_1",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "stripe-create-subscription", {
      body: {
        customerId: "cus_123",
        planSlug: "premium",
        billingCycle: "monthly",
        promotionCode: "FRIEND100",
      },
    });
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
