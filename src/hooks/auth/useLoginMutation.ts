import { useMutation } from "@tanstack/react-query";
import { signIn, type SignInData } from "@/lib/auth";

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (data: SignInData) => {
      const res = await signIn(data);
      if (res.error) throw res.error;
      return res;
    },
  });
}
