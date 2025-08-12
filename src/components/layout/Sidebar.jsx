import React, { useState, useRef, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close profile menu when sidebar is collapsed/expanded
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [isCollapsed]);

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

  const profileMenuItems = [
    { name: "Profile", href: "/profile", icon: UserCircle },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Sign Out", action: "logout", icon: LogOut },
  ];

  const handleLogout = () => {
    logout();
    onClose();
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleProfileMenuClick = (item) => {
    if (item.action === "logout") {
      handleLogout();
    } else {
      onClose();
    }
    setIsProfileMenuOpen(false);
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
        className={`sidebar fixed inset-y-0 left-0 z-30 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 overflow-hidden relative ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-16" : "w-64"}`}
      >
        <div
          className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 transition-all duration-300 relative overflow-hidden h-16 ${
            isCollapsed ? "px-2" : "px-6"
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
                className="group flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform duration-200" />
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

        {/* Profile Menu */}
        <div
          ref={profileMenuRef}
          className={`absolute bottom-4 transition-all duration-300 ${
            isCollapsed ? "left-2 right-2" : "left-4 right-4"
          }`}
        >
          {isCollapsed ? (
            /* Collapsed Profile - Icon Only */
            <div className="relative">
              <button
                onClick={toggleProfileMenu}
                className="flex items-center px-3 py-2 w-full text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                title="Profile Menu"
              >
                <UserCircle className="h-5 w-5 flex-shrink-0" />
              </button>
              
              {/* Collapsed Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="fixed bottom-4 left-20 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-[99999]">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <UserCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {user?.name || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user?.email || 'user@example.com'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {profileMenuItems.map((item) => {
                      const Icon = item.icon;
                      if (item.action === "logout") {
                        return (
                          <button
                            key={item.name}
                            onClick={() => handleProfileMenuClick(item)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                          >
                            <Icon className="mr-3 h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                            <span>{item.name}</span>
                          </button>
                        );
                      }
                      return (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={() => handleProfileMenuClick(item)}
                          className={({ isActive }) =>
                            `flex items-center px-4 py-2 text-sm transition-all duration-200 group ${
                              isActive
                                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`
                          }
                        >
                          <Icon className="mr-3 h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Expanded Profile - Full Info with Dropdown */
            <div className="relative">
              <div className="px-4 py-3">
                <button
                  onClick={toggleProfileMenu}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
                >
                  <UserCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user?.name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.plan || 'Free Plan'}
                    </p>
                  </div>
                  <ChevronUp className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                    isProfileMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>
              </div>
              
              {/* Expanded Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[99999]">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    if (item.action === "logout") {
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleProfileMenuClick(item)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                        >
                          <Icon className="mr-3 h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                          <span>{item.name}</span>
                        </button>
                      );
                    }
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={() => handleProfileMenuClick(item)}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-all duration-200 group ${
                            isActive
                              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`
                        }
                      >
                        <Icon className="mr-3 h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
