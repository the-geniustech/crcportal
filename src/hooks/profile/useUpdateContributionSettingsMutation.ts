import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateContributionSettings,
  type ContributionSettings,
} from "@/lib/contributionSettings";

export function useUpdateContributionSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { units: number; year?: number }) =>
      updateContributionSettings(payload),
    onSuccess: (data: ContributionSettings) => {
      queryClient.setQueryData(["contribution-settings"], data);
    },
  });
}
