import React from "react";
import { Menu, Bell, User, Search } from "lucide-react";
import { useTrades } from "../../context/TradeContext";

const Header = ({ onMenuClick }) => {
  const { stats } = useTrades();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
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

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Win Rate:
                <span className="ml-1 font-semibold text-primary-600">
                  {stats.winRate}%
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trades..."
              className="bg-transparent border-none outline-none text-sm w-48"
            />
          </div>

          <button className="p-2 rounded-lg hover:bg-gray-100 relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full"></div>
          </button>

          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">Trader</p>
              <p className="text-xs text-gray-500">Pro Account</p>
            </div>

            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
