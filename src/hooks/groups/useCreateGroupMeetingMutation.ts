import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMeeting, type BackendMeeting } from "@/lib/groups";

export function useCreateGroupMeetingMutation(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<BackendMeeting>) => {
      if (!groupId) throw new Error("Missing groupId");
      return createMeeting(groupId, payload);
    },
    onSuccess: () => {
      if (!groupId) return;
      void queryClient.invalidateQueries({ queryKey: ["group-meetings", groupId] });
    },
  });
}
