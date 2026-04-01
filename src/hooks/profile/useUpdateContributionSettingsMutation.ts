import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateContributionSettings,
  type ContributionSettings,
  type ContributionSettingsUnits,
} from "@/lib/contributionSettings";

export function useUpdateContributionSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { units: Partial<ContributionSettingsUnits>; year?: number }) =>
      updateContributionSettings(payload),
    onSuccess: (data: ContributionSettings) => {
      queryClient.setQueryData(["contribution-settings"], data);
    },
  });
}
