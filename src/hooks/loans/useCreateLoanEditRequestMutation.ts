import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLoanEditRequest } from "@/lib/loans";

export function useCreateLoanEditRequestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      payload: {
        loanAmount?: number;
        loanPurpose?: string;
        purposeDescription?: string;
        repaymentPeriod?: number;
        documents?: Array<{
          name: string;
          type: string;
          size: number;
          status: string;
          url?: string;
        }>;
      };
    }) => createLoanEditRequest(input.applicationId, input.payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
      await qc.invalidateQueries({ queryKey: ["loans", "applications"] });
    },
  });
}
