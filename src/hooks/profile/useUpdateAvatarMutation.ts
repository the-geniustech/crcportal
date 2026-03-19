import { useMutation } from "@tanstack/react-query";
import { updateMyAvatar } from "@/lib/auth";

export function useUpdateAvatarMutation() {
  return useMutation({
    mutationFn: async (file: File | null) => {
      const res = await updateMyAvatar(file);
      if (res.error) throw res.error;
      return res.profile;
    },
  });
}

