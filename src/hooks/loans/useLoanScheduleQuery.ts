import { useQuery } from "@tanstack/react-query";
import { listLoanSchedule } from "@/lib/loans";

export function useLoanScheduleQuery(applicationId: string | null | undefined) {
  return useQuery({
    queryKey: ["loans", applicationId, "schedule"],
    enabled: !!applicationId,
    queryFn: async () => listLoanSchedule(String(applicationId)),
  });
}

