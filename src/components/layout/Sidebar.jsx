import React from "react";
import { NavLink } from "react-router-dom";
import {
  Gauge,
  CandlestickChart,
  FlaskConical,
  PlugZap,
  Radar,
  Scale,
  SlidersHorizontal,
  ShieldCheck,
  Inbox,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useFeatureFlags } from "../../context/FeatureFlagContext";
import { isComingSoon } from "../../lib/featureFlags";

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();

  // `feature` ties a nav item to a feature flag — when an admin disables that
  // feature for the current user's audience (plan/role/trial), the item is
  // hidden. Items with no `feature` are always available. Features in
  // COMING_SOON_FEATURES stay listed but carry a "Soon" pill; their page
  // renders behind the ComingSoonGate blur.
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Gauge },
    { name: "Trades", href: "/trades", icon: CandlestickChart },
    { name: "Backtest", href: "/backtest", icon: FlaskConical, feature: "backtesting" },
    { name: "Brokers", href: "/brokers", icon: PlugZap, feature: "broker_sync" },
    { name: "Analytics", href: "/analytics", icon: Radar, feature: "advanced_analytics" },
    { name: "Risk Calculator", href: "/risk-calculator", icon: Scale, feature: "risk_calculator" },
    { name: "Settings", href: "/settings", icon: SlidersHorizontal },
  ]
    .filter((item) => !item.feature || isFeatureEnabled(item.feature))
    .map((item) => ({ ...item, soon: item.feature ? isComingSoon(item.feature) : false }));

  const adminNavigation = [
    // `end` keeps "/admin" from matching its nested routes (e.g. the Contact
    // Inbox path), so only one admin item is highlighted at a time.
    { name: "Admin Panel", href: "/admin", icon: ShieldCheck, adminOnly: true, end: true },
    {
      name: "Contact Inbox",
      href: "/admin/contact-submissions",
      icon: Inbox,
      adminOnly: true,
    },
  ];

  // Icon tile — mirrors the marketing mega-menu's tinted tiles. The active
  // route's tile fills with the brand gradient; inactive tiles stay a soft
  // teal tint that deepens on hover.
  const iconTile = (isActive) =>
    `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-600/30"
        : "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50"
    }`;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 dark:bg-gray-900 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`sidebar fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 overflow-hidden ${
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
                <img
                  src="/logo.png"
                  alt="ZalorTrade logo"
                  className="w-10 h-10 rounded-xl object-cover shadow-md shadow-primary-600/30 group-hover:opacity-0 transition-opacity duration-200"
                />

                {/* Expand icon - hidden by default, visible on hover, same size as logo */}
                <div className="absolute flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl opacity-0 group-hover:opacity-100 hover:brightness-110 transition-all duration-200">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </button>
            ) : (
              <>
                <img
                  src="/logo.png"
                  alt="ZalorTrade logo"
                  className="w-10 h-10 rounded-xl object-cover shadow-md shadow-primary-600/30"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Zalor
                    <span className="text-primary-600 dark:text-primary-400">
                      Trade
                    </span>
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
                  data-testid={`sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}-link`}
                  className={({ isActive }) =>
                    `group flex items-center text-sm font-medium rounded-lg transition-all duration-200 ${
                      isCollapsed ? "px-2 py-1.5 justify-center" : "px-2 py-1.5"
                    } ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                  title={isCollapsed ? `${item.name}${item.soon ? " (Coming soon)" : ""}` : ""}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`${iconTile(isActive)} ${isCollapsed ? "" : "mr-3"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {!isCollapsed && (
                        <span className="flex-1 transition-opacity duration-300 whitespace-nowrap overflow-hidden text-ellipsis">
                          {item.name}
                        </span>
                      )}
                      {!isCollapsed && item.soon && (
                        <span
                          data-testid={`sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}-soon-pill`}
                          className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                        >
                          Soon
                        </span>
                      )}
                    </>
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
                      end={item.end}
                      onClick={() => onClose()}
                      data-testid={`sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}-link`}
                      className={({ isActive }) =>
                        `group flex items-center px-2 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`${iconTile(isActive)} mr-3`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            {item.name}
                          </span>
                          {item.badge > 0 && (
                            <span
                              data-testid={`sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}-badge`}
                              className="ml-2 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-danger-500 text-[11px] font-semibold text-white"
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </>
                      )}
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
                    end={item.end}
                    onClick={() => onClose()}
                    data-testid={`sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}-link-collapsed`}
                    className={({ isActive }) =>
                      `group flex items-center justify-center px-2 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`
                    }
                    title={
                      item.badge > 0
                        ? `${item.name} (${item.badge} new)`
                        : item.name
                    }
                  >
                    {({ isActive }) => (
                      <div className="relative">
                        <span className={iconTile(isActive)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        {item.badge > 0 && (
                          <span
                            data-testid={`sidebar-${item.name.toLowerCase().replace(/\s+/g, "-")}-dot`}
                            className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full bg-danger-500 text-[9px] font-semibold text-white"
                          >
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </div>
                    )}
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
