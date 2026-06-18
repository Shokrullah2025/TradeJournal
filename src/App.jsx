import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import Backtest from "./pages/Backtest";
import Analytics from "./pages/Analytics";
import RiskCalculator from "./pages/RiskCalculator";
import Settings from "./pages/Settings_new";
import Login from "./pages/Login";
import MultiStepRegistration from "./pages/MultiStepRegistration";
import ResetPassword from "./pages/ResetPassword";
import EmailVerification from "./components/auth/EmailVerification";
import Admin from "./pages/Admin";
import Billing from "./pages/Billing";
import BrokerSelection from "./pages/BrokerSelection";
import TradeEntry from "./pages/TradeEntry";
import OAuthCallback from "./pages/OAuthCallback";

// Lazy — keeps the bundled country/state dataset out of the initial load.
const Profile = React.lazy(() => import("./pages/Profile"));

// Legal pages — lazy loaded, public routes
const TermsOfService = React.lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("./pages/legal/PrivacyPolicy"));
const Disclaimer = React.lazy(() => import("./pages/legal/Disclaimer"));
const CookiePolicy = React.lazy(() => import("./pages/legal/CookiePolicy"));
const RefundPolicy = React.lazy(() => import("./pages/legal/RefundPolicy"));
const AcceptableUsePolicy = React.lazy(() => import("./pages/legal/AcceptableUsePolicy"));
const DMCAPolicy = React.lazy(() => import("./pages/legal/DMCAPolicy"));
import { TradeProvider } from "./context/TradeContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BillingProvider } from "./context/BillingContext";
import { BrokerProvider } from "./context/BrokerContext";
import { BacktestProvider } from "./context/BacktestContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Footer from "./components/layout/Footer";
import {
  ProtectedRoute,
  PublicRoute,
  AdminRoute,
  BillingRoute,
} from "./components/auth/ProtectedRoute";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BillingProvider>
            <TradeProvider>
              <BrokerProvider>
                <BacktestProvider>
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
                    <Route
                      path="/auth/reset-password"
                      element={<ResetPassword />}
                    />
                    <Route
                      path="/verify-email"
                      element={<EmailVerification />}
                    />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    <Route
                      path="/auth/callback/tradovate"
                      element={<OAuthCallback />}
                    />

                    {/* Legal pages — public, no auth required */}
                    <Route path="/terms" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><TermsOfService /></Suspense>} />
                    <Route path="/privacy" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><PrivacyPolicy /></Suspense>} />
                    <Route path="/disclaimer" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><Disclaimer /></Suspense>} />
                    <Route path="/cookies" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><CookiePolicy /></Suspense>} />
                    <Route path="/refund" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><RefundPolicy /></Suspense>} />
                    <Route path="/aup" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><AcceptableUsePolicy /></Suspense>} />
                    <Route path="/dmca" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><DMCAPolicy /></Suspense>} />

                    {/* Protected routes */}
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <ErrorBoundary>
                          <div className="flex h-screen bg-gray-50">
                            <Sidebar
                              isOpen={sidebarOpen}
                              onClose={() => setSidebarOpen(false)}
                              isCollapsed={sidebarCollapsed}
                              onToggleCollapse={() =>
                                setSidebarCollapsed(!sidebarCollapsed)
                              }
                            />

                            <div className="flex-1 flex flex-col overflow-hidden">
                              <Header
                                onMenuClick={() => setSidebarOpen(true)}
                              />

                              <main className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                                <div className="flex-1 p-6">
                                <Routes>
                                  <Route path="/" element={<Dashboard />} />
                                  <Route path="/trades" element={<Trades />} />
                                  <Route
                                    path="/backtest"
                                    element={<Backtest />}
                                  />
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
                                  <Route
                                    path="/settings"
                                    element={<Settings />}
                                  />
                                  <Route
                                    path="/profile"
                                    element={
                                      <Suspense
                                        fallback={
                                          <div className="flex items-center justify-center h-64">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                                          </div>
                                        }
                                      >
                                        <Profile />
                                      </Suspense>
                                    }
                                  />
                                  <Route
                                    path="/admin"
                                    element={
                                      <AdminRoute>
                                        <Admin />
                                      </AdminRoute>
                                    }
                                  />
                                  <Route
                                    path="/billing"
                                    element={<Billing />}
                                  />
                                </Routes>
                                </div>
                                <Footer />
                              </main>
                            </div>
                          </div>
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>

                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 3000,
                      className: "toast-notification",
                      style: {
                        borderRadius: "8px",
                        background: "var(--toast-bg)",
                        color: "var(--toast-color)",
                        boxShadow: "var(--toast-shadow)",
                        border: "1px solid var(--toast-border)",
                      },
                    }}
                  />
                </Router>
                </BacktestProvider>
              </BrokerProvider>
            </TradeProvider>
          </BillingProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
