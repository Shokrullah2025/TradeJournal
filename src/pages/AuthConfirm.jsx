import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Supabase confirmation tokens are single-use: the first click consumes the
// token server-side, and any later click (or a different person opening the same
// link) comes back as access_denied / otp_expired, or makes verifyOtp throw an
// "invalid or has expired" error. Treat all of those as "already used" so the
// user sees a clear message instead of a scary generic failure.
const isAlreadyUsed = ({ errorCode, errorText }) => {
  const hay = `${errorCode || ""} ${errorText || ""}`.toLowerCase();
  return (
    hay.includes("otp_expired") ||
    hay.includes("access_denied") ||
    hay.includes("expired") ||
    hay.includes("already") ||
    hay.includes("invalid")
  );
};

// Landing page for the email-confirmation link Supabase sends on sign-up.
// It must NOT be confused with the broker OAuth callback (/auth/callback),
// which looks for a broker "authorization code" and fails on these links.
//
// Two link shapes are supported:
//   1. token_hash link (?token_hash=…&type=signup) → verify explicitly. Works
//      cross-device (no PKCE verifier needed).
//   2. Default Supabase flow: the link hits Supabase's /verify endpoint, which
//      confirms the user server-side and redirects here with the session in the
//      URL. The supabase client (detectSessionInUrl) exchanges it on load, so we
//      just wait for the session to appear.
const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState("processing"); // processing | success | used | error
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;
    const finish = (s, m) => {
      if (!cancelled) {
        setStatus(s);
        setMessage(m);
      }
    };
    const USED_MSG =
      "This confirmation link has already been used or has expired. If your email is already verified, just sign in.";

    const run = async () => {
      // Supabase can report a failure in either the query or the hash. A
      // re-clicked (already-consumed) link comes back as access_denied /
      // otp_expired here.
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );
      const errorCode =
        searchParams.get("error_code") || hashParams.get("error_code");
      const errorText =
        searchParams.get("error_description") ||
        hashParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error");
      if (errorCode || errorText) {
        if (isAlreadyUsed({ errorCode, errorText })) {
          finish("used", USED_MSG);
        } else {
          finish(
            "error",
            decodeURIComponent(errorText || "Verification failed.").replace(/\+/g, " ")
          );
        }
        return;
      }

      try {
        const tokenHash =
          searchParams.get("token_hash") || searchParams.get("token");
        const type = searchParams.get("type") || "email";

        if (tokenHash) {
          // Path 1 — explicit token verification. A consumed token throws an
          // "invalid or has expired" error → surfaced as "already used".
          await verifyEmail(tokenHash, type);
        } else {
          // Path 2 — wait for detectSessionInUrl to establish the session.
          let session = null;
          for (let i = 0; i < 12 && !session; i++) {
            ({
              data: { session },
            } = await supabase.auth.getSession());
            if (!session) await new Promise((r) => setTimeout(r, 400));
          }
          if (!session) throw new Error("no-session");
        }

        finish("success", "Your email is verified. Taking you to your dashboard…");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch (err) {
        if (isAlreadyUsed({ errorText: err?.message })) {
          finish("used", USED_MSG);
        } else {
          finish(
            "error",
            "This confirmation link is invalid. Please sign in to request a new one."
          );
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, verifyEmail]);

  const icon =
    status === "success" ? (
      <CheckCircle className="w-12 h-12 text-green-500" />
    ) : status === "used" ? (
      <AlertCircle className="w-12 h-12 text-amber-500" />
    ) : status === "error" ? (
      <XCircle className="w-12 h-12 text-red-500" />
    ) : (
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
    );

  const heading =
    status === "success"
      ? "Email verified!"
      : status === "used"
      ? "Link already used"
      : status === "error"
      ? "Verification failed"
      : "Confirming…";

  const headingColor =
    status === "success"
      ? "text-green-600"
      : status === "used"
      ? "text-amber-600"
      : status === "error"
      ? "text-red-600"
      : "text-blue-600";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center border dark:border-gray-700"
        data-testid="auth-confirm-card"
      >
        <div className="flex justify-center mb-6">{icon}</div>
        <h1 className={`text-2xl font-bold mb-4 ${headingColor}`}>
          {heading}
        </h1>
        <p
          className="text-gray-600 dark:text-gray-400 mb-6"
          data-testid="auth-confirm-message"
        >
          {message}
        </p>

        {(status === "error" || status === "used") && (
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            data-testid="auth-confirm-login-btn"
          >
            Go to sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthConfirm;
