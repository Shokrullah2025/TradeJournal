import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// The registration / trial flow was migrated off the old REST API:
//   • MultiStepRegistration + EmailVerification now use Supabase Auth (useAuth)
//   • PaymentMethodForm is now Stripe Elements (no manual card inputs)
//   • TrialActivation now collects a card up front (SetupIntent → confirmSetup)
//     and starts a real Stripe trial subscription via useBilling().startTrial,
//     which auto-charges when the trial ends. The dead /api/user/start-trial
//     fetch has been removed.
// These tests cover the current implementations. Auth, billing, the supabase
// singleton, Stripe and toast are all mocked so nothing hits the network.
const { authApi, billingApi, supabaseApi, toastMock, fetchMock, stripeMock } = vi.hoisted(() => ({
  authApi: {
    register: vi.fn(),
    sendEmailVerification: vi.fn(),
    verifyEmail: vi.fn(),
  },
  billingApi: {
    startTrial: vi.fn(),
  },
  supabaseApi: {
    auth: { getSession: vi.fn() },
    functions: { invoke: vi.fn() },
  },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  fetchMock: vi.fn(),
  stripeMock: { confirmSetup: vi.fn(), confirmPayment: vi.fn(), retrieveSetupIntent: vi.fn() },
}));

vi.mock("../src/context/AuthContext", () => ({ useAuth: () => authApi }));
vi.mock("../src/context/BillingContext", () => ({ useBilling: () => billingApi }));
vi.mock("../src/lib/supabase", () => ({ supabase: supabaseApi }));
vi.mock("react-hot-toast", () => ({ toast: toastMock, default: toastMock }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve({})) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="stripe-payment-element" />,
  useStripe: () => stripeMock,
  useElements: () => ({}),
}));

global.fetch = fetchMock;

import MultiStepRegistration from "../src/pages/MultiStepRegistration";
import EmailVerification from "../src/components/auth/EmailVerification";
import PaymentMethodForm from "../src/components/auth/PaymentMethodForm";
import TrialActivation from "../src/components/auth/TrialActivation";

const renderWithRouter = (component) =>
  render(<BrowserRouter>{component}</BrowserRouter>);

describe("Registration & Trial Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.register.mockResolvedValue({ user_id: "u1" });
    authApi.sendEmailVerification.mockResolvedValue(undefined);
    authApi.verifyEmail.mockResolvedValue(undefined);
    supabaseApi.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "tok_123" } },
    });
    supabaseApi.functions.invoke.mockResolvedValue({
      data: { success: true, data: { clientSecret: "seti_secret_123", customerId: "cus_123" } },
      error: null,
    });
    billingApi.startTrial.mockResolvedValue({
      subscriptionId: "sub_123",
      trialEnd: "2026-07-01T00:00:00.000Z",
    });
    // Fresh SetupIntent — not yet confirmed, so handleSubmit proceeds to confirmSetup.
    stripeMock.retrieveSetupIntent.mockResolvedValue({
      setupIntent: { status: "requires_payment_method" },
      error: undefined,
    });
    stripeMock.confirmSetup.mockResolvedValue({
      setupIntent: { status: "succeeded", payment_method: "pm_123" },
      error: undefined,
    });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  // ── MultiStepRegistration ──────────────────────────────────────────────────
  describe("MultiStepRegistration", () => {
    it("renders the account creation step by default (happy path)", () => {
      renderWithRouter(<MultiStepRegistration />);

      expect(screen.getByText("Create your account")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("John")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Doe")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("john@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Create a password")).toBeInTheDocument();
    });

    it("shows the password strength indicator", async () => {
      renderWithRouter(<MultiStepRegistration />);

      fireEvent.change(screen.getByPlaceholderText("Create a password"), {
        target: { value: "Test123!" },
      });

      expect(await screen.findByText("Strong")).toBeInTheDocument();
    });

    it("shows validation errors for empty fields (edge case)", async () => {
      renderWithRouter(<MultiStepRegistration />);

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(
        await screen.findByText("First name must be at least 2 characters")
      ).toBeInTheDocument();
    });

    it("calls register() with the form data on valid submit", async () => {
      renderWithRouter(<MultiStepRegistration />);

      fireEvent.change(screen.getByPlaceholderText("John"), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByPlaceholderText("Doe"), {
        target: { value: "Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("john@example.com"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Create a password"), {
        target: { value: "Test1234" },
      });
      fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
        target: { value: "Test1234" },
      });
      // The form requires BOTH the Terms and the refund/auto-renewal
      // acknowledgment — register() must not fire unless both are checked.
      fireEvent.click(screen.getByTestId("register-form-terms-checkbox"));
      fireEvent.click(screen.getByTestId("register-form-refund-ack-checkbox"));

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          password: "Test1234",
        });
      });
      expect(authApi.sendEmailVerification).toHaveBeenCalledWith("john@example.com");
    });
  });

  // ── EmailVerification ──────────────────────────────────────────────────────
  describe("EmailVerification", () => {
    it("renders the pending verification screen (happy path)", () => {
      renderWithRouter(<EmailVerification email="john@example.com" />);

      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText(/Click the link in the email/)).toBeInTheDocument();
    });

    it("resends the verification email via Supabase Auth", async () => {
      renderWithRouter(<EmailVerification email="john@example.com" />);

      fireEvent.click(screen.getByRole("button", { name: /resend email/i }));

      await waitFor(() => {
        expect(authApi.sendEmailVerification).toHaveBeenCalledWith("john@example.com");
      });
    });
  });

  // ── PaymentMethodForm (Stripe Elements) ────────────────────────────────────
  describe("PaymentMethodForm", () => {
    it("shows the loading state while the setup intent initializes", () => {
      // Never-resolving invoke keeps the component in its initializing state.
      supabaseApi.functions.invoke.mockReturnValue(new Promise(() => {}));
      renderWithRouter(<PaymentMethodForm />);

      expect(screen.getByText("Add Payment Method")).toBeInTheDocument();
      expect(screen.getByText("Secured by Stripe")).toBeInTheDocument();
      expect(screen.getByTestId("payment-method-loading")).toBeInTheDocument();
    });

    it("requests a setup intent from the stripe-setup-intent Edge Function", async () => {
      renderWithRouter(<PaymentMethodForm />);

      await screen.findByTestId("payment-method-form");
      // Pins the exact Edge Function the component depends on — not the stub.
      expect(supabaseApi.functions.invoke).toHaveBeenCalledWith("stripe-setup-intent");
      expect(screen.getByText("Save Payment Method")).toBeInTheDocument();
    });

    it("shows an error when the setup intent fails (error state)", async () => {
      supabaseApi.functions.invoke.mockResolvedValueOnce({
        data: { success: false, error: "Failed to initialize payment form." },
        error: null,
      });
      renderWithRouter(<PaymentMethodForm />);

      expect(await screen.findByTestId("payment-method-error")).toHaveTextContent(
        "Failed to initialize payment form."
      );
    });
  });

  // ── TrialActivation ────────────────────────────────────────────────────────
  describe("TrialActivation", () => {
    it("renders the trial activation screen (happy path)", () => {
      renderWithRouter(<TrialActivation />);

      expect(screen.getByText("Ready to Start Your Trial?")).toBeInTheDocument();
      expect(screen.getByText("7-Day Free Trial")).toBeInTheDocument();
      expect(screen.getByText("$0")).toBeInTheDocument();
      expect(screen.getByTestId("trial-activate-submit-btn")).toBeInTheDocument();
    });

    it("collects a card then starts the trial and shows success (happy path)", async () => {
      const onTrialActivated = vi.fn();
      renderWithRouter(<TrialActivation onTrialActivated={onTrialActivated} />);

      // Step 1: click "Start free trial" → request a SetupIntent and show the card step.
      fireEvent.click(screen.getByTestId("trial-activate-submit-btn"));

      await waitFor(() => {
        expect(supabaseApi.functions.invoke).toHaveBeenCalledWith("stripe-setup-intent");
      });
      const cardStep = await screen.findByTestId("trial-card-input");
      expect(cardStep).toBeInTheDocument();

      // Step 2: confirm the card → confirmSetup yields a payment method → startTrial.
      fireEvent.click(screen.getByTestId("stripe-payment-submit-btn"));

      await waitFor(() => {
        expect(stripeMock.confirmSetup).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(billingApi.startTrial).toHaveBeenCalledWith("premium", "monthly", "pm_123", "cus_123");
      });

      expect(
        await screen.findByTestId("trial-activated-state")
      ).toBeInTheDocument();
      expect(screen.getByText("Welcome to Trade Journal Pro!")).toBeInTheDocument();
      expect(onTrialActivated).toHaveBeenCalled();
    });

    it("refuses to start (no SetupIntent) when there is no session (edge case)", async () => {
      // Without a session the component must NOT fire an unauthorized request —
      // it should stop and prompt the user to sign in.
      supabaseApi.auth.getSession.mockResolvedValue({ data: { session: null } });
      renderWithRouter(<TrialActivation />);

      fireEvent.click(screen.getByTestId("trial-activate-submit-btn"));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith(
          "Please sign in to start your trial."
        );
      });
      expect(supabaseApi.functions.invoke).not.toHaveBeenCalled();
      expect(screen.queryByTestId("trial-card-input")).not.toBeInTheDocument();
    });

    it("shows the error message when starting the trial fails (error state)", async () => {
      // e.g. the anti-abuse 409 — user has already used their free trial.
      billingApi.startTrial.mockRejectedValueOnce(
        new Error("You've already used your free trial.")
      );
      renderWithRouter(<TrialActivation />);

      fireEvent.click(screen.getByTestId("trial-activate-submit-btn"));
      await screen.findByTestId("trial-card-input");
      fireEvent.click(screen.getByTestId("stripe-payment-submit-btn"));

      expect(await screen.findByTestId("trial-error-message")).toHaveTextContent(
        "You've already used your free trial."
      );
      expect(screen.queryByTestId("trial-activated-state")).not.toBeInTheDocument();
    });
  });
});
