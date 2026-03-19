import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateGroupReminderSettings } from "@/lib/groups";

export function useUpdateGroupReminderSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      updates,
    }: {
      groupId: string;
      updates: {
        autoReminders?: boolean;
        daysBeforeDue?: number;
        overdueReminders?: boolean;
        meetingReminders?: boolean;
      };
    }) => updateGroupReminderSettings(groupId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["group-reminder-settings", variables.groupId],
      });
    },
  });
}
