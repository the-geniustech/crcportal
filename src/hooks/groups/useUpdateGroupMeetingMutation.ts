import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMeeting, type BackendMeeting } from "@/lib/groups";

export function useUpdateGroupMeetingMutation(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { meetingId: string; updates: Partial<BackendMeeting> }) => {
      if (!groupId) throw new Error("Missing groupId");
      return updateMeeting(groupId, payload.meetingId, payload.updates);
    },
    onSuccess: () => {
      if (!groupId) return;
      void queryClient.invalidateQueries({ queryKey: ["group-meetings", groupId] });
    },
  });
}
