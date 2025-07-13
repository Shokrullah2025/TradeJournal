import React, { useState } from "react";
import { X, AlertCircle, TrendingUp, TestTube } from "lucide-react";

const AccountTypeSelector = ({ broker, onSelect, onCancel }) => {
  const [selectedType, setSelectedType] = useState(null);

  const accountTypes = [
    {
      id: "demo",
      name: "Demo Account",
      icon: <TestTube className="w-6 h-6" />,
      description: "Paper trading with virtual money",
      features: [
        "Risk-free trading environment",
        "Virtual $50,000 starting balance",
        "All platform features available",
        "Perfect for learning and testing",
      ],
      color: "bg-blue-50 border-blue-200 text-blue-700",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "live",
      name: "Live Account",
      icon: <TrendingUp className="w-6 h-6" />,
      description: "Real trading with actual money",
      features: [
        "Real money trading",
        "Live market data",
        "Actual profit and loss",
        "Professional trading environment",
      ],
      color: "bg-green-50 border-green-200 text-green-700",
      buttonColor: "bg-green-600 hover:bg-green-700",
    },
  ];

  const handleSelect = (type) => {
    setSelectedType(type);
  };

  const handleConnect = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{broker.logo}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Connect to {broker.name}
              </h2>
              <p className="text-sm text-gray-600">
                Choose your account type to continue
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-start space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Important</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Demo and live accounts use different login credentials and
                  endpoints. Make sure to select the correct account type for
                  your {broker.name} account.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {accountTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => handleSelect(type.id)}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedType === type.id
                    ? type.color + " border-opacity-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className={selectedType === type.id ? "" : "text-gray-400"}
                  >
                    {type.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {type.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedType === type.id
                            ? "bg-current"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={!selectedType}
              className={`px-6 py-2 text-white rounded-lg transition-colors ${
                selectedType
                  ? accountTypes.find((t) => t.id === selectedType)?.buttonColor
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Connect to{" "}
              {selectedType
                ? accountTypes.find((t) => t.id === selectedType)?.name
                : "Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTypeSelector;
