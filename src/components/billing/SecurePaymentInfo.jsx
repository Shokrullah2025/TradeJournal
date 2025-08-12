import React, { useState } from "react";
import { Eye, EyeOff, Shield, Lock } from "lucide-react";

const SecurePaymentInfo = ({ payment }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Mask sensitive information
  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return "****";
    return `****${cardNumber.slice(-4)}`;
  };

  const maskEmail = (email) => {
    if (!email) return "";
    const [username, domain] = email.split("@");
    const maskedUsername =
      username.slice(0, 2) + "*".repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-success-600 dark:text-success-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Secure Payment Info
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
        >
          {showDetails ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span>{showDetails ? "Hide" : "Show"}</span>
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Email:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {showDetails ? payment.userEmail : maskEmail(payment.userEmail)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Payment Method:</span>
          <span className="text-gray-900 dark:text-gray-100 capitalize">
            {payment.cardBrand} {maskCardNumber(payment.cardLast4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Transaction ID:</span>
          <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
            {showDetails ? payment.id : payment.id.slice(0, 8) + "..."}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
        <Lock className="w-3 h-3" />
        <span>All sensitive data is encrypted and secure</span>
      </div>
    </div>
  );
};

export default SecurePaymentInfo;
