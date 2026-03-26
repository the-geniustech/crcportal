import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/lib/dashboard";

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });
}
