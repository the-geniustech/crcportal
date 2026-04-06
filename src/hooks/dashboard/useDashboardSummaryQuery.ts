import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/lib/dashboard";

export function useDashboardSummaryQuery(
  params: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    enabled: params.enabled ?? true,
  });
}
