import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disableTwoFactor } from "@/lib/security";

export function useDisableTwoFactorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { password: string; code: string }) =>
      disableTwoFactor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "two-factor-status"] });
    },
  });
}
