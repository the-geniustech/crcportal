import { useQuery } from "@tanstack/react-query";
import { getAdminMemberDetails } from "@/lib/adminMembers";

export function useAdminMemberDetailsQuery(
  membershipId?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "members", "detail", membershipId ?? "none"],
    enabled: enabled && Boolean(membershipId),
    queryFn: async () => getAdminMemberDetails(String(membershipId)),
  });
}
