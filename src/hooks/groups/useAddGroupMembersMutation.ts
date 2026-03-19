import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addGroupMembers } from "@/lib/groups";

export function useAddGroupMembersMutation(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userIds: string[] }) => {
      if (!groupId) throw new Error("Missing groupId");
      return addGroupMembers(groupId, payload);
    },
    onSuccess: () => {
      if (!groupId) return;
      void queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });
}
