import { useQuery } from "@tanstack/react-query";
import { listGroupContributions } from "@/lib/groups";

export function useGroupContributionsQuery(groupId?: string, year?: number) {
  return useQuery({
    queryKey: ["group-contributions", groupId, year],
    enabled: Boolean(groupId && year),
    queryFn: async () => {
      if (!groupId || !year) return [];
      return listGroupContributions(groupId, { year });
    },
  });
}

