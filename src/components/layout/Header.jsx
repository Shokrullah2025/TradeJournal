import React from "react";
import { Menu, Bell, User, Search } from "lucide-react";
import { useTrades } from "../../context/TradeContext";
import ThemeToggle from "../common/ThemeToggle";

const Header = ({ onMenuClick }) => {
  const { stats } = useTrades();

  return (
    <header className="header bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="header__container flex items-center justify-between px-6 py-4">
        <div className="header__left flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="header__menu-button lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="w-5 h-5 dark:text-gray-300" />
          </button>

          <div className="header__stats hidden md:flex items-center space-x-6">
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

          <div className="header__profile flex items-center space-x-3">
            <div className="header__profile-info hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Trader</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pro Account</p>
            </div>

            <div className="header__profile-avatar w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
