import { api, getApiErrorMessage } from "@/lib/api/client";

export type NotificationPreferences = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  paymentReminders: boolean;
  groupUpdates: boolean;
  loanUpdates: boolean;
  meetingReminders: boolean;
  marketingEmails: boolean;
  loanPdfSendApplicant?: boolean;
  loanPdfSendGuarantors?: boolean;
  loanPdfExtraEmails?: string[];
};

export async function getNotificationPreferences() {
  try {
    const res = await api.get("/users/me/notification-preferences");
    return res.data?.data?.preferences as NotificationPreferences;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateNotificationPreferences(
  payload: Partial<NotificationPreferences>,
) {
  try {
    const res = await api.put("/users/me/notification-preferences", payload);
    return res.data?.data?.preferences as NotificationPreferences;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
