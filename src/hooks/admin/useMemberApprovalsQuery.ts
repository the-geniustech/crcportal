import { useQuery } from "@tanstack/react-query";
import { listMemberApprovals } from "@/lib/admin";

export function useMemberApprovalsQuery(params: { status?: string; groupId?: string } = {}) {
  return useQuery({
    queryKey: ["admin", "member-approvals", params.status ?? "pending", params.groupId ?? "all"],
    queryFn: async () => listMemberApprovals(params),
  });
}

