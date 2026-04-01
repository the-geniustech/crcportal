import { useQuery } from "@tanstack/react-query";
import { listAdminLoanApplications } from "@/lib/adminLoans";

export function useAdminLoanApplicationsQuery(
  params: {
    status?: string;
    search?: string;
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "admin",
      "loans",
      "applications",
      params.status ?? "all",
      params.search ?? "",
    ],
    enabled,
    queryFn: async () => listAdminLoanApplications(params),
  });
}
