import { useQuery } from "@tanstack/react-query";
import { getAdminContributionIncomeSummary } from "@/lib/admin";
import type { ContributionTypeCanonical } from "@/lib/contributionPolicy";

export function useAdminContributionIncomeSummaryQuery(params: {
  year?: number;
  contributionType?: ContributionTypeCanonical;
} = {}) {
  return useQuery({
    queryKey: ["admin", "summary-income", params.year ?? "", params.contributionType ?? ""],
    queryFn: async () => getAdminContributionIncomeSummary(params),
  });
}
