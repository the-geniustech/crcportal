import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdminMember, type AdminMemberPayload } from "@/lib/adminMembers";

export function useCreateAdminMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminMemberPayload) => createAdminMember(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });
}
