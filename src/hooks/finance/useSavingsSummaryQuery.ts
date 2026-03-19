import { useQuery } from "@tanstack/react-query";
import { getMySavingsSummary } from "@/lib/finance";

export function useSavingsSummaryQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["savings", "me", "summary"],
    queryFn: async () => getMySavingsSummary(),
    ...options,
  });
}
