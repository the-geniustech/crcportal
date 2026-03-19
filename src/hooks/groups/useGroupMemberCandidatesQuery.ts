import { useQuery } from "@tanstack/react-query";
import { listGroupMemberCandidates } from "@/lib/groups";

export function useGroupMemberCandidatesQuery(
  groupId?: string,
  search?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["group-member-candidates", groupId, search ?? ""],
    enabled: Boolean(groupId) && enabled,
    queryFn: async () => {
      if (!groupId) return [];
      return listGroupMemberCandidates(groupId, { search });
    },
  });
}
