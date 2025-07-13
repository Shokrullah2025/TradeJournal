import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import Analytics from "./pages/Analytics";
import RiskCalculator from "./pages/RiskCalculator";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import MultiStepRegistration from "./pages/MultiStepRegistration";
import EmailVerification from "./components/auth/EmailVerification";
import Admin from "./pages/Admin";
import Billing from "./pages/Billing";
import BrokerSelection from "./pages/BrokerSelection";
import TradeEntry from "./pages/TradeEntry";
import OAuthCallback from "./pages/OAuthCallback";
import { TradeProvider } from "./context/TradeContext";
import { AuthProvider } from "./context/AuthContext";
import { BillingProvider } from "./context/BillingContext";
import { BrokerProvider } from "./context/BrokerContext";
import {
  ProtectedRoute,
  PublicRoute,
  AdminRoute,
  BillingRoute,
} from "./components/auth/ProtectedRoute";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <BillingProvider>
        <TradeProvider>
          <BrokerProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <MultiStepRegistration />
                    </PublicRoute>
                  }
                />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/auth/callback" element={<OAuthCallback />} />
                <Route
                  path="/auth/callback/tradovate"
                  element={<OAuthCallback />}
                />

                {/* Protected routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="flex h-screen bg-gray-50">
                        <Sidebar
                          isOpen={sidebarOpen}
                          onClose={() => setSidebarOpen(false)}
                        />

                        <div className="flex-1 flex flex-col overflow-hidden">
                          <Header onMenuClick={() => setSidebarOpen(true)} />

                          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/trades" element={<Trades />} />
                              <Route
                                path="/trade-entry"
                                element={<TradeEntry />}
                              />
                              <Route
                                path="/brokers"
                                element={<BrokerSelection />}
                              />
                              <Route
                                path="/analytics"
                                element={<Analytics />}
                              />
                              <Route
                                path="/risk-calculator"
                                element={<RiskCalculator />}
                              />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/profile" element={<Profile />} />
                              <Route
                                path="/admin"
                                element={
                                  <AdminRoute>
                                    <Admin />
                                  </AdminRoute>
                                }
                              />
                              <Route path="/billing" element={<Billing />} />
                            </Routes>
                          </main>
                        </div>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                }}
              />
            </Router>
          </BrokerProvider>
        </TradeProvider>
      </BillingProvider>
    </AuthProvider>
  );
}

export default App;
