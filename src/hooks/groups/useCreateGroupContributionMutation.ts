import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGroupContribution } from "@/lib/groups";

export function useCreateGroupContributionMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      groupId: string;
      payload: Parameters<typeof createGroupContribution>[1];
    }) => createGroupContribution(input.groupId, input.payload),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["group-contributions", variables.groupId] });
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
    },
  });
}

