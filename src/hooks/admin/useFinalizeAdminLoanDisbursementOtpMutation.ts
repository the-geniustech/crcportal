import { useMutation, useQueryClient } from "@tanstack/react-query";
import { finalizeAdminLoanDisbursementOtp } from "@/lib/adminLoans";

export function useFinalizeAdminLoanDisbursementOtpMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      applicationId: string;
      transferCode: string;
      otp: string;
      repaymentStartDate?: string | null;
    }) =>
      finalizeAdminLoanDisbursementOtp(vars.applicationId, {
        transferCode: vars.transferCode,
        otp: vars.otp,
        repaymentStartDate: vars.repaymentStartDate ?? null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
