import { useQuery } from "@tanstack/react-query";
import { listMyPaymentReminders } from "@/lib/finance";

export function usePaymentRemindersQuery(params: { windowDays?: number } = {}) {
  return useQuery({
    queryKey: ["payments", "reminders", params],
    queryFn: async () => listMyPaymentReminders(params),
  });
}
