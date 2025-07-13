import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const EmailVerification = ({ email, onVerified, onResendEmail }) => {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("pending"); // pending, success, error
  const navigate = useNavigate();
  const { verifyEmail: verifyEmailAuth, sendEmailVerification } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      verifyEmail(token);
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    setIsVerifying(true);
    try {
      await verifyEmailAuth(token);
      setVerificationStatus("success");
      onVerified?.(Date.now().toString()); // Mock user ID
    } catch (error) {
      setVerificationStatus("error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await sendEmailVerification(email);
      onResendEmail?.();
    } catch (error) {
      // Error handling is done in the AuthContext
    } finally {
      setIsResending(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Verifying your email...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email has been successfully verified. You can now proceed
              with your registration.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Verification Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              The verification link is invalid or has expired. Please request a
              new verification email.
            </p>
            <div className="mt-6">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isResending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default pending state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Mail className="h-16 w-16 text-blue-500 mx-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification link to:
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">{email}</p>
          <p className="mt-4 text-sm text-gray-600">
            Click the link in the email to verify your account. If you don't see
            the email, check your spam folder.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isResending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                Resend Email
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/register")}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Registration
          </button>

          {/* Development only - Skip email verification */}
          <button
            onClick={() => {
              setVerificationStatus("success");
              onVerified?.(Date.now().toString());
            }}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Skip Email Verification (Dev Mode)
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
