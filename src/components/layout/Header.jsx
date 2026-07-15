import React, { useState, useRef, useEffect, useMemo } from "react";
import { Menu, User, Search, UserCircle, CreditCard, LogOut } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTrades } from "../../context/TradeContext";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../common/ThemeToggle";
import NotificationBell from "./NotificationBell";

const Header = ({ onMenuClick }) => {
  const { stats, trades, searchTerm, setSearchTerm } = useTrades();
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // The Total P&L / Win Rate summary only makes sense on the dashboard. Hide it
  // on every other page (trades, backtest, brokers, analytics, risk calculator,
  // settings, admin panel, contact inbox, etc.).
  const showStats = location.pathname === "/dashboard";
  // The trade search only makes sense where trades are shown: the trade list
  // itself and the dashboard. Elsewhere (settings, billing, admin, ...) it's
  // noise, so hide it.
  const showSearch =
    location.pathname === "/dashboard" || location.pathname === "/trades";

  // --- Search autocomplete -------------------------------------------------
  // Suggestions are derived locally from the user's own trades (symbols,
  // strategies, tags) — no queries, just a memo over the context trade list.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchRef = useRef(null);

  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    const seen = new Set();
    const out = [];
    const push = (value, type) => {
      if (!value) return;
      const key = `${type}:${value.toLowerCase()}`;
      if (seen.has(key)) return;
      if (!value.toLowerCase().includes(term)) return;
      seen.add(key);
      out.push({ value, type });
    };
    for (const t of trades) {
      push(t.instrument, "Symbol");
      push(t.strategy, "Strategy");
      (t.tags || []).forEach((tag) => push(tag, "Tag"));
      if (out.length >= 24) break; // plenty to rank; list is capped below
    }
    // Symbols first, then strategies, then tags; cap the dropdown at 8.
    const order = { Symbol: 0, Strategy: 1, Tag: 2 };
    return out.sort((a, b) => order[a.type] - order[b.type]).slice(0, 8);
  }, [trades, searchTerm]);

  // Close the dropdown when clicking outside the search pill.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Applying a term (picked suggestion or free text) jumps to the trade list
  // with the filter already applied (the term lives in TradeContext, shared
  // with that page).
  const applySearch = (value) => {
    setSearchTerm(value);
    setIsSearchOpen(false);
    setActiveSuggestion(-1);
    if (location.pathname !== "/trades") {
      navigate("/trades", { state: { fromHeaderSearch: true } });
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsSearchOpen(true);
    setActiveSuggestion(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsSearchOpen(true);
      setActiveSuggestion((i) => (i + 1) % Math.max(suggestions.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion(
        (i) => (i - 1 + suggestions.length) % Math.max(suggestions.length, 1),
      );
    } else if (e.key === "Enter") {
      if (isSearchOpen && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        applySearch(suggestions[activeSuggestion].value);
      } else {
        applySearch(searchTerm);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      setActiveSuggestion(-1);
    }
  };
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
    // Open Profile as a Settings tab (rendered beside the settings subnav),
    // not the standalone /profile page — so it behaves like every other
    // settings section instead of a lone full-screen page.
    { name: "Profile", href: "/settings?tab=profile", icon: UserCircle },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Sign Out", action: "logout", icon: LogOut },
  ];

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  // Prefer the display name the user chose, then their full name, then the
  // email handle. Falls back to a placeholder while the profile is loading.
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const displayName = loading
    ? "Loading..."
    : user?.displayName?.trim() ||
      fullName ||
      user?.email?.split("@")[0] ||
      "Guest User";

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

          {showStats && (
          <div className="header__stats hidden md:flex items-center space-x-3">
            {/* Pills share the search bar's surface + border so the header
                reads as one family of controls in both themes. */}
            <div className="header__pnl flex items-center gap-2 bg-gray-100 dark:bg-gray-700 border border-transparent dark:border-gray-600 rounded-lg px-3 py-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  stats.totalPnL >= 0 ? "bg-success-500" : "bg-danger-500"
                }`}
              ></div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total P&L
              </span>
              <span
                className={`text-sm font-semibold font-mono ${
                  stats.totalPnL >= 0
                    ? "text-success-600 dark:text-success-400"
                    : "text-danger-600 dark:text-danger-400"
                }`}
                data-test-id="header-total-pnl-value"
              >
                {`${stats.totalPnL < 0 ? "-" : "+"}$${Math.abs(
                  stats.totalPnL
                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </span>
            </div>

            <div className="header__winrate flex items-center gap-2 bg-gray-100 dark:bg-gray-700 border border-transparent dark:border-gray-600 rounded-lg px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Win Rate
              </span>
              <span
                className="text-sm font-semibold font-mono text-primary-600 dark:text-primary-400"
                data-test-id="header-win-rate-value"
              >
                {stats.winRate}%
              </span>
            </div>
          </div>
          )}
        </div>

        <div className="header__right flex items-center space-x-4">
          {showSearch && (
            <div className="header__search relative hidden md:block" ref={searchRef}>
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 border border-transparent dark:border-gray-600 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search symbol, strategy, tag..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => searchTerm && setIsSearchOpen(true)}
                  data-test-id="header-search-input"
                  className="bg-transparent border-none outline-none text-sm w-52 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>

              {/* Autocomplete dropdown — suggestions from the user's own
                  symbols, strategies and tags; a friendly no-match message
                  otherwise. */}
              {isSearchOpen && searchTerm.trim() && (
                <div
                  className="absolute left-0 top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-[200]"
                  data-test-id="header-search-suggestions"
                >
                  {suggestions.length > 0 ? (
                    suggestions.map((s, i) => (
                      <button
                        key={`${s.type}-${s.value}`}
                        type="button"
                        // mousedown fires before the input's blur/click-outside,
                        // so the pick lands before the dropdown closes.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySearch(s.value);
                        }}
                        onMouseEnter={() => setActiveSuggestion(i)}
                        data-test-id={`header-search-suggestion-${i}`}
                        className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors ${
                          i === activeSuggestion
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="truncate">{s.value}</span>
                        <span className="ml-3 shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {s.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div
                      className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400"
                      data-test-id="header-search-no-results"
                    >
                      <p className="font-medium text-gray-700 dark:text-gray-200">
                        No matches for “{searchTerm.trim()}”
                      </p>
                      <p className="mt-1 text-xs">
                        You can search by symbol, strategy, notes or tags.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <ThemeToggle size="sm" />

          <NotificationBell />

          <div className="header__profile relative" ref={profileMenuRef}>
            <div className="flex items-center space-x-3">
              <div className="header__profile-info hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100" data-test-id="header-profile-name">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.subscription === 'trial' ? 'Trial Account' :
                   user?.subscription === 'basic' ? 'Starter Account' :
                   user?.subscription === 'premium' ? 'Pro Account' :
                   user?.subscription === 'enterprise' ? 'Elite Account' :
                   user ? 'Account' : 'Not logged in'}
                </p>
              </div>

              <button
                onClick={toggleProfileMenu}
                className="header__profile-avatar w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors duration-200 overflow-hidden"
                title="Profile Menu"
                data-test-id="header-profile-menu-btn"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-[200]">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center overflow-hidden">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {displayName}
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
