import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/lib/auth";

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: string | { email?: string; phone?: string }) => {
      const res = await resetPassword(payload);
      if (res.error) throw res.error;
      return res;
    },
  });
}
