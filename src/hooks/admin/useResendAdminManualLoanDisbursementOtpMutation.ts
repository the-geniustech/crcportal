import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resendAdminManualLoanDisbursementOtp } from "@/lib/adminLoans";

export function useResendAdminManualLoanDisbursementOtpMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { applicationId: string }) =>
      resendAdminManualLoanDisbursementOtp(vars.applicationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
