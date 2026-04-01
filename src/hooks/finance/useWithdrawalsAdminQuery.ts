import { useQuery } from "@tanstack/react-query";
import { listWithdrawals } from "@/lib/finance";

export function useWithdrawalsAdminQuery(
  params: { status?: string; userId?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["withdrawals", "admin", params],
    enabled,
    queryFn: async () => listWithdrawals(params),
  });
}
