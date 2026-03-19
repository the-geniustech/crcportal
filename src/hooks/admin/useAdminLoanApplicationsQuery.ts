import { useQuery } from "@tanstack/react-query";
import { listAdminLoanApplications } from "@/lib/adminLoans";

export function useAdminLoanApplicationsQuery(params: {
  status?: string;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ["admin", "loans", "applications", params.status ?? "all", params.search ?? ""],
    queryFn: async () => listAdminLoanApplications(params),
  });
}

