import { useMutation } from "@tanstack/react-query";
import { emailMyTransactionReceipt } from "@/lib/finance";

export function useEmailTransactionReceiptMutation() {
  return useMutation({
    mutationFn: async (input: { transactionId: string; emails: string[] | string }) =>
      emailMyTransactionReceipt(input.transactionId, input.emails),
  });
}
