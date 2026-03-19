import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyPaystackPayment } from "@/lib/payments";

export function useVerifyPaystackPaymentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (reference: string) => verifyPaystackPayment(reference),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
      await qc.invalidateQueries({ queryKey: ["loans", "applications", "me"] });
      await qc.invalidateQueries({ queryKey: ["my-groups"] });
      await qc.invalidateQueries({ queryKey: ["recurring-payments", "me"] });
    },
  });
}

