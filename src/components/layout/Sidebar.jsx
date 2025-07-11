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
  User,
  UserCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Trades", href: "/trades", icon: BookOpen },
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Trade Journal</h1>
              <p className="text-xs text-gray-500">Pro Version</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.subscription === "premium"
                    ? "bg-yellow-100 text-yellow-800"
                    : user?.subscription === "enterprise"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {user?.subscription}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8">
          {/* Main Navigation */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Main
            </h3>
            <div className="mt-2 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                  onClick={() => window.innerWidth < 1024 && onClose()}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Account Navigation */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Account
            </h3>
            <div className="mt-2 space-y-1">
              {accountNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                  onClick={() => window.innerWidth < 1024 && onClose()}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Admin Navigation */}
          {user?.role === "admin" && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h3>
              <div className="mt-2 space-y-1">
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-purple-100 text-purple-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`
                    }
                    onClick={() => window.innerWidth < 1024 && onClose()}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
