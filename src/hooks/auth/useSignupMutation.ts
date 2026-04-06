import { useMutation } from "@tanstack/react-query";
import { signUp, type SignUpData } from "@/lib/auth";

export function useSignupMutation() {
  return useMutation({
    mutationFn: async (data: SignUpData) => {
      const res = await signUp(data);
      if (res.error) throw res.error;
      return res;
    },
  });
}
