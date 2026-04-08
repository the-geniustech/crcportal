import { useMutation } from "@tanstack/react-query";
import { updateAdminContributionInterestSettings } from "@/lib/admin";

export function useUpdateAdminContributionInterestSettingsMutation() {
  return useMutation({
    mutationFn: async (payload: {
      year: number;
      rates: Record<number, number> | Array<{ month: number; ratePerThousand: number }>;
    }) => updateAdminContributionInterestSettings(payload),
  });
}
