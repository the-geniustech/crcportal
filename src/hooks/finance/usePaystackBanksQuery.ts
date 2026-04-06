import { useQuery } from "@tanstack/react-query";
import { listPaystackBanks } from "@/lib/finance";

export function usePaystackBanksQuery(params: { country?: string; enabled?: boolean } = {}) {
  const { enabled = true, country = "nigeria" } = params;
  return useQuery({
    queryKey: ["banks", "paystack", country],
    queryFn: async () => listPaystackBanks({ country }),
    enabled,
  });
}
