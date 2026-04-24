import { api, getApiErrorMessage } from "@/lib/api/client";
import type { UserRole } from "@/lib/roles";

export type AdminAuditLogAction =
  | "admin.member.create"
  | "admin.member.update"
  | "admin.member.delete"
  | "admin.user.promote_admin"
  | "admin.user.role.update";

export type AdminAuditLogEntityType = "groupMembership" | "user";

export type AdminAuditLogFilterOption<T extends string> = {
  value: T;
  label: string;
};

export interface AdminAuditLogRow {
  id: string;
  action: AdminAuditLogAction;
  entityType: AdminAuditLogEntityType;
  entityId: string;
  summary: string | null;
  createdAt: string;
  actor: {
    userId: string | null;
    profileId: string | null;
    fullName: string;
    email: string | null;
    phone: string | null;
    roles: UserRole[];
  };
  target: {
    userId: string | null;
    profileId: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  group: {
    id: string | null;
    name: string | null;
    number: number | null;
  };
  request: {
    method: string | null;
    path: string | null;
    ip: string | null;
    userAgent: string | null;
  };
  metadata: Record<string, unknown> | null;
}

export interface AdminAuditLogSummary {
  totalLogs: number;
  last24Hours: number;
  memberCrudCount: number;
  adminPromotionCount: number;
  affectedGroups: number;
  actionCounts: Array<{
    action: AdminAuditLogAction;
    count: number;
  }>;
}

export interface AdminAuditLogResponse {
  logs: AdminAuditLogRow[];
  summary: AdminAuditLogSummary;
  filterOptions: {
    actions: AdminAuditLogFilterOption<AdminAuditLogAction>[];
    entityTypes: AdminAuditLogFilterOption<AdminAuditLogEntityType>[];
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    results: number;
  };
}

function extractFilename(value: unknown): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const match = /filename="?([^"]+)"?/i.exec(String(raw));
  return match?.[1] || null;
}

export async function listAdminAuditLogs(
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
): Promise<AdminAuditLogResponse> {
  try {
    const res = await api.get("/admin/audit-logs", { params });
    const payload = res.data ?? {};

    return {
      logs: (payload?.data?.logs ?? []) as AdminAuditLogRow[],
      summary: (payload?.data?.summary ?? {
        totalLogs: 0,
        last24Hours: 0,
        memberCrudCount: 0,
        adminPromotionCount: 0,
        affectedGroups: 0,
        actionCounts: [],
      }) as AdminAuditLogSummary,
      filterOptions: {
        actions: (payload?.data?.filterOptions?.actions ?? []) as AdminAuditLogFilterOption<AdminAuditLogAction>[],
        entityTypes: (payload?.data?.filterOptions?.entityTypes ?? []) as AdminAuditLogFilterOption<AdminAuditLogEntityType>[],
      },
      meta: {
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? params.page ?? 1),
        limit: Number(payload?.limit ?? params.limit ?? 0),
        results: Number(payload?.results ?? 0),
      },
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function downloadAdminAuditLogsCsv(
  params: {
    search?: string;
    action?: AdminAuditLogAction;
    entityType?: AdminAuditLogEntityType;
    groupId?: string;
    from?: string;
    to?: string;
  } = {},
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get("/admin/audit-logs/export", {
      params,
      responseType: "blob",
    });
    const filename =
      extractFilename(res.headers?.["content-disposition"]) ||
      "audit-trail.csv";
    const contentType =
      (res.headers?.["content-type"] as string) || "text/csv";
    return {
      blob: new Blob([res.data], { type: contentType }),
      filename,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
