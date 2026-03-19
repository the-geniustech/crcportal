import { useQuery } from "@tanstack/react-query";
import { listContributionTracker } from "@/lib/admin";

export function useContributionTrackerQuery(params: { month?: number; year?: number; groupId?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "contributions", "tracker", params.year ?? "cur", params.month ?? "cur", params.groupId ?? "all"],
    queryFn: async () => listContributionTracker(params),
  });
}

