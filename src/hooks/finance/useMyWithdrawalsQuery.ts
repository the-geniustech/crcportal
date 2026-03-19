import { useQuery } from "@tanstack/react-query";
import { listMyWithdrawals } from "@/lib/finance";

export function useMyWithdrawalsQuery() {
  return useQuery({
    queryKey: ["withdrawals", "me"],
    queryFn: async () => listMyWithdrawals(),
  });
}

