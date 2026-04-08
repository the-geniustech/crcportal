import { useQuery } from "@tanstack/react-query";
import { getGroupContributionInterestLedger } from "@/lib/groups";

export function useGroupContributionInterestLedgerQuery(
  groupId?: string,
  params: { year?: number; contributionType?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "group-contributions",
      "interest-ledger",
      groupId,
      params.year ?? "",
      params.contributionType ?? "",
    ],
    enabled: Boolean(groupId) && enabled,
    queryFn: async () => {
      if (!groupId) return null;
      return getGroupContributionInterestLedger(groupId, params);
    },
  });
}
