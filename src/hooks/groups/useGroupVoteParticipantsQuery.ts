import { useQuery } from "@tanstack/react-query";
import { listGroupVoteParticipants } from "@/lib/groups";

export function useGroupVoteParticipantsQuery(
  groupId?: string,
  voteId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["group-vote-participants", groupId, voteId],
    enabled: Boolean(groupId && voteId && enabled),
    queryFn: async () => {
      if (!groupId || !voteId) return null;
      return listGroupVoteParticipants(groupId, voteId);
    },
  });
}
