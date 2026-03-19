import { useQuery } from "@tanstack/react-query";
import { listGroupVotes } from "@/lib/groups";

export function useGroupVotesQuery(
  groupId?: string,
  params: { status?: "active" | "closed" } = {},
) {
  return useQuery({
    queryKey: ["group-votes", groupId, params.status ?? "all"],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      return listGroupVotes(groupId, params);
    },
  });
}
