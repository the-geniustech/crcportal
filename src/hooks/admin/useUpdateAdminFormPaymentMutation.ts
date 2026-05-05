import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateAdminFormPayment,
  type AdminFormPaymentUpdatePayload,
} from "@/lib/adminFormPayments";

export function useUpdateAdminFormPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      paymentId: string;
      payload: AdminFormPaymentUpdatePayload;
    }) => updateAdminFormPayment(input.paymentId, input.payload),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "form-payments"],
      });
      void queryClient.setQueryData(
        ["admin", "form-payments", "detail", payment.id],
        payment,
      );
    },
  });
}
