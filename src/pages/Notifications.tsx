import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Users,
  Megaphone,
  Filter,
  Search,
  ArrowLeft,
  Clock,
  CalendarDays,
  Info,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useMarkNotificationReadMutation } from "@/hooks/notifications/useMarkNotificationReadMutation";
import { useMarkAllNotificationsReadMutation } from "@/hooks/notifications/useMarkAllNotificationsReadMutation";
import type { BackendNotification } from "@/lib/notifications";

type NotificationUI = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
};

const notificationTypeMeta: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof Bell }
> = {
  payment_reminder: {
    label: "Payment",
    bg: "bg-amber-100",
    text: "text-amber-600",
    icon: Clock,
  },
  loan_approved: {
    label: "Loan",
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    icon: CreditCard,
  },
  deposit_confirmed: {
    label: "Wallet",
    bg: "bg-blue-100",
    text: "text-blue-600",
    icon: CheckCircle2,
  },
  group_activity: {
    label: "Group",
    bg: "bg-purple-100",
    text: "text-purple-600",
    icon: Users,
  },
  promotion: {
    label: "Promotion",
    bg: "bg-orange-100",
    text: "text-orange-600",
    icon: Megaphone,
  },
  system: {
    label: "System",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: Info,
  },
};

const notificationTypes = new Set(Object.keys(notificationTypeMeta));

const normalizeNotificationType = (type?: string) => {
  const value = String(type || "").trim();
  return notificationTypes.has(value) ? value : "system";
};

const formatTimestamp = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
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

const getBucketLabel = (dateString?: string) => {
  if (!dateString) return "Earlier";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return "Today";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const [statusFilter, setStatusFilter] = useState<
    "all" | "unread" | "read"
  >("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const notifications = useMemo(() => {
    const items: BackendNotification[] =
      notificationsQuery.data?.notifications ?? [];
    return items.map((n) => ({
      id: n._id,
      type: normalizeNotificationType(n.type),
      title: n.title || "Notification",
      message: n.message || "",
      isRead: n.status === "read",
      createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
      actionUrl:
        typeof n.metadata?.actionUrl === "string"
          ? n.metadata?.actionUrl
          : undefined,
    }));
  }, [notificationsQuery.data?.notifications]);

  const totalNotifications = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const todayCount = notifications.filter(
    (n) => getBucketLabel(n.createdAt) === "Today",
  ).length;
  const weekCount = notifications.filter(
    (n) => getBucketLabel(n.createdAt) === "This Week",
  ).length;

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = [...notifications];

    if (statusFilter === "read") {
      result = result.filter((n) => n.isRead);
    } else if (statusFilter === "unread") {
      result = result.filter((n) => !n.isRead);
    }

    if (typeFilter !== "all") {
      result = result.filter((n) => n.type === typeFilter);
    }

    if (query) {
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query),
      );
    }

    result.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [notifications, searchQuery, sortOrder, statusFilter, typeFilter]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotificationUI[]> = {
      Today: [],
      "This Week": [],
      Earlier: [],
    };
    filteredNotifications.forEach((notification) => {
      const bucket = getBucketLabel(notification.createdAt);
      groups[bucket].push(notification);
    });
    return groups;
  }, [filteredNotifications]);

  const handleOpenAction = (notification: NotificationUI) => {
    if (!notification.actionUrl) return;
    if (notification.actionUrl.startsWith("http")) {
      window.open(notification.actionUrl, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(notification.actionUrl);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-6">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-2xl text-white">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex justify-center items-center bg-white/20 rounded-2xl w-12 h-12">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-2xl">Notifications</h1>
                <p className="text-emerald-100 text-sm">
                  Real-time updates across loans, payments, and group activity.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={unreadCount === 0 || markAllMutation.isPending}
                className="bg-white hover:bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
              >
                {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
              </button>
            </div>
          </div>
        </div>

        <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
          <div className="bg-white p-4 border border-gray-100 rounded-xl">
            <p className="text-gray-500 text-xs uppercase tracking-wide">
              Total Notifications
            </p>
            <p className="mt-2 font-semibold text-gray-900 text-2xl">
              {totalNotifications}
            </p>
          </div>
          <div className="bg-white p-4 border border-gray-100 rounded-xl">
            <p className="text-gray-500 text-xs uppercase tracking-wide">
              Unread
            </p>
            <p className="mt-2 font-semibold text-emerald-600 text-2xl">
              {unreadCount}
            </p>
          </div>
          <div className="bg-white p-4 border border-gray-100 rounded-xl">
            <p className="text-gray-500 text-xs uppercase tracking-wide">
              Today
            </p>
            <p className="mt-2 font-semibold text-gray-900 text-2xl">
              {todayCount}
            </p>
          </div>
          <div className="bg-white p-4 border border-gray-100 rounded-xl">
            <p className="text-gray-500 text-xs uppercase tracking-wide">
              This Week
            </p>
            <p className="mt-2 font-semibold text-gray-900 text-2xl">
              {weekCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 border border-gray-100 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              Filter notifications
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "unread", "read"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                    statusFilter === status
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or message..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="all">All types</option>
                {Object.entries(notificationTypeMeta).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as "newest" | "oldest")
                }
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {notificationsQuery.isLoading ? (
            <div className="py-16 text-center text-gray-500">
              <div className="mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full w-10 h-10 animate-spin" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : notificationsQuery.error ? (
            <div className="py-16 text-center text-gray-500">
              <AlertTriangle className="mx-auto mb-3 w-8 h-8 text-amber-500" />
              <p className="font-medium">Unable to load notifications.</p>
              <p className="mt-1 text-sm text-gray-400">
                Please try again shortly.
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <CalendarDays className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-medium">No notifications found</p>
              <p className="mt-1 text-sm text-gray-400">
                Adjust your filters to see more updates.
              </p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([bucket, items]) =>
              items.length === 0 ? null : (
                <div key={bucket}>
                  <div className="flex items-center gap-2 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <CalendarDays className="w-4 h-4" />
                    {bucket}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((notification) => {
                      const meta =
                        notificationTypeMeta[notification.type] ||
                        notificationTypeMeta.system;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={notification.id}
                          className={`flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center ${
                            notification.isRead
                              ? "bg-white"
                              : "bg-emerald-50/60"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-full ${meta.bg}`}
                          >
                            <Icon className={`h-5 w-5 ${meta.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                  Unread
                                </span>
                              )}
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 md:text-right">
                            <span>{formatTimestamp(notification.createdAt)}</span>
                            <div className="flex items-center gap-2">
                              {!notification.isRead && (
                                <button
                                  onClick={() =>
                                    markReadMutation.mutate(notification.id)
                                  }
                                  className="rounded-full border border-emerald-200 px-3 py-1 text-emerald-700"
                                >
                                  Mark read
                                </button>
                              )}
                              {notification.actionUrl && (
                                <button
                                  onClick={() =>
                                    handleOpenAction(notification)
                                  }
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-white"
                                >
                                  Open
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
