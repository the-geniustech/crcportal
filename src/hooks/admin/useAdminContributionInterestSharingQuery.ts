import { useQuery } from "@tanstack/react-query";
import { getAdminContributionInterestSharing } from "@/lib/admin";
import type { ContributionTypeCanonical } from "@/lib/contributionPolicy";

export function useAdminContributionInterestSharingQuery(params: {
  year?: number;
  contributionType?: ContributionTypeCanonical;
} = {}) {
  return useQuery({
    queryKey: ["admin", "interest-sharing", params.year ?? "", params.contributionType ?? ""],
    queryFn: async () => getAdminContributionInterestSharing(params),
  });
}
