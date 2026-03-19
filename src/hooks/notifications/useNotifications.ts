import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import {
  listNotifications,
  type BackendNotification,
  type NotificationsResponse,
} from "@/lib/notifications";

const QUERY_KEY = ["notifications"];

function updateFromNew(
  prev: NotificationsResponse | undefined,
  notification: BackendNotification,
): NotificationsResponse {
  if (!prev) {
    return {
      notifications: [notification],
      unread: notification.status === "unread" ? 1 : 0,
      total: 1,
    };
  }

  const exists = prev.notifications.some((n) => n._id === notification._id);
  if (exists) return prev;

  return {
    ...prev,
    notifications: [notification, ...prev.notifications],
    unread: prev.unread + (notification.status === "unread" ? 1 : 0),
    total: typeof prev.total === "number" ? prev.total + 1 : prev.total,
  };
}

function updateFromChange(
  prev: NotificationsResponse | undefined,
  notification: BackendNotification,
): NotificationsResponse | undefined {
  if (!prev) return prev;

  const idx = prev.notifications.findIndex((n) => n._id === notification._id);
  if (idx === -1) {
    return updateFromNew(prev, notification);
  }

  const existing = prev.notifications[idx];
  const nextNotifications = [...prev.notifications];
  nextNotifications[idx] = notification;

  let unread = prev.unread;
  if (existing.status !== notification.status) {
    if (existing.status === "unread") unread -= 1;
    if (notification.status === "unread") unread += 1;
  }

  return {
    ...prev,
    notifications: nextNotifications,
    unread,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const socket = useSocket();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => listNotifications(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!socket) return undefined;

    const handleNew = (payload: { notification?: BackendNotification }) => {
      if (!payload?.notification) return;
      qc.setQueryData<NotificationsResponse>(QUERY_KEY, (prev) =>
        updateFromNew(prev, payload.notification as BackendNotification),
      );
    };

    const handleUpdated = (payload: {
      notification?: BackendNotification;
      allRead?: boolean;
    }) => {
      if (payload?.allRead) {
        qc.setQueryData<NotificationsResponse>(QUERY_KEY, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) => ({
              ...n,
              status: "read",
            })),
            unread: 0,
          };
        });
        return;
      }

      if (!payload?.notification) return;
      qc.setQueryData<NotificationsResponse>(QUERY_KEY, (prev) =>
        updateFromChange(prev, payload.notification as BackendNotification),
      );
    };

    const handleRead = (payload: { id?: string }) => {
      if (!payload?.id) return;
      qc.setQueryData<NotificationsResponse>(QUERY_KEY, (prev) => {
        if (!prev) return prev;
        const idx = prev.notifications.findIndex((n) => n._id === payload.id);
        if (idx === -1) return prev;
        const existing = prev.notifications[idx];
        if (existing.status === "read") return prev;

        const nextNotifications = [...prev.notifications];
        nextNotifications[idx] = { ...existing, status: "read" };
        return {
          ...prev,
          notifications: nextNotifications,
          unread: Math.max(0, prev.unread - 1),
        };
      });
    };

    socket.on("notification:new", handleNew);
    socket.on("notification:updated", handleUpdated);
    socket.on("notification:read", handleRead);

    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:updated", handleUpdated);
      socket.off("notification:read", handleRead);
    };
  }, [socket, qc]);

  return query;
}
