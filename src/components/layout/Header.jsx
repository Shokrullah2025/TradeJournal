import React, { useState, useRef, useEffect } from "react";
import { Menu, Bell, User, Search, UserCircle, CreditCard, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTrades } from "../../context/TradeContext";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../common/ThemeToggle";

const Header = ({ onMenuClick }) => {
  const { stats } = useTrades();
  const { user, logout, loading } = useAuth();
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

  const profileMenuItems = [
    { name: "Profile", href: "/profile", icon: UserCircle },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Sign Out", action: "logout", icon: LogOut },
  ];

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleProfileMenuClick = (item) => {
    if (item.action === "logout") {
      logout();
    }
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="header bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ">
      <div className="header__container flex items-center justify-between px-6 py-4 h-16">
        <div className="header__left flex items-center space-x-4 ">
          <button
            onClick={onMenuClick}
            className="header__menu-button lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="w-5 h-5 dark:text-gray-300" />
          </button>

          <div className="header__stats hidden md:flex items-center space-x-6 ">
            <div className="header__pnl flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Total P&L:
                <span
                  className={`ml-1 font-semibold ${
                    stats.totalPnL >= 0 ? "text-success-600" : "text-danger-600"
                  }`}
                >
                  ${stats.totalPnL.toLocaleString()}
                </span>
              </span>
            </div>

            <div className="header__winrate flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Win Rate:
                <span className="ml-1 font-semibold text-primary-600">
                  {stats.winRate}%
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="header__right flex items-center space-x-4">
          <div className="header__search hidden md:flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trades..."
              className="bg-transparent border-none outline-none text-sm w-48 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <ThemeToggle size="sm" />

          <button className="header__notification p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full"></div>
          </button>

          <div className="header__profile relative" ref={profileMenuRef}>
            <div className="flex items-center space-x-3">
              <div className="header__profile-info hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {loading ? 'Loading...' : (user?.name || user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0] || 'Guest User')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.subscription === 'premium' ? 'Premium Account' : 
                   user?.subscription === 'trial' ? 'Trial Account' : 
                   user?.subscription === 'basic' ? 'Basic Account' : 
                   user ? 'Pro Account' : 'Not logged in'}
                </p>
              </div>

              <button
                onClick={toggleProfileMenu}
                className="header__profile-avatar w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors duration-200"
                title="Profile Menu"
              >
                <User className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-[99999]">
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
                        {loading ? 'Loading...' : (user?.name || user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0] || 'Guest User')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email || 'Not logged in'}
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
        </div>
      </div>
    </header>
  );
};

export default Header;
