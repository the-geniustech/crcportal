import { useQuery } from "@tanstack/react-query";
import { listGroupMembers } from "@/lib/groups";

export function useGroupMembersQuery(
  groupId?: string,
  params: { search?: string; status?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["group-members", groupId, params.search ?? "", params.status ?? ""],
    enabled: Boolean(groupId) && enabled,
    queryFn: async () => {
      if (!groupId) return [];
      return listGroupMembers(groupId, params);
    },
  });
}
