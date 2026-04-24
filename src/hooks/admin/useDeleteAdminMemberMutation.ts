import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAdminMember } from "@/lib/adminMembers";

export function useDeleteAdminMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { membershipId: string; confirmation: string }) =>
      deleteAdminMember(input.membershipId, input.confirmation),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });
}
