import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewAdminLoanEditRequest } from "@/lib/adminLoans";

export function useReviewAdminLoanEditRequestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      requestId: string;
      status: "approved" | "rejected";
      reviewNotes?: string;
    }) =>
      reviewAdminLoanEditRequest(input.applicationId, input.requestId, {
        status: input.status,
        reviewNotes: input.reviewNotes,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "loans", "applications"] });
    },
  });
}
