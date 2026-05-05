import { useQuery } from "@tanstack/react-query";
import {
  listAdminFormPayments,
  type AdminFormPaymentListParams,
  type AdminFormPaymentListResponse,
} from "@/lib/adminFormPayments";

export function useAdminFormPaymentsQuery(
  params: AdminFormPaymentListParams = {},
  enabled = true,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  return useQuery<AdminFormPaymentListResponse>({
    queryKey: [
      "admin",
      "form-payments",
      params.search ?? "",
      params.formType ?? "all",
      params.paymentStatus ?? "all",
      params.groupId ?? "all",
      params.from ?? "",
      params.to ?? "",
      params.sort ?? "submitted_desc",
      page,
      limit,
    ],
    enabled,
    queryFn: () =>
      listAdminFormPayments({
        ...params,
        page,
        limit,
      }),
  });
}
