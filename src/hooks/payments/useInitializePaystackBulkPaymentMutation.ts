import { useMutation } from "@tanstack/react-query";
import { initializePaystackBulkPayment } from "@/lib/payments";

export function useInitializePaystackBulkPaymentMutation() {
  return useMutation({
    mutationFn: async (
      input: Parameters<typeof initializePaystackBulkPayment>[0],
    ) => initializePaystackBulkPayment(input),
  });
}
