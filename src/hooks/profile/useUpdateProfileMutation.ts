import { useMutation } from "@tanstack/react-query";
import { updateProfile, type Profile } from "@/lib/auth";

export function useUpdateProfileMutation(userId?: string) {
  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!userId) throw new Error("Missing user id");
      const res = await updateProfile(userId, updates);
      if (res.error) throw res.error;
      return res.profile;
    },
  });
}

