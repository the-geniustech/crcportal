import { useMutation, useQueryClient } from "@tanstack/react-query";

import { markNotificationRead } from "@/lib/notifications";

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
