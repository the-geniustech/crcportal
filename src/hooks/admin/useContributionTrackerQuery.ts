import { useQuery } from "@tanstack/react-query";
import { listContributionTracker } from "@/lib/admin";

export function useContributionTrackerQuery(
  params: { month?: number; year?: number; groupId?: string } = {},
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
    ],
    enabled,
    queryFn: async () => listContributionTracker(params),
  });
}
