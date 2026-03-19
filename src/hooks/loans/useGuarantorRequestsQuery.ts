import { useQuery } from "@tanstack/react-query";
import { listGuarantorRequests } from "@/lib/loans";

export function useGuarantorRequestsQuery() {
  return useQuery({
    queryKey: ["loans", "guarantor", "requests"],
    queryFn: async () => listGuarantorRequests(),
  });
}

