import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelAccountDeletion } from "@/lib/security";

export function useCancelAccountDeletionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { password: string; code?: string }) =>
      cancelAccountDeletion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "account-deletion-status"] });
    },
  });
}
