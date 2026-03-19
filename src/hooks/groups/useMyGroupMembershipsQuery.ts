import { useQuery } from "@tanstack/react-query";
import { listMyGroupMemberships } from "@/lib/groups";

export function useMyGroupMembershipsQuery() {
  return useQuery({
    queryKey: ["my-groups"],
    queryFn: async () => listMyGroupMemberships(),
  });
}

