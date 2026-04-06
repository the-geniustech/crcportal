import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLoanDraft,
  updateLoanDraft,
  type LoanDraftInput,
} from "@/lib/loans";

export function useSaveLoanDraftMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: LoanDraftInput & { draftId?: string | null }) => {
      if (input.draftId) {
        return updateLoanDraft(input.draftId, input);
      }
      return createLoanDraft(input);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
    },
  });
}
