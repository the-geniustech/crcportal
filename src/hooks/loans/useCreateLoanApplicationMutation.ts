import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLoanApplication, type CreateLoanApplicationInput } from "@/lib/loans";

export function useCreateLoanApplicationMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLoanApplicationInput) => createLoanApplication(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
      await qc.invalidateQueries({ queryKey: ["loans", "guarantor", "requests"] });
      await qc.invalidateQueries({ queryKey: ["loans", "guarantor", "notifications"] });
    },
  });
}

