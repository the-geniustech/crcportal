import { useQuery } from "@tanstack/react-query";
import { listAdminGroups } from "@/lib/admin";

export function useAdminGroupsQuery(params: {
  search?: string;
  status?: string;
  category?: string;
  location?: string;
  sort?: string;
  includeMetrics?: boolean;
  year?: number;
  month?: number;
  limit?: number;
  page?: number;
} = {}, enabled = true) {
  const effectiveLimit = params.limit ?? 100;
  const effectivePage = params.page ?? 1;
  return useQuery({
    queryKey: [
      "admin",
      "groups",
      params.search ?? "",
      params.status ?? "",
      params.category ?? "",
      params.location ?? "",
      params.sort ?? "",
      params.includeMetrics ?? true,
      params.year ?? "",
      params.month ?? "",
      effectiveLimit,
      effectivePage,
    ],
    enabled,
    queryFn: async () =>
      listAdminGroups({
        ...params,
        includeMetrics: params.includeMetrics ?? true,
        limit: effectiveLimit,
        page: effectivePage,
      }),
  });
}
