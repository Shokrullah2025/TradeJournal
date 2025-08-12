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
  Link,
  Activity,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  
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

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-gray-600 dark:bg-gray-900 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`sidebar fixed inset-y-0 left-0 z-30 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-16" : "w-64"}`}
      >
        <div
          className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 transition-all duration-300 relative overflow-hidden h-16 ${
            isCollapsed ? "px-2 hover:bg-gray-50 dark:hover:bg-gray-700/30" : "px-6"
          }`}
        >
          <div
            className={`flex items-center transition-all duration-300 ${
              isCollapsed ? "space-x-3" : "space-x-3"
            }`}
          >
            {isCollapsed ? (
              <button
                onClick={onToggleCollapse}
                className="relative flex items-center justify-center w-full group"
                title="Expand Sidebar"
              >
                {/* App Logo - visible by default, hidden on hover */}
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg group-hover:opacity-0 transition-opacity duration-200">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                
                {/* Expand icon - hidden by default, visible on hover, same size as logo */}
                <div className="absolute flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-700 transition-all duration-200">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </button>
            ) : (
              <>
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Journal
                  </h1>
                </div>
              </>
            )}
          </div>
          <div
            className={`flex items-center space-x-2 ${
              isCollapsed ? "hidden" : ""
            }`}
          >
            <button
              onClick={onToggleCollapse}
              className="hidden lg:block p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        <nav
          className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ${
            isCollapsed ? "p-2" : "p-4"
          }`}
        >
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
                    `group flex items-center text-sm font-medium rounded-lg transition-all duration-200 ${
                      isCollapsed ? "px-3 py-2" : "px-3 py-2"
                    } ${
                      isActive
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                  title={isCollapsed ? item.name : ""}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      isCollapsed ? "" : "mr-3"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="transition-opacity duration-300 whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Admin Navigation */}
          {user?.role === "admin" && !isCollapsed && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
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
                        `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`
                      }
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.name}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsed Admin Navigation */}
          {user?.role === "admin" && isCollapsed && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => onClose()}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`
                    }
                    title={item.name}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
