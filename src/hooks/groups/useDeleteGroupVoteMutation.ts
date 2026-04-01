import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteGroupVote } from "@/lib/groups";

export function useDeleteGroupVoteMutation(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ voteId }: { voteId: string }) => {
      if (!groupId) throw new Error("Missing groupId");
      return deleteGroupVote(groupId, voteId);
    },
    onSuccess: (_, variables) => {
      if (!groupId) return;
      void queryClient.invalidateQueries({ queryKey: ["group-votes", groupId] });
      if (variables?.voteId) {
        void queryClient.invalidateQueries({
          queryKey: ["group-vote-participants", groupId, variables.voteId],
        });
      }
    },
  });
}
