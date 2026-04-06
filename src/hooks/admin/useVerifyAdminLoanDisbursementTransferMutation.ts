import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyAdminLoanDisbursementTransfer } from "@/lib/adminLoans";

export function useVerifyAdminLoanDisbursementTransferMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      applicationId: string;
      repaymentStartDate?: string | null;
    }) =>
      verifyAdminLoanDisbursementTransfer(vars.applicationId, {
        repaymentStartDate: vars.repaymentStartDate ?? null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
