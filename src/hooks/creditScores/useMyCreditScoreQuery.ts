import { useQuery } from "@tanstack/react-query";
import { getMyCreditScore } from "@/lib/creditScores";

export function useMyCreditScoreQuery(params: { historyMonths?: number } = {}) {
  return useQuery({
    queryKey: ["credit-scores", "me", params.historyMonths ?? 6],
    queryFn: async () => getMyCreditScore(params),
  });
}

