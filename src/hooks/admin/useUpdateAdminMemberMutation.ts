import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAdminMember, type AdminMemberPayload } from "@/lib/adminMembers";

export function useUpdateAdminMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { membershipId: string; payload: AdminMemberPayload }) =>
      updateAdminMember(input.membershipId, input.payload),
    onSuccess: (member) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      void queryClient.setQueryData(
        ["admin", "members", "detail", member.membershipId],
        member,
      );
    },
  });
}
