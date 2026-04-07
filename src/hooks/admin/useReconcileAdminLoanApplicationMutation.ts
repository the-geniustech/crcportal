import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reconcileAdminLoanApplication } from "@/lib/adminLoans";

export function useReconcileAdminLoanApplicationMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { applicationId: string; notes?: string }) =>
      reconcileAdminLoanApplication(input.applicationId, {
        notes: input.notes,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
