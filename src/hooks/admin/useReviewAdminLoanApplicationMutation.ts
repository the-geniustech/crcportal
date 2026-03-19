import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewAdminLoanApplication } from "@/lib/adminLoans";

export function useReviewAdminLoanApplicationMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      applicationId: string;
      status: "under_review" | "approved" | "rejected";
      reviewNotes?: string;
    }) => reviewAdminLoanApplication(vars.applicationId, { status: vars.status, reviewNotes: vars.reviewNotes }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}

