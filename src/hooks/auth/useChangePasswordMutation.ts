import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/lib/auth";

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (vars: { currentPassword: string; newPassword: string }) => {
      const res = await changePassword(vars.currentPassword, vars.newPassword);
      if (res.error) throw res.error;
      return res;
    },
  });
}
