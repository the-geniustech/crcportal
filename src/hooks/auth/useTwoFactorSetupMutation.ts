import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setupTwoFactor } from "@/lib/security";

export function useTwoFactorSetupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => setupTwoFactor(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "two-factor-status"] });
    },
  });
}
