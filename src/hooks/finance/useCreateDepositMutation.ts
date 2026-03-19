import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeposit } from "@/lib/finance";

export function useCreateDepositMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amount: number; reference?: string; channel?: string | null; description?: string | null; gateway?: string | null; metadata?: unknown }) =>
      createDeposit(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
    },
  });
}

