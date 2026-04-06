import { useQuery } from "@tanstack/react-query";
import { getMyWithdrawalBalance } from "@/lib/finance";

export function useWithdrawalBalanceQuery(params: {
  groupId?: string | null;
  contributionType?: string | null;
  enabled?: boolean;
} = {}) {
  const { enabled = true, ...queryParams } = params;
  return useQuery({
    queryKey: ["withdrawals", "balance", queryParams],
    queryFn: async () => getMyWithdrawalBalance(queryParams),
    enabled,
  });
}
