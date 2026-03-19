import { useMutation, useQueryClient } from "@tanstack/react-query";
import { respondToGuarantorRequest } from "@/lib/loans";

export function useRespondToGuarantorRequestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { guarantorId: string; status: "accepted" | "rejected"; responseComment?: string }) =>
      respondToGuarantorRequest(input.guarantorId, {
        status: input.status,
        responseComment: input.responseComment,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loans", "guarantor", "requests"] });
      await qc.invalidateQueries({ queryKey: ["loans", "guarantor", "commitments"] });
      await qc.invalidateQueries({ queryKey: ["loans", "guarantor", "notifications"] });
    },
  });
}

