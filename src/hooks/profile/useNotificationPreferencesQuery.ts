import { useQuery } from "@tanstack/react-query";
import { getNotificationPreferences } from "@/lib/notificationPreferences";

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: ["profile", "notification-preferences"],
    queryFn: async () => getNotificationPreferences(),
  });
}

