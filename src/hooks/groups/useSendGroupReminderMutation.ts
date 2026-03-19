import { useMutation } from "@tanstack/react-query";
import { sendGroupContributionReminders } from "@/lib/groups";

export function useSendGroupReminderMutation() {
  return useMutation({
    mutationFn: async ({
      groupId,
      payload,
    }: {
      groupId: string;
      payload?: { year?: number; month?: number };
    }) => sendGroupContributionReminders(groupId, payload),
  });
}
