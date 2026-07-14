import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "../../context/NotificationContext";

const SEVERITY_ICON = {
  info: { Icon: Info, className: "text-blue-500" },
  success: { Icon: CheckCircle2, className: "text-green-500" },
  warning: { Icon: AlertTriangle, className: "text-amber-500" },
  error: { Icon: AlertCircle, className: "text-danger-500" },
};

const relativeTime = (iso) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    markAsRead,
    deleteMany,
    deleteAll,
    loadMore,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  // Selected notification ids for bulk actions (kept as a Set).
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const panelRef = useRef(null);

  // Close panel when clicking outside (mirrors the Header profile menu pattern).
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Drop selections that no longer exist (deleted elsewhere / paged out) and
  // clear everything when the panel closes.
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds((prev) => (prev.size ? new Set() : prev));
      return;
    }
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(notifications.map((n) => n.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [isOpen, notifications]);

  const selectedCount = selectedIds.size;

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkSelectedRead = () => {
    notifications
      .filter((n) => selectedIds.has(n.id) && !n.read_at)
      .forEach((n) => markAsRead(n.id));
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    setSelectedIds(new Set());
    await deleteMany(ids);
  };

  const handleClearAll = async () => {
    setSelectedIds(new Set());
    await deleteAll();
  };

  const handleItemClick = (notification) => {
    if (!notification.read_at) markAsRead(notification.id);
    if (notification.link_to) {
      setIsOpen(false);
      navigate(notification.link_to);
    }
  };

  return (
    <div className="header__notification relative" ref={panelRef}>
      <button
        data-test-id="notifications-bell-button"
        onClick={() => setIsOpen((open) => !open)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span
            data-test-id="notifications-unread-badge"
            className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-danger-500 rounded-full"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-test-id="notifications-dropdown-panel"
          className="fixed right-3 left-auto top-16 w-[78vw] max-w-[18rem] sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[200]"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            {/* Left: bulk actions */}
            <div className="flex items-center gap-2 min-w-0">
              {selectedCount > 0 ? (
                <>
                  <button
                    data-test-id="notifications-markread-selected-button"
                    onClick={handleMarkSelectedRead}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 px-1.5 py-1 rounded"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark read
                  </button>
                  <button
                    data-test-id="notifications-delete-selected-button"
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700 px-1.5 py-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </>
              ) : (
                <button
                  data-test-id="notifications-clearall-button"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                  className="inline-flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>

            {/* Right: title / selection count */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate shrink-0">
              {selectedCount > 0 ? `${selectedCount} selected` : "Notifications"}
            </h3>
          </div>

          <div
            data-test-id="notifications-list"
            className="max-h-96 overflow-y-auto"
          >
            {isLoading ? (
              <div
                data-test-id="notifications-loading"
                className="flex items-center justify-center py-10"
              >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div
                data-test-id="notifications-empty-state"
                className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                You're all caught up.
              </div>
            ) : (
              <>
                {notifications.map((n) => {
                  const { Icon, className } =
                    SEVERITY_ICON[n.severity] ?? SEVERITY_ICON.info;
                  const selected = selectedIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selected
                          ? "bg-primary-50 dark:bg-primary-900/20"
                          : n.read_at
                          ? ""
                          : "bg-primary-50/60 dark:bg-primary-900/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        data-test-id={`notifications-select-${n.id}`}
                        checked={selected}
                        onChange={() => toggleSelectOne(n.id)}
                        className="h-4 w-4 mt-4 ml-4 shrink-0 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        aria-label="Select notification"
                      />
                      <button
                        data-test-id={`notifications-item-${n.id}`}
                        onClick={() => handleItemClick(n)}
                        className="flex-1 min-w-0 text-left flex gap-3 pl-2 pr-4 py-3"
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${className}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {relativeTime(n.created_at)}
                          </p>
                        </div>
                        {!n.read_at && (
                          <span className="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-primary-600" />
                        )}
                      </button>
                    </div>
                  );
                })}
                {hasMore && (
                  <button
                    data-test-id="notifications-loadmore-button"
                    onClick={loadMore}
                    className="w-full py-3 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
