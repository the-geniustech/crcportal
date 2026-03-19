import { useMutation } from "@tanstack/react-query";
import { resetPasswordWithToken } from "@/lib/auth";

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (vars: { token: string; password: string }) => {
      const res = await resetPasswordWithToken(vars.token, vars.password);
      if (res.error) throw res.error;
      return res;
    },
  });
}
