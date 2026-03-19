import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordLoanRepayment } from "@/lib/loans";

export function useRecordLoanRepaymentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      amount: number;
      reference: string;
      channel?: string | null;
    }) => recordLoanRepayment(input.applicationId, input),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
      await qc.invalidateQueries({ queryKey: ["loans", variables.applicationId, "schedule"] });
    },
  });
}
