import { useMutation, useQueryClient } from "@tanstack/react-query";
import { promoteAdminMember } from "@/lib/adminMembers";

export function usePromoteAdminMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => promoteAdminMember(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "members", "detail"] });
    },
  });
}
