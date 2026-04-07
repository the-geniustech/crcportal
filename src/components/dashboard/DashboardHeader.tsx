import React, { useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserRole } from "@/lib/auth";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useMarkNotificationReadMutation } from "@/hooks/notifications/useMarkNotificationReadMutation";
import { useMarkAllNotificationsReadMutation } from "@/hooks/notifications/useMarkAllNotificationsReadMutation";
import { USER_ROLE } from "@/lib/roles";

const notificationTypes = new Set([
  "payment_reminder",
  "loan_approved",
  "deposit_confirmed",
  "group_activity",
  "system",
  "promotion",
]);

const normalizeNotificationType = (type?: string) => {
  const value = String(type || "").trim();
  return notificationTypes.has(value) ? value : "system";
};

const formatTimestamp = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
};

const DashboardHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const notifications = useMemo(() => {
    const items = notificationsQuery.data?.notifications ?? [];
    return items.map((n) => ({
      id: n._id,
      type: normalizeNotificationType(n.type),
      title: n.title || "Notification",
      message: n.message || "",
      isRead: n.status === "read",
      createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
    }));
  }, [notificationsQuery.data?.notifications]);

  const unreadCount = Number(notificationsQuery.data?.unread ?? 0);

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleViewAllNotifications = () => {
    setNotificationsOpen(false);
    navigate("/notifications");
  };

  const navItems = [
    // { name: 'Dashboard', path: '/dashboard' },
    { name: "Groups", path: "/groups" },
    // { name: "Contribution Groups", path: "/contribution-groups" },
    { name: "Loans", path: "/loans" },
    { name: "Withdrawals", path: "/withdrawals" },
    // { name: "Payments", path: "/payments" },
    { name: "Calendar", path: "/calendar" },
    { name: "Credit Score", path: "/credit-score" },
    { name: "Guarantor", path: "/guarantor" },
    // { name: "Settings", path: "/settings" },
    // { name: 'Profile', path: '/profile' },
    // (user?.role === "admin" || user?.role === "groupCoordinator") && {
    //   name: "Admin",
    //   path: "/admin",
    // },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <header className="top-0 z-40 sticky bg-white border-gray-200 border-b">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              // onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1"
            >
              <div className="flex justify-center items-center bg-emerald-500 rounded-full w-8 h-8">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-lg">
                CRC Connect
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActivePath(item.path)
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden hover:bg-gray-100 p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative hover:bg-gray-100 p-2 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="w-6 h-6"
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
                {unreadCount > 0 && (
                  <span className="top-1 right-1 absolute flex justify-center items-center bg-red-500 px-1 rounded-full min-w-[0.75rem] h-3 font-semibold text-[10px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="right-0 z-50 absolute bg-white shadow-xl mt-2 py-2 border border-gray-100 rounded-xl w-80">
                  <div className="flex justify-between items-center px-4 py-2 border-gray-100 border-b">
                    <h3 className="font-semibold text-gray-900">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllMutation.mutate()}
                        className="font-medium text-emerald-600 hover:text-emerald-700 text-xs"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsQuery.isLoading ? (
                      <div className="px-4 py-6 text-gray-500 text-sm text-center">
                        Loading notifications...
                      </div>
                    ) : notificationsQuery.error ? (
                      <div className="px-4 py-6 text-gray-500 text-sm text-center">
                        Unable to load notifications.
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-gray-500 text-sm text-center">
                        You're all caught up.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            if (!notification.isRead) {
                              markReadMutation.mutate(notification.id);
                            }
                          }}
                          className={`px-4 py-3 cursor-pointer ${
                            notification.isRead
                              ? "hover:bg-gray-50"
                              : "border-l-4 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100"
                          }`}
                        >
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-gray-500 text-xs">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-gray-400 text-xs">
                            {formatTimestamp(notification.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                    {/*
                    <div className="hover:bg-gray-50 px-4 py-3 border-emerald-500 border-l-4 cursor-pointer">
                      <p className="font-medium text-gray-900 text-sm">
                        Loan Payment Reminder
                      </p>
                      <p className="mt-1 text-gray-500 text-xs">
                        Your monthly payment of ₦15,000 is due in 3 days
                      </p>
                      <p className="mt-1 text-gray-400 text-xs">2 hours ago</p>
                    </div>
                    <div className="hover:bg-gray-50 px-4 py-3 cursor-pointer">
                      <p className="font-medium text-gray-900 text-sm">
                        Deposit Confirmed
                      </p>
                      <p className="mt-1 text-gray-500 text-xs">
                        ₦50,000 has been added to your savings
                      </p>
                      <p className="mt-1 text-gray-400 text-xs">Yesterday</p>
                    </div>
                    <div className="hover:bg-gray-50 px-4 py-3 cursor-pointer">
                      <p className="font-medium text-gray-900 text-sm">
                        Group Meeting
                      </p>
                      <p className="mt-1 text-gray-500 text-xs">
                        Lagos Professionals Circle meeting this Saturday
                      </p>
                      <p className="mt-1 text-gray-400 text-xs">2 days ago</p>
                    </div>
                    */}
                  </div>
                  <div className="px-4 py-2 border-gray-100 border-t">
                    <button
                      onClick={handleViewAllNotifications}
                      className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <div className="flex justify-center items-center bg-emerald-500 rounded-full w-9 h-9 font-semibold text-white text-sm">
                  {getUserInitials()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-medium text-gray-900 text-sm">
                    {profile?.full_name || "Member"}
                  </p>
                  <p className="text-gray-500 text-xs">Active Member</p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="right-0 z-50 absolute bg-white shadow-xl mt-2 py-2 border border-gray-100 rounded-xl w-56">
                  <div className="px-4 py-3 border-gray-100 border-b">
                    <p className="font-semibold text-gray-900">
                      {profile?.full_name || "Member"}
                    </p>
                    <p className="text-gray-500 text-sm truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => navigate("/profile")}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      My Profile
                    </button>
                    <button
                      onClick={() => navigate("/payments")}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      Payments
                    </button>
                    <button
                      onClick={() => navigate("/withdrawals")}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 12H4m0 0l4-4m-4 4l4 4"
                        />
                      </svg>
                      Withdrawals
                    </button>
                    {/* <button
                      onClick={() => navigate("/groups")}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      My Groups
                    </button> */}
                    {hasUserRole(
                      user,
                      USER_ROLE.ADMIN,
                      USER_ROLE.GROUP_COORDINATOR,
                    ) ? (
                      <button
                        onClick={() => navigate("/admin")}
                        className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                        Admin Panel
                      </button>
                    ) : null}
                    <button
                      onClick={() => navigate("/settings")}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Settings
                    </button>
                    <button
                      onClick={() => navigate("/")}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-2 w-full text-gray-700 text-left"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      Back to Home
                    </button>
                  </div>
                  <div className="pt-2 border-gray-100 border-t">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 hover:bg-red-50 px-4 py-2 w-full text-red-600 text-left"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-gray-100 border-t">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-left transition-colors ${
                    isActivePath(item.path)
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(userMenuOpen || notificationsOpen) && (
        <div
          className="z-30 fixed inset-0"
          onClick={() => {
            setUserMenuOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default DashboardHeader;
