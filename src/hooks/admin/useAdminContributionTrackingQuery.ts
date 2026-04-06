import { useQuery } from "@tanstack/react-query";
import { getAdminContributionTracking } from "@/lib/admin";
import type { ContributionTypeCanonical } from "@/lib/contributionPolicy";

export function useAdminContributionTrackingQuery(params: {
  year: number;
  month?: number;
  contributionType: ContributionTypeCanonical;
}) {
  return useQuery({
    queryKey: [
      "admin",
      "contributions",
      "tracking",
      params.year,
      params.month ?? "all",
      params.contributionType,
    ],
    queryFn: async () => getAdminContributionTracking(params),
  });
}
