import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateGroup, type BackendGroup } from "@/lib/groups";

export function useUpdateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      groupId: string;
      updates: Partial<BackendGroup>;
    }) => updateGroup(input.groupId, input.updates),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      void queryClient.invalidateQueries({
        queryKey: ["groups", variables.groupId],
      });
    },
  });
}
