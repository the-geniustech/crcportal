import { useQuery } from "@tanstack/react-query";
import { getAdminContributionTracking } from "@/lib/admin";

export function useAdminContributionTrackingQuery(params: {
  year: number;
  contributionType: "regular" | "festival" | "end_well" | "special_savings";
}) {
  return useQuery({
    queryKey: ["admin", "contributions", "tracking", params.year, params.contributionType],
    queryFn: async () => getAdminContributionTracking(params),
  });
}

