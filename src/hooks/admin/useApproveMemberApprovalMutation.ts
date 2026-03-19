import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveMemberApproval } from "@/lib/admin";

export function useApproveMemberApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { membershipId: string; notes?: string }) =>
      approveMemberApproval(vars.membershipId, { notes: vars.notes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "member-approvals"] });
    },
  });
}

