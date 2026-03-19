import { useQuery } from "@tanstack/react-query";
import { listMyLoanApplications } from "@/lib/loans";

export function useMyLoanApplicationsQuery(
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["loans", "applications", "me"],
    queryFn: async () => listMyLoanApplications(),
    ...options,
  });
}
