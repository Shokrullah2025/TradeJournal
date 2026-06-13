import React from "react";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";

const TradovateSetupStatus = () => {
  // Client IDs are safe to expose in the frontend (they are public OAuth identifiers).
  // Client secrets are NOT checked here — they live in Supabase Edge Function env vars only.
  const demoClientId = import.meta.env.VITE_TRADOVATE_DEMO_CLIENT_ID;
  const liveClientId = import.meta.env.VITE_TRADOVATE_LIVE_CLIENT_ID;

  const isDemoConfigured = demoClientId && !demoClientId.includes("YOUR_") && !demoClientId.includes("your_");
  const isLiveConfigured = liveClientId && !liveClientId.includes("YOUR_") && !liveClientId.includes("your_");

  const getStatusIcon = (isConfigured) => {
    return isConfigured ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <AlertCircle className="w-5 h-5 text-amber-500" />
    );
  };

  const getStatusText = (isConfigured) => {
    return isConfigured ? "Configured" : "Setup Required";
  };

  const getStatusColor = (isConfigured) => {
    return isConfigured 
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300";
  };

  const allConfigured = isDemoConfigured && isLiveConfigured;

  return (
    <div className="mb-6 p-4 border rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Tradovate OAuth Setup Status
        </h3>
        <a
          href="https://github.com/your-repo/blob/main/TRADOVATE_OAUTH_SETUP.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Setup Guide
        </a>
      </div>

      <div className="space-y-3">
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(isDemoConfigured)}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(isDemoConfigured)}
            <span className="font-medium">Demo Account Configuration</span>
          </div>
          <span className="text-sm">{getStatusText(isDemoConfigured)}</span>
        </div>

        <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(isLiveConfigured)}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(isLiveConfigured)}
            <span className="font-medium">Live Account Configuration</span>
          </div>
          <span className="text-sm">{getStatusText(isLiveConfigured)}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Client Secret</span>
          </div>
          <span className="text-sm">Stored in Edge Function (secure)</span>
        </div>
      </div>

      {!allConfigured && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Next Steps:
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>Register your app at trader-test.tradovate.com (Demo) and trader.tradovate.com (Live)</li>
            <li>Add your Client IDs to the .env file (VITE_TRADOVATE_DEMO_CLIENT_ID / LIVE)</li>
            <li>Add your Client Secrets to Supabase Dashboard → Edge Functions → Environment Variables</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      )}

      {allConfigured && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium text-green-800 dark:text-green-200">
              ✅ Tradovate OAuth is fully configured! You can now connect your accounts.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradovateSetupStatus;
