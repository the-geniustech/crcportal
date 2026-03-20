import { useQuery } from "@tanstack/react-query";
import { getTwoFactorStatus } from "@/lib/security";

export function useTwoFactorStatusQuery() {
  return useQuery({
    queryKey: ["auth", "two-factor-status"],
    queryFn: async () => getTwoFactorStatus(),
  });
}
