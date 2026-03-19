import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGroupVote } from "@/lib/groups";

export function useCreateGroupVoteMutation(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      status?: "active" | "closed";
      endsAt?: string | null;
    }) => {
      if (!groupId) throw new Error("Missing groupId");
      return createGroupVote(groupId, payload);
    },
    onSuccess: () => {
      if (!groupId) return;
      void queryClient.invalidateQueries({ queryKey: ["group-votes", groupId] });
    },
  });
}
