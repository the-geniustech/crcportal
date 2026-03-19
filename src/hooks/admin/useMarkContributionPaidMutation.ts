import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markContributionPaid } from "@/lib/admin";

export function useMarkContributionPaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { userId: string; groupId: string; month: number; year: number; amount: number; notes?: string }) =>
      markContributionPaid(vars),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "contributions", "tracker"] });
    },
  });
}

