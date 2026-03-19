import { useQuery } from "@tanstack/react-query";
import { listWithdrawals } from "@/lib/finance";

export function useWithdrawalsAdminQuery(params: { status?: string; userId?: string } = {}) {
  return useQuery({
    queryKey: ["withdrawals", "admin", params],
    queryFn: async () => listWithdrawals(params),
  });
}

