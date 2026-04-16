import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordAdminLoanManualRepayment } from "@/lib/adminLoans";

export function useRecordAdminLoanManualRepaymentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      amount: number;
      paymentMethod: string;
      paymentReference?: string | null;
      receivedAt?: string | null;
      notes?: string | null;
    }) => recordAdminLoanManualRepayment(input.applicationId, input),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "tracker"] });
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
      await qc.invalidateQueries({
        queryKey: ["admin", "loans", "repayments", variables.applicationId],
      });
      await qc.invalidateQueries({ queryKey: ["loans", variables.applicationId, "schedule"] });
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
    },
  });
}
