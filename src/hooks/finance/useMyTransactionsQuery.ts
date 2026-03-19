import { useQuery } from "@tanstack/react-query";
import { listMyTransactions } from "@/lib/finance";

export function useMyTransactionsQuery(params: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
} = {}) {
  return useQuery({
    queryKey: ["transactions", "me", params],
    queryFn: async () => listMyTransactions(params),
  });
}

