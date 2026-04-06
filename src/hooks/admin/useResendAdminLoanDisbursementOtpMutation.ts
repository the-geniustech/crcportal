import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resendAdminLoanDisbursementOtp } from "@/lib/adminLoans";

export function useResendAdminLoanDisbursementOtpMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { applicationId: string; transferCode: string }) =>
      resendAdminLoanDisbursementOtp(vars.applicationId, {
        transferCode: vars.transferCode,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
