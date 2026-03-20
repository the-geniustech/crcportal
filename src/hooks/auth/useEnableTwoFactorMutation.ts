import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enableTwoFactor } from "@/lib/security";

export function useEnableTwoFactorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => enableTwoFactor(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "two-factor-status"] });
    },
  });
}
