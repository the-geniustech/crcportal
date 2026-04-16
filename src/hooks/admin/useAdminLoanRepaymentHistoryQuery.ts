import { useQuery } from "@tanstack/react-query";
import { listAdminLoanRepaymentHistory } from "@/lib/adminLoans";

export function useAdminLoanRepaymentHistoryQuery(
  applicationId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "loans", "repayments", applicationId ?? ""],
    enabled: enabled && Boolean(applicationId),
    queryFn: async () => listAdminLoanRepaymentHistory(String(applicationId)),
  });
}
