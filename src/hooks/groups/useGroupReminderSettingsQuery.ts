import { useQuery } from "@tanstack/react-query";
import { getGroupReminderSettings } from "@/lib/groups";

export function useGroupReminderSettingsQuery(groupId?: string) {
  return useQuery({
    queryKey: ["group-reminder-settings", groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) return null;
      return getGroupReminderSettings(groupId);
    },
  });
}
