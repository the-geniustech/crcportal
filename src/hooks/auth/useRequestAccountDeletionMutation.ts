import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestAccountDeletion } from "@/lib/security";

export function useRequestAccountDeletionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { password: string; code?: string }) =>
      requestAccountDeletion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "account-deletion-status"] });
    },
  });
}
