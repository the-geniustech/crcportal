import { useQuery } from "@tanstack/react-query";
import { listAdminLoanBankAccounts } from "@/lib/adminLoans";

export function useAdminLoanBankAccountsQuery(
  applicationId?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "loans", "bank-accounts", applicationId ?? "none"],
    enabled: enabled && Boolean(applicationId),
    queryFn: async () => listAdminLoanBankAccounts(String(applicationId)),
  });
}
