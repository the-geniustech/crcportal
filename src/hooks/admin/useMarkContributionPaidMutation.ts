import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markContributionPaid } from "@/lib/admin";

export function useMarkContributionPaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markContributionPaid,
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "contributions", "tracker"],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      await queryClient.invalidateQueries({
        queryKey: ["group-contributions", variables.groupId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "financial-reports"],
      });
      await queryClient.invalidateQueries({ queryKey: ["transactions", "me"] });
    },
  });
}
