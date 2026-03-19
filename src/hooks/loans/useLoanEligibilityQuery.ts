import { useQuery } from "@tanstack/react-query";
import { getLoanEligibility } from "@/lib/loans";

export function useLoanEligibilityQuery() {
  return useQuery({
    queryKey: ["loans", "eligibility"],
    queryFn: async () => getLoanEligibility(),
  });
}

