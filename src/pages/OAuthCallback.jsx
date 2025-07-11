import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Processing OAuth callback...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          setStatus("error");
          setMessage(errorDescription || `OAuth error: ${error}`);
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("Missing authorization code");
          return;
        }

        // Determine broker from URL path
        let brokerKey = "tradovate";
        if (window.location.pathname.includes("/tradovate")) {
          brokerKey = "tradovate";
        }

        // Parse state to get broker info if available
        let brokerInfo = { broker: brokerKey };
        if (state) {
          try {
            brokerInfo = JSON.parse(state);
          } catch (e) {
            // If state parsing fails, use default broker from URL
            brokerInfo = { broker: brokerKey };
          }
        }

        // If this is a popup, send message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            broker: brokerInfo.broker,
            code: code,
          }, window.location.origin);
          
          // Close popup
          window.close();
          return;
        }

        // If this is not a popup, redirect to trades page with success message
        setStatus("success");
        setMessage(`Successfully authenticated with ${brokerInfo.broker}!`);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate("/trades", { 
            state: { 
              oauthSuccess: true,
              broker: brokerInfo.broker,
              code: code
            }
          });
        }, 2000);

      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred during authentication");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "error":
        return <XCircle className="w-12 h-12 text-red-500" />;
      default:
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "processing":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {status === "processing" && "Processing..."}
          {status === "success" && "Success!"}
          {status === "error" && "Authentication Failed"}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        {status === "success" && (
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to trades page...
          </p>
        )}
        
        {status === "error" && (
          <div className="space-y-4">
            <button
              onClick={() => navigate("/trades")}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Trades</span>
            </button>
            
            <p className="text-sm text-gray-500">
              You can try connecting to your broker again from the trades page.
            </p>
          </div>
        )}
        
        {status === "processing" && (
          <div className="text-sm text-gray-500 space-y-2">
            <p>Please wait while we complete the authentication process.</p>
            <p>This window will close automatically when complete.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
