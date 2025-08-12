import React, { useState } from "react";
import { useBroker } from "../context/BrokerContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AccountTypeSelector from "../components/trades/AccountTypeSelector";

const BrokerSelection = () => {
  const { brokerService, connectBroker, isConnecting } = useBroker();
  const navigate = useNavigate();
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(null);

  const brokers = brokerService?.getBrokers() || {};

  const handleBrokerConnect = async (brokerKey) => {
    const broker = brokers[brokerKey];

    if (!broker) {
      toast.error("Broker not found");
      return;
    }

    // For Tradovate, show account type selector first
    if (brokerKey === "tradovate") {
      setSelectedBroker(brokerKey);
      setShowAccountTypeSelector(true);
      return;
    }

    // For other brokers, connect directly
    try {
      await connectBroker(brokerKey);
      toast.success(`Connected to ${broker.name} successfully!`);
      navigate("/trades"); // Navigate back to trades page after connection
    } catch (error) {
      toast.error(`Failed to connect to ${broker.name}: ${error.message}`);
    }
  };

  const handleAccountTypeSelect = async (accountType) => {
    setShowAccountTypeSelector(false);

    try {
      await connectBroker(selectedBroker, accountType);
      const broker = brokers[selectedBroker];
      toast.success(
        `Connected to ${broker.name} (${accountType}) successfully!`
      );
      navigate("/trades");
    } catch (error) {
      const broker = brokers[selectedBroker];
      toast.error(`Failed to connect to ${broker.name}: ${error.message}`);
    }

    setSelectedBroker(null);
  };

  const getBrokersByCategory = () => {
    const categories = {
      "Futures Trading": [],
      "Stock Trading": [],
      "Crypto Trading": [],
      "Demo/Testing": [],
    };

    Object.entries(brokers).forEach(([key, broker]) => {
      if (key === "demo") {
        categories["Demo/Testing"].push({ key, ...broker });
      } else if (broker.name.includes("Tradovate")) {
        categories["Futures Trading"].push({ key, ...broker });
      } else if (
        broker.name.includes("Alpaca") ||
        broker.name.includes("Schwab") ||
        broker.name.includes("TD Ameritrade")
      ) {
        categories["Stock Trading"].push({ key, ...broker });
      } else if (
        broker.name.includes("Coinbase") ||
        broker.name.includes("Binance")
      ) {
        categories["Crypto Trading"].push({ key, ...broker });
      } else {
        categories["Stock Trading"].push({ key, ...broker });
      }
    });

    return categories;
  };

  const brokerCategories = getBrokersByCategory();

  const getBrokerStatusColor = (brokerKey) => {
    if (brokerKey === "demo") return "bg-green-100 text-green-800";
    if (brokerKey === "tradovate") return "bg-blue-100 text-blue-800";
    return "bg-orange-100 text-orange-800";
  };

  const getBrokerStatus = (brokerKey) => {
    if (brokerKey === "demo") return "Ready";
    if (brokerKey === "tradovate") return "OAuth Required";
    return "Setup Required";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Connect Your Broker
              </h1>
              <p className="mt-2 text-gray-600">
                Choose a broker to connect and start importing your trades
                automatically
              </p>
            </div>
            <button
              onClick={() => navigate("/trades")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Trades
            </button>
          </div>
        </div>

        {/* Broker Categories */}
        {Object.entries(brokerCategories).map(([category, brokerList]) => {
          if (brokerList.length === 0) return null;

          return (
            <div key={category} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brokerList.map((broker) => (
                  <div
                    key={broker.key}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Broker Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="text-3xl mr-3">{broker.logo}</div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {broker.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {broker.description}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBrokerStatusColor(
                            broker.key
                          )}`}
                        >
                          {getBrokerStatus(broker.key)}
                        </span>
                      </div>

                      {/* Broker Features */}
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800">
                            {broker.authType === "oauth"
                              ? "OAuth 2.0"
                              : "API Key"}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-800">
                            {broker.type === "live"
                              ? "Live Trading"
                              : "Demo Only"}
                          </span>
                          {broker.key === "tradovate" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-800">
                              Demo + Live
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connect Button */}
                      <button
                        onClick={() => handleBrokerConnect(broker.key)}
                        disabled={isConnecting}
                        className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                          ${
                            isConnecting
                              ? "bg-gray-400 cursor-not-allowed"
                              : broker.key === "demo"
                              ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                              : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                          } 
                          focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200`}
                      >
                        {isConnecting ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Connecting...
                          </>
                        ) : (
                          <>
                            <svg
                              className="mr-2 h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                            Connect {broker.name}
                          </>
                        )}
                      </button>

                      {/* Setup Info */}
                      {broker.key !== "demo" && (
                        <div className="mt-3 text-xs text-gray-500">
                          {broker.key === "tradovate"
                            ? "Requires Tradovate developer account and OAuth setup"
                            : "Requires API credentials setup"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Need Help?</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    For Tradovate: You need to register your app at
                    developer.tradovate.com
                  </li>
                  <li>
                    For Demo trading: Use the Demo broker to test without real
                    money
                  </li>
                  <li>
                    Each broker requires different setup steps - check our
                    documentation
                  </li>
                  <li>
                    Contact support if you need help with broker integration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Type Selector Modal */}
      {showAccountTypeSelector && (
        <AccountTypeSelector
          isOpen={showAccountTypeSelector}
          onClose={() => {
            setShowAccountTypeSelector(false);
            setSelectedBroker(null);
          }}
          onSelect={handleAccountTypeSelect}
          brokerName={selectedBroker ? brokers[selectedBroker]?.name : ""}
        />
      )}
    </div>
  );
};

export default BrokerSelection;
