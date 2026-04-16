import { useMutation, useQueryClient } from "@tanstack/react-query";
import { finalizeAdminManualLoanDisbursement } from "@/lib/adminLoans";

export function useFinalizeAdminManualLoanDisbursementMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      applicationId: string;
      otp: string;
      repaymentStartDate?: string | null;
    }) =>
      finalizeAdminManualLoanDisbursement(vars.applicationId, {
        otp: vars.otp,
        repaymentStartDate: vars.repaymentStartDate ?? null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
