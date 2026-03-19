import { useQuery } from "@tanstack/react-query";
import { listGroupMeetings } from "@/lib/groups";

export function useGroupMeetingsQuery(groupId?: string) {
  return useQuery({
    queryKey: ["group-meetings", groupId],
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (!groupId) return [];
      return listGroupMeetings(groupId);
    },
  });
}

