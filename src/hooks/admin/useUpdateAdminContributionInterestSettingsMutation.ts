import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAdminContributionInterestSettings } from "@/lib/admin";

export function useUpdateAdminContributionInterestSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      year: number;
      rates: Record<number, number> | Array<{ month: number; ratePerThousand: number }>;
    }) => updateAdminContributionInterestSettings(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "interest-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "summary-income"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "interest-sharing"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "financial-reports"] }),
        queryClient.invalidateQueries({
          queryKey: ["group-contributions", "interest-ledger"],
        }),
      ]);
    },
  });
}
