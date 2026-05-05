import { useQuery } from "@tanstack/react-query";
import { listGroupFormPayments } from "@/lib/groups";
import type { AdminFormPaymentListParams } from "@/lib/adminFormPayments";

export function useGroupFormPaymentsQuery(
  groupId?: string,
  params: AdminFormPaymentListParams = {},
  enabled = true,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;

  return useQuery({
    queryKey: [
      "group-form-payments",
      groupId ?? "",
      params.search ?? "",
      params.formType ?? "all",
      params.paymentStatus ?? "all",
      params.from ?? "",
      params.to ?? "",
      params.sort ?? "submitted_desc",
      page,
      limit,
    ],
    enabled: Boolean(groupId) && enabled,
    queryFn: async () => {
      if (!groupId) throw new Error("groupId is required");
      return listGroupFormPayments(groupId, { ...params, page, limit });
    },
  });
}
