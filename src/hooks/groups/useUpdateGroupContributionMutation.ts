import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateGroupContribution } from "@/lib/groups";

export function useUpdateGroupContributionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      groupId: string;
      contributionId: string;
      updates: Parameters<typeof updateGroupContribution>[2];
    }) => updateGroupContribution(input.groupId, input.contributionId, input.updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-contributions", variables.groupId] });
    },
  });
}

