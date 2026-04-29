import { useQuery } from "@tanstack/react-query";
import { listContributionTracker } from "@/lib/admin";

export function useContributionTrackerQuery(
  params: {
    month?: number;
    year?: number;
    groupId?: string;
    contributionType?: string;
    sort?: string;
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "admin",
      "contributions",
      "tracker",
      params.year ?? "cur",
      params.month ?? "cur",
      params.groupId ?? "all",
      params.contributionType ?? "revolving",
      params.sort ?? "member_name_asc",
    ],
    enabled,
    queryFn: async () => listContributionTracker(params),
  });
}
