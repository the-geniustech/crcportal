import { useQuery } from "@tanstack/react-query";
import {
  listAdminAuditLogs,
  type AdminAuditLogAction,
  type AdminAuditLogEntityType,
} from "@/lib/adminAuditLogs";

export function useAdminAuditLogsQuery(
  params: {
    search?: string;
    action?: AdminAuditLogAction;
    entityType?: AdminAuditLogEntityType;
    groupId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {},
  enabled = true,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 15;

  return useQuery({
    queryKey: [
      "admin",
      "audit-logs",
      params.search ?? "",
      params.action ?? "all",
      params.entityType ?? "all",
      params.groupId ?? "all",
      params.from ?? "",
      params.to ?? "",
      page,
      limit,
    ],
    enabled,
    queryFn: () =>
      listAdminAuditLogs({
        ...params,
        page,
        limit,
      }),
    staleTime: 30_000,
  });
}
