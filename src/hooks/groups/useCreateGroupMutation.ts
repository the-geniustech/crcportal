import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGroup, type BackendGroup } from "@/lib/groups";

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<BackendGroup>) => createGroup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });
}
