import { useMutation, useQueryClient } from "@tanstack/react-query";
import { respondToGroupVote } from "@/lib/groups";

export function useRespondGroupVoteMutation(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voteId,
      choice,
    }: {
      voteId: string;
      choice: "yes" | "no";
    }) => {
      if (!groupId) throw new Error("Missing groupId");
      return respondToGroupVote(groupId, voteId, { choice });
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
