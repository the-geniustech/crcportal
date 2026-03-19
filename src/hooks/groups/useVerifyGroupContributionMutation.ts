import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyGroupContribution } from "@/lib/groups";

export function useVerifyGroupContributionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { groupId: string; contributionId: string }) =>
      verifyGroupContribution(input.groupId, input.contributionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-contributions", variables.groupId] });
    },
  });
}

