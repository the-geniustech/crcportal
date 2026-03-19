import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyMyDeposit } from "@/lib/finance";

export function useVerifyDepositMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => verifyMyDeposit(reference),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
    },
  });
}

