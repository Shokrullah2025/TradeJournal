import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calculator,
  Settings,
  TrendingUp,
  X,
  Shield,
  CreditCard,
  LogOut,
  UserCircle,
  Link,
  Activity,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Trades", href: "/trades", icon: BookOpen },
    { name: "Backtest", href: "/backtest", icon: Activity },
    { name: "Brokers", href: "/brokers", icon: Link },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Risk Calculator", href: "/risk-calculator", icon: Calculator },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const adminNavigation = [
    { name: "Admin Panel", href: "/admin", icon: Shield, adminOnly: true },
  ];

  const accountNavigation = [
    { name: "Profile", href: "/profile", icon: UserCircle },
    { name: "Billing", href: "/billing", icon: CreditCard },
  ];

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-gray-600 dark:bg-gray-900 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`sidebar fixed inset-y-0 left-0 z-30 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-500 ease-in-out lg:translate-x-0 lg:static lg:inset-0 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } w-64`}
      >
        <div
          className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 transition-all duration-500 relative overflow-hidden px-6 py-6"
        >
          <div className="flex items-center space-x-3 transition-opacity duration-500">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Trade Journal
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pro Version
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-500"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto transition-all duration-500">
          {/* Removed user info section - starts directly with navigation */}
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `group flex items-center text-sm font-medium rounded-lg transition-all duration-500 px-3 py-2 ${
                      isActive
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0 mr-3" />
                  <span className="transition-opacity duration-500">{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Account Navigation */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Account
            </p>
            <div className="space-y-1">
              {accountNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => onClose()}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-500 ${
                        isActive
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`
                    }
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Admin Navigation */}
          {user?.role === "admin" && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Admin
              </p>
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => onClose()}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-500 ${
                          isActive
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`
                      }
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-700 transition-all duration-500 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center w-full text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-500 px-3 py-2"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="transition-opacity duration-500">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
