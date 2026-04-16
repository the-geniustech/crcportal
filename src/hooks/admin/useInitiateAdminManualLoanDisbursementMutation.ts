import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initiateAdminManualLoanDisbursement } from "@/lib/adminLoans";

export function useInitiateAdminManualLoanDisbursementMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      applicationId: string;
      method:
        | "cash"
        | "bank_transfer"
        | "bank_settlement"
        | "cheque"
        | "pos"
        | "other";
      occurredAt?: string | null;
      externalReference?: string | null;
      notes?: string | null;
      repaymentStartDate?: string | null;
      bankAccountId?: string | null;
    }) =>
      initiateAdminManualLoanDisbursement(vars.applicationId, {
        method: vars.method,
        occurredAt: vars.occurredAt ?? null,
        externalReference: vars.externalReference ?? null,
        notes: vars.notes ?? null,
        repaymentStartDate: vars.repaymentStartDate ?? null,
        bankAccountId: vars.bankAccountId ?? null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
