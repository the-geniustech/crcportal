import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelAdminManualLoanDisbursement } from "@/lib/adminLoans";

export function useCancelAdminManualLoanDisbursementMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { applicationId: string }) =>
      cancelAdminManualLoanDisbursement(vars.applicationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
