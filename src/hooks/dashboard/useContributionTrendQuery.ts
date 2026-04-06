import { useQuery } from "@tanstack/react-query";
import { getContributionTrend } from "@/lib/dashboard";

export function useContributionTrendQuery(params: { months?: number } = {}) {
  return useQuery({
    queryKey: ["dashboard", "contribution-trend", params.months ?? 6],
    queryFn: async () => getContributionTrend(params),
  });
}
