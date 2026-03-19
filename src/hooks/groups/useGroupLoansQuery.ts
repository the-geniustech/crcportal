import { useQuery } from "@tanstack/react-query";
import { listGroupLoans } from "@/lib/groups";

export function useGroupLoansQuery(
  groupId?: string,
  params: { status?: string } = {},
) {
  return useQuery({
    queryKey: ["group-loans", groupId, params.status ?? "all"],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      return listGroupLoans(groupId, params);
    },
  });
}
