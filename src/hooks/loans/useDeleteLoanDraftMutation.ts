import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLoanDraft } from "@/lib/loans";

export function useDeleteLoanDraftMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => deleteLoanDraft(applicationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
    },
  });
}
