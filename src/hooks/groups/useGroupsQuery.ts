import { useQuery } from "@tanstack/react-query";
import { listGroups, type ListGroupsParams } from "@/lib/groups";

export function useGroupsQuery(
  params: ListGroupsParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["groups", params],
    queryFn: async () => {
      const res = await listGroups(params);
      return res;
    },
    enabled,
  });
}
