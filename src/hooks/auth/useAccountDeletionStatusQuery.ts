import { useQuery } from "@tanstack/react-query";
import { getAccountDeletionStatus } from "@/lib/security";

export function useAccountDeletionStatusQuery() {
  return useQuery({
    queryKey: ["auth", "account-deletion-status"],
    queryFn: async () => getAccountDeletionStatus(),
  });
}
