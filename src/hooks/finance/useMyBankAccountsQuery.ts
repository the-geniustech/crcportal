import { useQuery } from "@tanstack/react-query";
import { listMyBankAccounts } from "@/lib/finance";

export function useMyBankAccountsQuery() {
  return useQuery({
    queryKey: ["bank-accounts", "me"],
    queryFn: async () => listMyBankAccounts(),
  });
}

