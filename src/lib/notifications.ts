import { api, getApiErrorMessage } from "./api/client";

export type BackendNotification = {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  status: "read" | "unread";
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationsResponse = {
  notifications: BackendNotification[];
  unread: number;
  total?: number;
};

export async function listNotifications(params?: {
  status?: "read" | "unread";
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  try {
    const res = await api.get("/notifications", { params });
    return {
      notifications: (res.data?.data?.notifications ?? []) as BackendNotification[],
      unread: Number(res.data?.data?.unread ?? 0),
      total: typeof res.data?.total === "number" ? res.data.total : undefined,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listUnreadNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  try {
    const res = await api.get("/notifications/unread", { params });
    return {
      notifications: (res.data?.data?.notifications ?? []) as BackendNotification[],
      unread: Number(res.data?.data?.unread ?? 0),
      total: typeof res.data?.total === "number" ? res.data.total : undefined,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<BackendNotification> {
  try {
    const res = await api.patch(`/notifications/${notificationId}/read`);
    return res.data?.data?.notification as BackendNotification;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function markAllNotificationsRead(): Promise<{
  ok: boolean;
  matchedCount: number;
  modifiedCount: number;
}> {
  try {
    const res = await api.patch("/notifications/read-all");
    return res.data?.data ?? { ok: true, matchedCount: 0, modifiedCount: 0 };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
