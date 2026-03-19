import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWithdrawalRequest } from "@/lib/finance";

export function useCreateWithdrawalMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { amount: number; bankAccountId: string; reason?: string | null }) =>
      createWithdrawalRequest(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
    },
  });
}

