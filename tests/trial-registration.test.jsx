import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// The registration / trial flow was migrated off the old REST API:
//   • MultiStepRegistration + EmailVerification now use Supabase Auth (useAuth)
//   • PaymentMethodForm is now Stripe Elements (no manual card inputs)
//   • TrialActivation still POSTs /api/user/start-trial, but with a Supabase
//     session access token in the Authorization header.
// These tests cover the current implementations. Auth, the supabase singleton,
// Stripe, toast and fetch are all mocked so nothing hits the network.
const { authApi, supabaseApi, toastMock, fetchMock } = vi.hoisted(() => ({
  authApi: {
    register: vi.fn(),
    sendEmailVerification: vi.fn(),
    verifyEmail: vi.fn(),
  },
  supabaseApi: {
    auth: { getSession: vi.fn() },
    functions: { invoke: vi.fn() },
  },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  fetchMock: vi.fn(),
}));

vi.mock("../src/context/AuthContext", () => ({ useAuth: () => authApi }));
vi.mock("../src/lib/supabase", () => ({ supabase: supabaseApi }));
vi.mock("react-hot-toast", () => ({ toast: toastMock, default: toastMock }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve({})) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="stripe-payment-element" />,
  useStripe: () => ({}),
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
      data: { success: true, data: { clientSecret: "seti_secret_123" } },
      error: null,
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
      expect(
        screen.getByRole("button", { name: /activate 7-day free trial/i })
      ).toBeInTheDocument();
    });

    it("activates the trial with the Supabase session token and shows success", async () => {
      const onTrialActivated = vi.fn();
      renderWithRouter(<TrialActivation onTrialActivated={onTrialActivated} />);

      fireEvent.click(
        screen.getByRole("button", { name: /activate 7-day free trial/i })
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/user/start-trial",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer tok_123",
            }),
          })
        );
      });

      expect(
        await screen.findByText("Welcome to Trade Journal Pro!")
      ).toBeInTheDocument();
      expect(screen.getByText("7 Days Remaining")).toBeInTheDocument();
      expect(onTrialActivated).toHaveBeenCalled();
    });

    it("refuses to activate (no API call) when there is no session (edge case)", async () => {
      // Without a session the component must NOT fire a `Bearer undefined`
      // request — it should stop and prompt the user to sign in.
      supabaseApi.auth.getSession.mockResolvedValue({ data: { session: null } });
      renderWithRouter(<TrialActivation />);

      fireEvent.click(
        screen.getByRole("button", { name: /activate 7-day free trial/i })
      );

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith(
          "Please sign in to activate your trial."
        );
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        screen.queryByText("Welcome to Trade Journal Pro!")
      ).not.toBeInTheDocument();
    });

    it("shows an error toast when activation fails (error state)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Trial already used" }),
      });
      renderWithRouter(<TrialActivation />);

      fireEvent.click(
        screen.getByRole("button", { name: /activate 7-day free trial/i })
      );

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Trial already used");
      });
      expect(
        screen.queryByText("Welcome to Trade Journal Pro!")
      ).not.toBeInTheDocument();
    });
  });
});
