import { useQuery } from "@tanstack/react-query";
import { getAdminSpecialContributionSummary } from "@/lib/admin";

export function useAdminSpecialContributionSummaryQuery(params: { year: number }) {
  return useQuery({
    queryKey: ["admin", "contributions", "special-summary", params.year],
    queryFn: async () => getAdminSpecialContributionSummary(params),
  });
}

