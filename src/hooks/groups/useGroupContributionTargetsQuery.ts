import { useQuery } from "@tanstack/react-query";
import { getGroupContributionTargets } from "@/lib/groups";

export function useGroupContributionTargetsQuery(groupId?: string) {
  return useQuery({
    queryKey: ["group-contribution-targets", groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) return null;
      return getGroupContributionTargets(groupId);
    },
  });
}
