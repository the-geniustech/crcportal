import { useQuery } from "@tanstack/react-query";
import { getLoginHistory } from "@/lib/security";

export function useLoginHistoryQuery(
  params: { page?: number; limit?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ["auth", "login-history", params],
    queryFn: async () => getLoginHistory(params),
    enabled,
  });
}
