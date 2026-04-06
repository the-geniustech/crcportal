import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notificationPreferences";

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<NotificationPreferences>) =>
      updateNotificationPreferences(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", "notification-preferences"] });
    },
  });
}
