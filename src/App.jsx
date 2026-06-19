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
import ContactMessages from "./pages/ContactMessages";
import Billing from "./pages/Billing";
import BrokerSelection from "./pages/BrokerSelection";
import TradeEntry from "./pages/TradeEntry";
import OAuthCallback from "./pages/OAuthCallback";

// Lazy — keeps the bundled country/state dataset out of the initial load.
const Profile = React.lazy(() => import("./pages/Profile"));
// Lazy — admin bundle (charts, tables) only loads for admins who open it.
const Admin = React.lazy(() => import("./pages/Admin"));

// Public product website — lazy-loaded so the marketing-free landing pages
// stay out of the authenticated app bundle (CLAUDE.md §3).
import SiteLayout from "./components/site/SiteLayout";
const Home = React.lazy(() => import("./pages/site/Home"));
const Features = React.lazy(() => import("./pages/site/Features"));
const Pricing = React.lazy(() => import("./pages/site/Pricing"));
const About = React.lazy(() => import("./pages/site/About"));
const Contact = React.lazy(() => import("./pages/site/Contact"));
import { TradeProvider } from "./context/TradeContext";
import { AuthProvider } from "./context/AuthContext";
import { FeatureFlagProvider } from "./context/FeatureFlagContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BillingProvider } from "./context/BillingContext";
import { BrokerProvider } from "./context/BrokerContext";
import { BacktestProvider } from "./context/BacktestContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import FeatureGate from "./components/common/FeatureGate";
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
        <FeatureFlagProvider>
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

                    {/* Public product website (no auth guard).
                        Declared explicitly so these out-rank the protected
                        "/*" matcher below by route specificity. */}
                    <Route element={<SiteLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                    </Route>

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
                                  <Route
                                    path="/dashboard"
                                    element={<Dashboard />}
                                  />
                                  <Route path="/trades" element={<Trades />} />
                                  <Route
                                    path="/backtest"
                                    element={
                                      <FeatureGate feature="backtesting" title="Backtesting unavailable">
                                        <Backtest />
                                      </FeatureGate>
                                    }
                                  />
                                  <Route
                                    path="/trade-entry"
                                    element={<TradeEntry />}
                                  />
                                  <Route
                                    path="/brokers"
                                    element={
                                      <FeatureGate feature="broker_sync" title="Broker Sync unavailable">
                                        <BrokerSelection />
                                      </FeatureGate>
                                    }
                                  />
                                  <Route
                                    path="/analytics"
                                    element={
                                      <FeatureGate feature="advanced_analytics" title="Advanced Analytics unavailable">
                                        <Analytics />
                                      </FeatureGate>
                                    }
                                  />
                                  <Route
                                    path="/risk-calculator"
                                    element={
                                      <FeatureGate feature="risk_calculator" title="Risk Calculator unavailable">
                                        <RiskCalculator />
                                      </FeatureGate>
                                    }
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
                                        <Suspense
                                          fallback={
                                            <div className="flex items-center justify-center h-64">
                                              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                                            </div>
                                          }
                                        >
                                          <Admin />
                                        </Suspense>
                                      </AdminRoute>
                                    }
                                  />
                                  <Route
                                    path="/admin/contact-submissions"
                                    element={
                                      <AdminRoute>
                                        <ContactMessages />
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
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
