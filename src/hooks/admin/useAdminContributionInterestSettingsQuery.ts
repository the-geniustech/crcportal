import { useQuery } from "@tanstack/react-query";
import { getAdminContributionInterestSettings } from "@/lib/admin";

export function useAdminContributionInterestSettingsQuery(params: {
  year?: number;
} = {}) {
  return useQuery({
    queryKey: ["admin", "interest-settings", params.year ?? ""],
    queryFn: async () => getAdminContributionInterestSettings(params),
  });
}
