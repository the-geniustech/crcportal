import { useQuery } from "@tanstack/react-query";
import { listGroupContributions } from "@/lib/groups";

export function useGroupContributionsQuery(groupId?: string, year?: number) {
  return useQuery({
    queryKey: ["group-contributions", groupId, year],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      const params = Number.isFinite(Number(year)) ? { year } : {};
      return listGroupContributions(groupId, params);
    },
  });
}
