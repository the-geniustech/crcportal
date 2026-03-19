import { useQuery } from "@tanstack/react-query";
import { listGuarantorCommitments } from "@/lib/loans";

export function useGuarantorCommitmentsQuery() {
  return useQuery({
    queryKey: ["loans", "guarantor", "commitments"],
    queryFn: async () => listGuarantorCommitments(),
  });
}

