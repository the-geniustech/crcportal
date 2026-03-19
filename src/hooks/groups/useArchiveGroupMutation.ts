import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveGroup } from "@/lib/groups";

export function useArchiveGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => archiveGroup(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
