import { useQuery } from "@tanstack/react-query";
import { listGuarantorNotifications } from "@/lib/loans";

export function useGuarantorNotificationsQuery() {
  return useQuery({
    queryKey: ["loans", "guarantor", "notifications"],
    queryFn: async () => listGuarantorNotifications(),
  });
}

