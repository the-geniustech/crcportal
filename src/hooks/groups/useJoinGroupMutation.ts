import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinGroup } from "@/lib/groups";

export function useJoinGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

