import { useQuery } from "@tanstack/react-query";
import {
  getAdminFormPaymentDetails,
  type AdminFormPayment,
} from "@/lib/adminFormPayments";

export function useAdminFormPaymentDetailsQuery(
  paymentId: string | null,
  enabled = true,
) {
  return useQuery<AdminFormPayment>({
    queryKey: ["admin", "form-payments", "detail", paymentId ?? ""],
    enabled: Boolean(paymentId) && enabled,
    queryFn: () => getAdminFormPaymentDetails(paymentId as string),
  });
}
