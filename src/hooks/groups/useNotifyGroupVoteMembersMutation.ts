import { useMutation } from "@tanstack/react-query";
import { notifyGroupVoteMembers } from "@/lib/groups";

export function useNotifyGroupVoteMembersMutation(groupId?: string) {
  return useMutation({
    mutationFn: async ({
      voteId,
      payload,
    }: {
      voteId: string;
      payload: {
        sendEmail?: boolean;
        sendSMS?: boolean;
        sendNotification?: boolean;
        target?: "pending" | "all";
      };
    }) => {
      if (!groupId) throw new Error("Missing groupId");
      return notifyGroupVoteMembers(groupId, voteId, payload);
    },
  });
}
