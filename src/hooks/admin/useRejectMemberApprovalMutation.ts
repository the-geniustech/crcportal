import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rejectMemberApproval } from "@/lib/admin";

export function useRejectMemberApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { membershipId: string; notes?: string }) =>
      rejectMemberApproval(vars.membershipId, { notes: vars.notes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "member-approvals"] });
    },
  });
}

