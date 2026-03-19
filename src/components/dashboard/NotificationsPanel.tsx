import React from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  isLoading?: boolean;
  error?: string | null;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  isLoading,
  error,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewAll,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getTypeIcon = (type: Notification["type"]) => {
    const icons = {
      payment_reminder: (
        <div className="flex flex-shrink-0 justify-center items-center bg-orange-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      ),
      loan_approved: (
        <div className="flex flex-shrink-0 justify-center items-center bg-emerald-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      ),
      deposit_confirmed: (
        <div className="flex flex-shrink-0 justify-center items-center bg-blue-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
      ),
      group_activity: (
        <div className="flex flex-shrink-0 justify-center items-center bg-purple-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      ),
      system: (
        <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      ),
      promotion: (
        <div className="flex flex-shrink-0 justify-center items-center bg-amber-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      ),
    };
    return icons[type as keyof typeof icons] || icons.system;
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 px-2 py-0.5 rounded-full font-medium text-white text-xs">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-10 text-gray-500">
          <div className="mb-3 border-2 border-emerald-500 border-t-transparent rounded-full w-10 h-10 animate-spin"></div>
          <p className="text-sm">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-gray-500">Unable to load notifications.</p>
          <p className="mt-1 text-gray-400 text-sm">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-8 text-center">
          <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p className="text-gray-500">No notifications</p>
          <p className="mt-1 text-gray-400 text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              onClick={() => onMarkAsRead(notification.id)}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                notification.isRead
                  ? "hover:bg-gray-50"
                  : "bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              {getTypeIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p
                    className={`font-medium truncate ${notification.isRead ? "text-gray-700" : "text-gray-900"}`}
                  >
                    {notification.title}
                  </p>
                  {!notification.isRead && (
                    <span className="flex-shrink-0 bg-emerald-500 mt-2 rounded-full w-2 h-2"></span>
                  )}
                </div>
                <p className="mt-0.5 text-gray-500 text-sm line-clamp-2">
                  {notification.message}
                </p>
                <p className="mt-1 text-gray-400 text-xs">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 5 && (
        <button
          onClick={onViewAll}
          className="mt-4 py-2 w-full font-medium text-emerald-600 hover:text-emerald-700 text-sm text-center"
        >
          View all {notifications.length} notifications
        </button>
      )}
    </div>
  );
};

export default NotificationsPanel;
