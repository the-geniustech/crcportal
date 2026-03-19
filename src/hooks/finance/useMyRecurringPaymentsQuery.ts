import { useQuery } from "@tanstack/react-query";
import { listMyRecurringPayments } from "@/lib/finance";

export function useMyRecurringPaymentsQuery() {
  return useQuery({
    queryKey: ["recurring-payments", "me"],
    queryFn: async () => listMyRecurringPayments(),
  });
}

