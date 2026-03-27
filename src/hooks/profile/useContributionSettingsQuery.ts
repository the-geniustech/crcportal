import { useQuery } from "@tanstack/react-query";
import { getContributionSettings } from "@/lib/contributionSettings";

export function useContributionSettingsQuery() {
  return useQuery({
    queryKey: ["contribution-settings"],
    queryFn: async () => getContributionSettings(),
  });
}
