import { useQuery } from "@tanstack/react-query";
import { getAdminFinancialReports } from "@/lib/admin";

export function useAdminFinancialReportsQuery(params: {
  period?: "3months" | "6months" | "12months";
  year?: number;
  month?: number;
} = {}) {
  return useQuery({
    queryKey: ["admin", "financial-reports", params.period ?? "6months", params.year ?? "", params.month ?? ""],
    queryFn: async () => getAdminFinancialReports(params),
  });
}

