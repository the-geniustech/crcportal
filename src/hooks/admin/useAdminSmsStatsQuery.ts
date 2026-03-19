import { useQuery } from "@tanstack/react-query";
import { getAdminSmsStats } from "@/lib/admin";

export function useAdminSmsStatsQuery() {
  return useQuery({
    queryKey: ["admin", "sms", "stats"],
    queryFn: async () => getAdminSmsStats(),
    refetchInterval: 30_000,
  });
}

