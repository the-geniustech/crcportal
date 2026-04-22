import { useQuery } from "@tanstack/react-query";
import { BackendWithdrawalListResponse, listWithdrawals } from "@/lib/finance";

export function useWithdrawalsAdminQuery(
  params: { status?: string; userId?: string; groupId?: string } = {},
  enabled = true,
) {
  return useQuery<BackendWithdrawalListResponse>({
    queryKey: ["withdrawals", "admin", params],
    enabled,
    queryFn: async () => listWithdrawals(params),
  });
}
