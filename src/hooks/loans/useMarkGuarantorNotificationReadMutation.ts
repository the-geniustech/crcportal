import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markGuarantorNotificationRead } from "@/lib/loans";

export function useMarkGuarantorNotificationReadMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => markGuarantorNotificationRead(notificationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loans", "guarantor", "notifications"] });
    },
  });
}

