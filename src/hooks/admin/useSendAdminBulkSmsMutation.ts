import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendAdminBulkSms, type AdminBulkSmsPayload } from "@/lib/admin";

export function useSendAdminBulkSmsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdminBulkSmsPayload) => sendAdminBulkSms(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "sms", "stats"] });
    },
  });
}

