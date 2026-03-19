import { useMutation } from "@tanstack/react-query";
import { initializePaystackPayment } from "@/lib/payments";

export function useInitializePaystackPaymentMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof initializePaystackPayment>[0]) =>
      initializePaystackPayment(input),
  });
}

