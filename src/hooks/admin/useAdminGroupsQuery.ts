import { useQuery } from "@tanstack/react-query";
import { listAdminGroups } from "@/lib/admin";

export function useAdminGroupsQuery(params: {
  search?: string;
  status?: string;
  includeMetrics?: boolean;
  year?: number;
  month?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: [
      "admin",
      "groups",
      params.search ?? "",
      params.status ?? "",
      params.includeMetrics ?? true,
      params.year ?? "",
      params.month ?? "",
      params.limit ?? 100,
    ],
    queryFn: async () =>
      listAdminGroups({
        ...params,
        includeMetrics: params.includeMetrics ?? true,
        limit: params.limit ?? 200,
      }),
  });
}

