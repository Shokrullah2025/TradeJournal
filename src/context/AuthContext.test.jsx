import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

// Reproduces the confirmed production bug: the email-confirmation page calls
// discardSession() while the SIGNED_IN profile fetch (4 parallel table reads)
// is still in flight. When that slow fetch finally resolves it must NOT
// re-dispatch an authenticated user — otherwise PublicRoute bounces the
// "Sign in" click to /dashboard and the TrialGate demands a sign-in.
const { supabaseMock, authCallbacks, pendingProfileReads } = vi.hoisted(() => {
  const authCallbacks = [];
  // Every user-profile table read resolves only when the test says so — this
  // is what makes the fetch "slow" and the race reproducible.
  const pendingProfileReads = [];
  const makeQuery = () => {
    const q = {};
    for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
    q.maybeSingle = () =>
      new Promise((resolve) => pendingProfileReads.push(resolve));
    // logActivity / notifications use insert(); resolve instantly.
    q.insert = () => Promise.resolve({ data: null, error: null });
    q.then = undefined;
    return q;
  };
  return {
    authCallbacks,
    pendingProfileReads,
    supabaseMock: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn((cb) => {
          authCallbacks.push(cb);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi
            .fn()
            .mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } }),
          listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        },
      },
      from: vi.fn(() => makeQuery()),
    },
  };
});

vi.mock("../lib/supabase", () => ({ supabase: supabaseMock }));
vi.mock("react-hot-toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}));

import { AuthProvider, useAuth } from "./AuthContext";

let auth;
const Probe = () => {
  auth = useAuth();
  return <div data-testid="auth-flag">{String(auth.isAuthenticated)}</div>;
};

const fakeSession = {
  user: { id: "u1", email: "trader@example.com", email_confirmed_at: "2026-07-04" },
};

const flushProfileReads = async () => {
  await act(async () => {
    pendingProfileReads.splice(0).forEach((resolve) =>
      resolve({ data: null, error: null })
    );
    // let the resolved fetch's dispatch (if any) flush
    await Promise.resolve();
  });
};

describe("AuthContext session resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallbacks.length = 0;
    pendingProfileReads.length = 0;
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
  });

  it("authenticates once the profile fetch resolves (happy path)", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("auth-flag")).toHaveTextContent("false")
    );

    await act(async () => {
      authCallbacks.forEach((cb) => cb("SIGNED_IN", fakeSession));
    });
    await flushProfileReads();

    await waitFor(() =>
      expect(screen.getByTestId("auth-flag")).toHaveTextContent("true")
    );
  });

  it("stays signed out when discardSession() interrupts an in-flight profile fetch (regression)", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("auth-flag")).toHaveTextContent("false")
    );

    // Email-confirmation link establishes a session; the profile fetch hangs
    // on the network (reads stay pending).
    await act(async () => {
      authCallbacks.forEach((cb) => cb("SIGNED_IN", fakeSession));
    });

    // AuthConfirm discards the session while that fetch is still in flight,
    // and Supabase emits the matching SIGNED_OUT.
    await act(async () => {
      await auth.discardSession();
      authCallbacks.forEach((cb) => cb("SIGNED_OUT", null));
    });
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();

    // The slow profile fetch finally lands — it must be ignored, not flip the
    // user back to "authenticated" with no real session behind it.
    await flushProfileReads();

    expect(screen.getByTestId("auth-flag")).toHaveTextContent("false");
  });

  it("stays signed out when the stale fetch lands after logout with no SIGNED_OUT yet (edge case)", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("auth-flag")).toHaveTextContent("false")
    );

    await act(async () => {
      authCallbacks.forEach((cb) => cb("SIGNED_IN", fakeSession));
    });

    // discardSession only — the SIGNED_OUT event hasn't arrived yet (it can
    // lag the local state reset). The stale fetch must still be ignored.
    await act(async () => {
      await auth.discardSession();
    });
    await flushProfileReads();

    expect(screen.getByTestId("auth-flag")).toHaveTextContent("false");
  });
});
