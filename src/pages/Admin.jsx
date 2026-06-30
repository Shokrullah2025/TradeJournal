import React, { useState } from "react";
import {
  BarChart3,
  Users,
  Activity,
  Flag,
  DollarSign,
  ScrollText,
  Shield,
} from "lucide-react";
import AdminOverview from "../components/admin/AdminOverview";
import UserManagement from "../components/admin/UserManagement";
import SystemMetrics from "../components/admin/SystemMetrics";
import FeatureFlagsPanel from "../components/admin/FeatureFlagsPanel";
import BillingOverview from "../components/admin/BillingOverview";
import ActivityLog from "../components/admin/ActivityLog";

// ── Admin dashboard ────────────────────────────────────────────────────────
// Tabbed control center for operators. Each tab is a self-contained panel that
// loads its own admin-scoped data. The route is already guarded by <AdminRoute>
// (role === 'admin'); panels also rely on RLS is_admin() server-side.

const TABS = [
  { id: "overview", name: "Overview", icon: BarChart3, Panel: AdminOverview },
  { id: "users", name: "Users", icon: Users, Panel: UserManagement },
  { id: "metrics", name: "System Metrics", icon: Activity, Panel: SystemMetrics },
  { id: "features", name: "Feature Access", icon: Flag, Panel: FeatureFlagsPanel },
  { id: "billing", name: "Billing", icon: DollarSign, Panel: BillingOverview },
  { id: "activity", name: "Activity Log", icon: ScrollText, Panel: ActivityLog },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const ActivePanel = TABS.find((t) => t.id === activeTab)?.Panel ?? AdminOverview;

  return (
    <div className="space-y-6" data-test-id="admin-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage users, monitor system health, and control feature access for Tradgella.
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Admin sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-test-id={`admin-tab-${tab.id}`}
                className={`${
                  active
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active panel */}
      <div data-test-id="admin-panel-content">
        <ActivePanel />
      </div>
    </div>
  );
};

export default Admin;
