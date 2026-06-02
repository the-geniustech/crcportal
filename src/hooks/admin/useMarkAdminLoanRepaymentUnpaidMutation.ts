import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAdminLoanRepaymentUnpaid } from "@/lib/adminLoans";

export function useMarkAdminLoanRepaymentUnpaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { applicationId: string; reason?: string | null }) =>
      markAdminLoanRepaymentUnpaid(input.applicationId, {
        reason: input.reason ?? null,
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "loans", "tracker"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "loans", "applications"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "loans", "repayments", variables.applicationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["loans", variables.applicationId, "schedule"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["loans", "applications", "me"],
      });
      await queryClient.invalidateQueries({ queryKey: ["transactions", "me"] });
    },
  });
}
