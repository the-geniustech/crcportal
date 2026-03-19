import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveGroup } from "@/lib/groups";

export function useLeaveGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

