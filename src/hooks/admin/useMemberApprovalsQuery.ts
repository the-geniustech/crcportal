import { useQuery } from "@tanstack/react-query";
import { listMemberApprovals } from "@/lib/admin";

export function useMemberApprovalsQuery(
  params: { status?: string; groupId?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "admin",
      "member-approvals",
      params.status ?? "pending",
      params.groupId ?? "all",
    ],
    enabled,
    queryFn: async () => listMemberApprovals(params),
  });
}
