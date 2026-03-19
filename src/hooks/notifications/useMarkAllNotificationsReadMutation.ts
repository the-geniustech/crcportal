import { useMutation, useQueryClient } from "@tanstack/react-query";

import { markAllNotificationsRead } from "@/lib/notifications";

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => markAllNotificationsRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
