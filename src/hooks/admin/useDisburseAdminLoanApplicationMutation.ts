import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disburseAdminLoanApplication } from "@/lib/adminLoans";

export function useDisburseAdminLoanApplicationMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { applicationId: string; repaymentStartDate?: string | null }) =>
      disburseAdminLoanApplication(vars.applicationId, { repaymentStartDate: vars.repaymentStartDate ?? null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
