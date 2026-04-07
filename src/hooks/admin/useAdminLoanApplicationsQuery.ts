import { useQuery } from "@tanstack/react-query";
import { AdminLoanListResponse, listAdminLoanApplications } from "@/lib/adminLoans";

export function useAdminLoanApplicationsQuery(
  params: {
    status?: string;
    search?: string;
    groupId?: string;
    year?: number | string;
    month?: number | string;
    page?: number;
    limit?: number;
  } = {},
  enabled = true,
) {
  return useQuery<AdminLoanListResponse>({
    queryKey: [
      "admin",
      "loans",
      "applications",
      params.status ?? "all",
      params.search ?? "",
      params.groupId ?? "",
      params.year ?? "",
      params.month ?? "",
      params.page ?? 1,
      params.limit ?? 50,
    ],
    enabled,
    queryFn: async () => listAdminLoanApplications(params),
  });
}
