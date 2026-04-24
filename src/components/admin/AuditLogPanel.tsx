import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAuditLogsQuery } from "@/hooks/admin/useAdminAuditLogsQuery";
import { useAdminGroupsQuery } from "@/hooks/admin/useAdminGroupsQuery";
import { useToast } from "@/hooks/use-toast";
import type {
  AdminAuditLogAction,
  AdminAuditLogEntityType,
  AdminAuditLogRow,
} from "@/lib/adminAuditLogs";
import { downloadAdminAuditLogsCsv } from "@/lib/adminAuditLogs";

const PAGE_SIZE = 15;

const FALLBACK_ACTION_LABELS: Record<AdminAuditLogAction, string> = {
  "admin.member.create": "Member Created",
  "admin.member.update": "Member Updated",
  "admin.member.delete": "Member Deleted",
  "admin.user.promote_admin": "Admin Promotion",
  "admin.user.role.update": "User Role Updated",
};

const FALLBACK_ENTITY_LABELS: Record<AdminAuditLogEntityType, string> = {
  groupMembership: "Member Record",
  user: "User Account",
};

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  if (currentPage > 3) pages.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(value);
}

function getActionBadge(action: AdminAuditLogAction) {
  switch (action) {
    case "admin.member.create":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">
          Member Created
        </Badge>
      );
    case "admin.member.update":
      return (
        <Badge className="bg-blue-100 text-blue-700">Member Updated</Badge>
      );
    case "admin.member.delete":
      return <Badge className="bg-red-100 text-red-700">Member Deleted</Badge>;
    case "admin.user.promote_admin":
      return (
        <Badge className="bg-amber-100 text-amber-700">Admin Promotion</Badge>
      );
    case "admin.user.role.update":
      return (
        <Badge className="bg-violet-100 text-violet-700">
          User Role Updated
        </Badge>
      );
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
}

function getEntityBadge(entityType: AdminAuditLogEntityType) {
  switch (entityType) {
    case "groupMembership":
      return <Badge variant="outline">Member Record</Badge>;
    case "user":
      return <Badge variant="outline">User Account</Badge>;
    default:
      return <Badge variant="outline">{entityType}</Badge>;
  }
}

function getDisplayIdentity(input: {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return input.fullName || input.email || input.phone || "Unavailable";
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry));
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((entry) => String(entry)).join(", ") : "-";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getActionLabel(
  action: AdminAuditLogAction,
  labels: Record<string, string>,
) {
  return labels[action] || FALLBACK_ACTION_LABELS[action] || action;
}

function getEntityLabel(
  entityType: AdminAuditLogEntityType,
  labels: Record<string, string>,
) {
  return labels[entityType] || FALLBACK_ENTITY_LABELS[entityType] || entityType;
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDatePreset(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    from: formatDateInput(start),
    to: formatDateInput(end),
  };
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPanel() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogRow | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

  const groupsQuery = useAdminGroupsQuery(
    { includeMetrics: false, limit: 200, sort: "groupNumber" },
    true,
  );

  const auditLogsQuery = useAdminAuditLogsQuery({
    search: search || undefined,
    action:
      actionFilter !== "all"
        ? (actionFilter as AdminAuditLogAction)
        : undefined,
    entityType:
      entityFilter !== "all"
        ? (entityFilter as AdminAuditLogEntityType)
        : undefined,
    groupId: groupFilter !== "all" ? groupFilter : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  }, !hasInvalidDateRange);

  const logs = auditLogsQuery.data?.logs ?? [];
  const summary = auditLogsQuery.data?.summary ?? {
    totalLogs: 0,
    last24Hours: 0,
    memberCrudCount: 0,
    adminPromotionCount: 0,
    affectedGroups: 0,
    actionCounts: [],
  };
  const total = auditLogsQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, total);
  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, entityFilter, groupFilter, fromDate, toDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const actionOptions = auditLogsQuery.data?.filterOptions.actions ?? [];
  const entityOptions = auditLogsQuery.data?.filterOptions.entityTypes ?? [];
  const actionLabels = useMemo(
    () =>
      Object.fromEntries(actionOptions.map((option) => [option.value, option.label])),
    [actionOptions],
  );
  const entityLabels = useMemo(
    () =>
      Object.fromEntries(
        entityOptions.map((option) => [option.value, option.label]),
      ),
    [entityOptions],
  );

  const handleExport = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      toast({
        title: "Invalid date range",
        description: "The start date cannot be later than the end date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      const { blob, filename } = await downloadAdminAuditLogsCsv({
        search: search || undefined,
        action:
          actionFilter !== "all"
            ? (actionFilter as AdminAuditLogAction)
            : undefined,
        entityType:
          entityFilter !== "all"
            ? (entityFilter as AdminAuditLogEntityType)
            : undefined,
        groupId: groupFilter !== "all" ? groupFilter : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      triggerBlobDownload(blob, filename);
      toast({
        title: "CSV export ready",
        description: "The filtered audit trail export has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to export the audit trail.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const metadataRecord = getRecord(selectedLog?.metadata);
  const memberRecord = getRecord(metadataRecord?.member);
  const changeRecords = getRecord(metadataRecord?.changes);
  const deletionSummary = getRecord(metadataRecord?.deletionSummary);
  const changedFields = getStringArray(metadataRecord?.changedFields);
  const beforeRoles = getStringArray(metadataRecord?.beforeRoles);
  const afterRoles = getStringArray(metadataRecord?.afterRoles);
  const addedRoles = getStringArray(metadataRecord?.addedRoles);
  const removedRoles = getStringArray(metadataRecord?.removedRoles);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin-only operational trail
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Audit Trail
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Review privileged member-management and role-elevation events with
                actor, target, request, and group context.
              </p>
              <p className="text-xs text-gray-400">
                Times display in your local timezone. CSV exports always respect the
                filters currently applied.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={isExporting || total === 0 || auditLogsQuery.isLoading}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void auditLogsQuery.refetch()}
              disabled={auditLogsQuery.isFetching}
            >
              {auditLogsQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Filtered Logs</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {summary.totalLogs.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Last 24 Hours</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {summary.last24Hours.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Member Changes</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {summary.memberCrudCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
            <p className="text-sm text-gray-500">Admin Promotions</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {summary.adminPromotionCount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4" />
              Filters
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-9"
                  placeholder="Search actor, target, summary..."
                />
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All groups</SelectItem>
                  {(groupsQuery.data?.groups ?? []).map((group) => (
                    <SelectItem key={group._id} value={group._id}>
                      Group {group.groupNumber ?? "-"} - {group.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="min-w-[160px]"
                aria-label="From date"
              />

              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="min-w-[160px]"
                aria-label="To date"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Quick Range
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                const preset = buildDatePreset(1);
                setFromDate(preset.from);
                setToDate(preset.to);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                const preset = buildDatePreset(7);
                setFromDate(preset.from);
                setToDate(preset.to);
              }}
            >
              Last 7d
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                const preset = buildDatePreset(30);
                setFromDate(preset.from);
                setToDate(preset.to);
              }}
            >
              Last 30d
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-slate-50 text-slate-700">
              {summary.affectedGroups} groups affected
            </Badge>
            {search && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                Search: {search}
              </Badge>
            )}
            {fromDate && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                From: {fromDate}
              </Badge>
            )}
            {toDate && (
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                To: {toDate}
              </Badge>
            )}
            {(search ||
              actionFilter !== "all" ||
              entityFilter !== "all" ||
              groupFilter !== "all" ||
              fromDate ||
              toDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-gray-500"
                onClick={() => {
                  setSearchInput("");
                  setActionFilter("all");
                  setEntityFilter("all");
                  setGroupFilter("all");
                  setFromDate("");
                  setToDate("");
                }}
              >
                Reset filters
              </Button>
            )}
          </div>

          {hasInvalidDateRange && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              The start date cannot be later than the end date.
            </div>
          )}

          {summary.actionCounts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {summary.actionCounts.map((entry) => (
                <Badge
                  key={entry.action}
                  variant="outline"
                  className="bg-white text-slate-700"
                >
                  {getActionLabel(entry.action, actionLabels)}:{" "}
                  {entry.count.toLocaleString()}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-sm text-gray-500">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              )}

              {!auditLogsQuery.isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-sm text-gray-500">
                    <Activity className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    No audit events matched the current filters.
                  </TableCell>
                </TableRow>
              )}

              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.action)}
                        {getEntityBadge(log.entityType)}
                      </div>
                      <div className="text-sm text-gray-500">
                        <p>{formatRelativeDate(log.createdAt)}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getDisplayIdentity(log.actor)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.actor.roles.length > 0
                          ? log.actor.roles.join(", ")
                          : "No roles"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getDisplayIdentity(log.target)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.target.email || log.target.phone || "No contact"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.group.id ? (
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.group.name || "Group"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Group {log.group.number ?? "-"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">System-wide</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-sm text-gray-700">
                      {log.summary || "No summary recorded."}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500">
            Showing {pageStart}-{pageEnd} of {total} audit events
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                  }}
                />
              </PaginationItem>
              {pageItems.map((page, index) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {selectedLog ? getActionBadge(selectedLog.action) : null}
              {selectedLog ? (
                <span className="text-base font-semibold text-gray-900">
                  {getActionLabel(selectedLog.action, actionLabels)}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Structured event details for operational review and investigation.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Logged At
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {formatDateTime(selectedLog.createdAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Entity
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {getEntityLabel(selectedLog.entityType, entityLabels)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedLog.entityId}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Event Id
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-gray-900">
                    {selectedLog.id}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Request Method
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {selectedLog.request.method || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Affected Group
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {selectedLog.group.name || "System-wide"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-5">
                <h4 className="text-base font-semibold text-gray-900">Summary</h4>
                <p className="mt-3 text-sm text-gray-700">
                  {selectedLog.summary || "No summary recorded for this event."}
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-base font-semibold text-gray-900">Actor</h4>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Identity
                      </p>
                      <p className="mt-1 text-gray-900">
                        {getDisplayIdentity(selectedLog.actor)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Roles
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedLog.actor.roles.length > 0
                          ? selectedLog.actor.roles.join(", ")
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Contact
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedLog.actor.email || selectedLog.actor.phone || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-blue-600" />
                    <h4 className="text-base font-semibold text-gray-900">Target</h4>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Identity
                      </p>
                      <p className="mt-1 text-gray-900">
                        {getDisplayIdentity(selectedLog.target)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Contact
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedLog.target.email || selectedLog.target.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Profile Id
                      </p>
                      <p className="mt-1 break-all text-gray-900">
                        {selectedLog.target.profileId || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-600" />
                    <h4 className="text-base font-semibold text-gray-900">
                      Request Context
                    </h4>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Path
                      </p>
                      <p className="mt-1 break-all text-gray-900">
                        {selectedLog.request.path || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        IP Address
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedLog.request.ip || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        User Agent
                      </p>
                      <p className="mt-1 break-all text-gray-900">
                        {selectedLog.request.userAgent || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {(changedFields.length > 0 ||
                Object.keys(changeRecords ?? {}).length > 0 ||
                beforeRoles.length > 0 ||
                afterRoles.length > 0 ||
                addedRoles.length > 0 ||
                removedRoles.length > 0) && (
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h4 className="text-base font-semibold text-gray-900">
                    Change Summary
                  </h4>

                  {changedFields.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Changed Fields
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {changedFields.map((field) => (
                          <Badge key={field} variant="outline">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(beforeRoles.length > 0 || afterRoles.length > 0) && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Roles Before
                        </p>
                        <p className="mt-2 text-sm text-gray-900">
                          {beforeRoles.length > 0 ? beforeRoles.join(", ") : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Roles After
                        </p>
                        <p className="mt-2 text-sm text-gray-900">
                          {afterRoles.length > 0 ? afterRoles.join(", ") : "-"}
                        </p>
                      </div>
                    </div>
                  )}

                  {(addedRoles.length > 0 || removedRoles.length > 0) && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">
                          Roles Added
                        </p>
                        <p className="mt-2 text-sm text-emerald-900">
                          {addedRoles.length > 0 ? addedRoles.join(", ") : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-red-700">
                          Roles Removed
                        </p>
                        <p className="mt-2 text-sm text-red-900">
                          {removedRoles.length > 0 ? removedRoles.join(", ") : "-"}
                        </p>
                      </div>
                    </div>
                  )}

                  {changeRecords && Object.keys(changeRecords).length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Before</TableHead>
                            <TableHead>After</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(changeRecords).map(([field, change]) => {
                            const changeRecord = getRecord(change);
                            return (
                              <TableRow key={field}>
                                <TableCell className="font-medium text-gray-900">
                                  {field}
                                </TableCell>
                                <TableCell>
                                  {formatValue(changeRecord?.before)}
                                </TableCell>
                                <TableCell>
                                  {formatValue(changeRecord?.after)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {(memberRecord || deletionSummary) && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {memberRecord && (
                    <div className="rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Member Snapshot
                        </h4>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(memberRecord).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              {key}
                            </p>
                            <p className="mt-1 break-words text-sm text-gray-900">
                              {formatValue(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {deletionSummary && (
                    <div className="rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Deletion Summary
                        </h4>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(deletionSummary).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              {key}
                            </p>
                            <p className="mt-1 break-words text-sm text-gray-900">
                              {formatValue(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
