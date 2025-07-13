import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, Star, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";

const TrialActivation = ({ onTrialActivated }) => {
  const [isActivating, setIsActivating] = useState(false);
  const [trialStatus, setTrialStatus] = useState("pending"); // pending, activating, activated, error
  const navigate = useNavigate();

  const activateTrial = async () => {
    setIsActivating(true);
    setTrialStatus("activating");

    try {
      const response = await fetch("/api/user/start-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTrialStatus("activated");
        toast.success("Your 7-day free trial has been activated!");
        onTrialActivated?.(data);
      } else {
        setTrialStatus("error");
        toast.error(data.error || "Failed to activate trial");
      }
    } catch (error) {
      setTrialStatus("error");
      toast.error("Network error. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  const trialFeatures = [
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Unlimited Trade Entries",
      description: "Log as many trades as you want during your trial",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Advanced Analytics",
      description: "Track your performance with detailed charts and metrics",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Risk Management Tools",
      description: "Set stop losses, take profits, and manage your risk",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Export & Reporting",
      description: "Export your data and generate professional reports",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Mobile Access",
      description: "Access your journal from any device, anywhere",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Priority Support",
      description: "Get help when you need it with our dedicated support team",
    },
  ];

  if (trialStatus === "activated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mx-auto">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to Trade Journal Pro!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your 7-day free trial has been successfully activated.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  Trial Period
                </span>
              </div>
              <span className="text-sm font-bold text-green-800">
                7 Days Remaining
              </span>
            </div>
            <p className="text-sm text-green-700">
              Your trial expires on{" "}
              {new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              ).toLocaleDateString()}
              . You'll have full access to all Pro features until then.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 text-center">
              What's included in your trial:
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {trialFeatures.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {feature.icon}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 text-center">
              + All premium features and unlimited access
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Complete Your Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mx-auto">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Ready to Start Your Trial?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You're all set! Activate your 7-day free trial and start tracking
            your trades like a pro.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              7-Day Free Trial
            </h3>
            <span className="text-2xl font-bold text-blue-600">$0</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            No commitment, cancel anytime. After your trial, continue for just
            $29.99/month.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {trialFeatures.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                {feature.icon}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-sm font-medium text-yellow-800">
              Trial Details
            </span>
          </div>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="space-y-1">
              <li>• No charges during your 7-day trial</li>
              <li>• Full access to all Pro features</li>
              <li>• Cancel anytime with no fees</li>
              <li>• Automatic conversion to paid plan after trial</li>
            </ul>
          </div>
        </div>

        <div>
          <button
            onClick={activateTrial}
            disabled={isActivating}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isActivating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Activating Your Trial...
              </div>
            ) : (
              <div className="flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Activate 7-Day Free Trial
              </div>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By activating your trial, you agree to our{" "}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialActivation;
