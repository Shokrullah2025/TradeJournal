import React, { useState, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

// Page-level components are lazy-loaded (code-split) per engineering standards.
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Trades = React.lazy(() => import("./pages/Trades"));
const Backtest = React.lazy(() => import("./pages/Backtest"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const RiskCalculator = React.lazy(() => import("./pages/RiskCalculator"));
const Settings = React.lazy(() => import("./pages/Settings_new"));
const Login = React.lazy(() => import("./pages/Login"));
const MultiStepRegistration = React.lazy(() =>
  import("./pages/MultiStepRegistration")
);
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const EmailVerification = React.lazy(() =>
  import("./components/auth/EmailVerification")
);
const Admin = React.lazy(() => import("./pages/Admin"));
const Billing = React.lazy(() => import("./pages/Billing"));
const BrokerSelection = React.lazy(() => import("./pages/BrokerSelection"));
const TradeEntry = React.lazy(() => import("./pages/TradeEntry"));
const OAuthCallback = React.lazy(() => import("./pages/OAuthCallback"));

// Lazy — keeps the bundled country/state dataset out of the initial load.
const Profile = React.lazy(() => import("./pages/Profile"));
import { TradeProvider } from "./context/TradeContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BillingProvider } from "./context/BillingContext";
import { BrokerProvider } from "./context/BrokerContext";
import { BacktestProvider } from "./context/BacktestContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
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
                  <ErrorBoundary>
                  <Suspense
                    fallback={
                      <div
                        className="flex items-center justify-center h-screen"
                        data-testid="app-loading-spinner"
                      >
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                      </div>
                    }
                  >
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

                              <main className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
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
                                    element={<Profile />}
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
                              </main>
                            </div>
                          </div>
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                  </Suspense>
                  </ErrorBoundary>

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
