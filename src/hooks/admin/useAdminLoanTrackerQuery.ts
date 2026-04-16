import { useQuery } from "@tanstack/react-query";
import { listAdminLoanTracker } from "@/lib/adminLoans";

export function useAdminLoanTrackerQuery(
  params: {
    status?: "all" | "active" | "overdue" | "completed";
    search?: string;
    groupId?: string;
    loanType?: string;
    year?: number | string;
    month?: number | string;
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "admin",
      "loans",
      "tracker",
      params.status ?? "active",
      params.search ?? "",
      params.groupId ?? "",
      params.loanType ?? "",
      params.year ?? "",
      params.month ?? "",
    ],
    enabled,
    queryFn: async () => listAdminLoanTracker(params),
  });
}
