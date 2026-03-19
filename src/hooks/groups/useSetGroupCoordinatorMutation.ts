import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setGroupCoordinator } from "@/lib/groups";

export function useSetGroupCoordinatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      groupId: string;
      coordinatorProfileId?: string;
      removeCoordinator?: boolean;
    }) => {
      const { groupId, ...payload } = input;
      return setGroupCoordinator(groupId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });
}
