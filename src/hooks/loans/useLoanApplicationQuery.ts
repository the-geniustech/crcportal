import { useQuery } from "@tanstack/react-query";
import { getLoanApplication } from "@/lib/loans";

export function useLoanApplicationQuery(applicationId: string | null | undefined) {
  return useQuery({
    queryKey: ["loans", "applications", applicationId],
    enabled: !!applicationId,
    queryFn: async () => getLoanApplication(String(applicationId)),
  });
}

