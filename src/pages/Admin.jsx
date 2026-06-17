import React, { useState, useEffect } from "react";
import {
  Users,
  Settings,
  BarChart3,
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertCircle,
  User,
  Calendar,
  FileText,
  Activity,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";

const Admin = () => {
  const { user: currentUser, fetchAllUsers, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Real data state
  const [stats, setStats] = useState({
    totalUsers: 0, activeUsers: 0, totalRevenue: 0,
    newUsersToday: 0, activeSubscriptions: 0, trialUsers: 0,
  });
  const [users, setUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        // User counts
        const [usersRes, activeSubsRes, trialSubsRes, activityRes] = await Promise.all([
          supabase.from("users").select("id, status, created_at", { count: "exact" }),
          supabase.from("user_subscriptions").select("id", { count: "exact" }).eq("status", "active"),
          supabase.from("user_subscriptions").select("id", { count: "exact" }).eq("status", "active").filter("trial_end", "gte", new Date().toISOString()),
          supabase.from("user_activity_log").select("action, created_at, user_id").order("created_at", { ascending: false }).limit(10),
        ]);

        if (cancelled) return;

        const today = new Date().toISOString().split("T")[0];
        const allUsers = usersRes.data ?? [];
        const newToday = allUsers.filter((u) => u.created_at?.startsWith(today)).length;
        const activeCount = allUsers.filter((u) => u.status === "active").length;

        setStats({
          totalUsers:           usersRes.count ?? 0,
          activeUsers:          activeCount,
          totalRevenue:         0, // requires Stripe data — placeholder
          newUsersToday:        newToday,
          activeSubscriptions:  activeSubsRes.count ?? 0,
          trialUsers:           trialSubsRes.count ?? 0,
        });

        setRecentActivity(activityRes.data ?? []);

        // Load user table
        const { users: allUsersData } = await fetchAllUsers({ page: 0, pageSize: 50 });
        if (!cancelled) setUsers(allUsersData ?? []);
      } catch (err) {
        if (!cancelled) toast.error("Failed to load admin data");
        console.error("[Admin] load error:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => { cancelled = true; };
  }, [fetchAllUsers]);

  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      await updateUser(userId, { status: newStatus });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`User status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const tabs = [
    { id: "dashboard", name: "Dashboard", icon: BarChart3 },
    { id: "users", name: "User Management", icon: Users },
    { id: "billing", name: "Billing Overview", icon: DollarSign },
    { id: "content", name: "Content Management", icon: Settings },
    { id: "analytics", name: "Analytics", icon: BarChart3 },
    { id: "security", name: "Security", icon: Shield },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats.totalUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats.activeUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    ${stats.totalRevenue}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    New Users Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats.newUsersToday}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Subscriptions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats.activeSubscriptions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Trial Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {stats.trialUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            Recent Activity
          </h3>
          <div className="mt-5">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((event) => (
                  <div key={event.created_at + event.user_id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Activity className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{event.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                className="input pl-10"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Login
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No users found.</td></tr>
            ) : users
              .filter((u) => {
                const profile = u.user_profiles?.[0] ?? u.user_profiles ?? {};
                const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.toLowerCase();
                const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || u.id.includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === "all" || u.status === statusFilter;
                return matchesSearch && matchesStatus;
              })
              .map((u) => {
                const profile = u.user_profiles?.[0] ?? u.user_profiles ?? {};
                const displayName = profile.display_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || u.id.slice(0, 8);
                return (
                  <tr key={u.id} data-testid={`admin-user-row-${u.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{u.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.status === "active"
                          ? "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">—</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">—</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {u.status === "active" ? (
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, "suspended")}
                          className="text-danger-600 dark:text-danger-400 hover:text-danger-900 dark:hover:text-danger-300 text-xs"
                          data-testid={`admin-suspend-btn-${u.id}`}
                        >Suspend</button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, "active")}
                          className="text-success-600 dark:text-success-400 hover:text-success-900 dark:hover:text-success-300 text-xs"
                          data-testid={`admin-activate-btn-${u.id}`}
                        >Activate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "users":
        return renderUsers();
      case "billing":
        return (
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Billing Overview
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Billing management features coming soon...
              </p>
            </div>
          </div>
        );
      case "content":
        return (
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Content Management
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Content management features coming soon...
              </p>
            </div>
          </div>
        );
      case "analytics":
        return (
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Analytics Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced analytics features coming soon...
              </p>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Security Settings
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Security management features coming soon...
              </p>
            </div>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-5">
        <h1 className="text-3xl font-bold leading-6 text-gray-900 dark:text-gray-100">
          Admin Dashboard
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-gray-500 dark:text-gray-400">
          Manage users, content, and system settings for Trade Journal Pro.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-600 dark:text-primary-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
};

export default Admin;
