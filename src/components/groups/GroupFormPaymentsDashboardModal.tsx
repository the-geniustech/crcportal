import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroupFormPaymentsQuery } from "@/hooks/groups/useGroupFormPaymentsQuery";
import { useToast } from "@/hooks/use-toast";
import { downloadGroupFormPaymentsExport } from "@/lib/groups";
import type {
  AdminFormPayment,
  AdminFormPaymentFilterType,
  AdminFormPaymentSort,
  AdminFormPaymentStatus,
} from "@/lib/adminFormPayments";
import type { GroupRole } from "@/lib/roles";

type FilterValue<T extends string> = T | "all";

interface GroupFormPaymentsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: {
    id: string;
    name: string;
    description: string;
    location: string;
    memberCount: number;
    maxMembers: number;
    monthlyContribution: number;
    totalSavings: number;
    category: string;
    image: string;
    isOpen: boolean;
    createdAt: string;
    rules?: string;
  } | null;
  currentMemberRole?: GroupRole | null;
}

const FORM_TYPE_OPTIONS: Array<{
  value: FilterValue<AdminFormPaymentFilterType>;
  label: string;
}> = [
  { value: "all", label: "All Forms" },
  { value: "membership_registration", label: "Membership Registration" },
  { value: "revolving_loan", label: "Revolving Loan" },
  { value: "bss_loan", label: "BSS Loan Form" },
];

const STATUS_OPTIONS: Array<{
  value: FilterValue<AdminFormPaymentStatus>;
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "defaulted", label: "Defaulted" },
];

const SORT_OPTIONS: Array<{ value: AdminFormPaymentSort; label: string }> = [
  { value: "submitted_desc", label: "Newest Submitted" },
  { value: "submitted_asc", label: "Oldest Submitted" },
  { value: "reviewed_desc", label: "Recently Reviewed" },
  { value: "reviewed_asc", label: "Oldest Reviewed" },
  { value: "amount_desc", label: "Amount High-Low" },
  { value: "amount_asc", label: "Amount Low-High" },
  { value: "member_asc", label: "Member A-Z" },
  { value: "member_desc", label: "Member Z-A" },
  { value: "form_type_asc", label: "Form Type A-Z" },
  { value: "status_asc", label: "Status" },
];

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number | null) {
  const safe = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(safe) ? safe : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formTypeLabel(value?: string | null) {
  if (
    value === "bridging_loan" ||
    value === "soft_loan" ||
    value === "special_loan"
  ) {
    return "BSS Loan Form";
  }

  return (
    FORM_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    "Form Payment"
  );
}

function formTypeGroupKey(value?: string | null) {
  if (
    value === "bridging_loan" ||
    value === "soft_loan" ||
    value === "special_loan"
  ) {
    return "bss_loan";
  }

  return value || "unknown";
}

function statusPill(status: AdminFormPaymentStatus) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Paid
      </span>
    );
  }
  if (status === "defaulted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        <XCircle className="h-3.5 w-3.5" />
        Defaulted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock3 className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "slate" | "emerald" | "amber" | "red";
}) {
  const toneClass = {
    slate: "bg-slate-900 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-red-500 text-white",
  }[tone];

  return (
    <div className={`${toneClass} rounded-2xl p-5 shadow-sm`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-3 text-sm opacity-80">{helper}</p>
    </div>
  );
}

const GroupFormPaymentsDashboardModal: React.FC<
  GroupFormPaymentsDashboardModalProps
> = ({ isOpen, onClose, group, currentMemberRole }) => {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [formType, setFormType] =
    useState<FilterValue<AdminFormPaymentFilterType>>("all");
  const [paymentStatus, setPaymentStatus] =
    useState<FilterValue<AdminFormPaymentStatus>>("all");
  const [sortBy, setSortBy] =
    useState<AdminFormPaymentSort>("submitted_desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [exportingFormat, setExportingFormat] = useState<
    null | "pdf" | "csv" | "xlsx"
  >(null);
  const pageSize = 50;

  useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
      setFormType("all");
      setPaymentStatus("all");
      setSortBy("submitted_desc");
      setFromDate("");
      setToDate("");
      setPage(1);
      setExportingFormat(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, formType, paymentStatus, sortBy, fromDate, toDate]);

  const paymentsQuery = useGroupFormPaymentsQuery(
    group?.id,
    {
      search: deferredSearch || undefined,
      formType,
      paymentStatus,
      sort: sortBy,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
      limit: pageSize,
    },
    isOpen,
  );

  const payments = useMemo(
    () => paymentsQuery.data?.payments ?? [],
    [paymentsQuery.data?.payments],
  );
  const summary = paymentsQuery.data?.summary;
  const scope = paymentsQuery.data?.scope ?? "member";
  const meta = paymentsQuery.data?.meta;
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / pageSize));
  const isLoading = paymentsQuery.isLoading || paymentsQuery.isFetching;

  const roleLabel = currentMemberRole
    ? currentMemberRole.charAt(0).toUpperCase() + currentMemberRole.slice(1)
    : "Member";

  const hasActiveFilters =
    Boolean(deferredSearch) ||
    formType !== "all" ||
    paymentStatus !== "all" ||
    sortBy !== "submitted_desc" ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const totalsByFormType = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    payments.forEach((payment) => {
      const key = formTypeGroupKey(payment.formType);
      const current = map.get(key) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(payment.amount || 0);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([type, value]) => ({
      type,
      label: formTypeLabel(type),
      ...value,
    }));
  }, [payments]);

  const resetFilters = () => {
    setSearchInput("");
    setFormType("all");
    setPaymentStatus("all");
    setSortBy("submitted_desc");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleExport = async (format: "pdf" | "csv" | "xlsx") => {
    if (!group) return;
    if ((summary?.totalRecords ?? 0) === 0) {
      toast({
        title: "No records to export",
        description: "Adjust the filters before exporting form payments.",
        variant: "destructive",
      });
      return;
    }

    setExportingFormat(format);
    try {
      const response = await downloadGroupFormPaymentsExport(group.id, {
        search: deferredSearch || undefined,
        formType,
        paymentStatus,
        sort: sortBy,
        from: fromDate || undefined,
        to: toDate || undefined,
        format,
      });
      const url = URL.createObjectURL(response.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.filename ||
        `${group.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-form-payments.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export complete",
        description: `Form payment ledger exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : `Unable to export ${format.toUpperCase()} file.`,
        variant: "destructive",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60">
      <div className="flex h-full w-full flex-col bg-slate-50">
        <div className="relative">
          <div className="h-48 w-full overflow-hidden">
            <img
              src={group.image}
              alt={group.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-emerald-950/60" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            aria-label="Close form payments dashboard"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
                  <FileText className="h-4 w-4" />
                  {scope === "group" ? "Group ledger" : "Your form payments"}
                </div>
                <h2 className="text-3xl font-bold">
                  {group.name} Form Payments
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-emerald-50/85">
                  Track membership and loan form payments linked to this group,
                  including payment statuses and transaction references.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm backdrop-blur">
                <p className="font-semibold">Current access</p>
                <p className="mt-1 text-emerald-50/80">
                  {scope === "group"
                    ? `Viewing group-wide records as ${roleLabel}`
                    : "Viewing only your own payment records"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Expected"
              value={formatCurrency(summary?.totalAmount ?? 0)}
              helper={`${summary?.totalRecords ?? 0} form payment records`}
              tone="slate"
            />
            <StatCard
              label="Paid"
              value={formatCurrency(summary?.paidAmount ?? 0)}
              helper={`${summary?.paidCount ?? 0} confirmed payments`}
              tone="emerald"
            />
            <StatCard
              label="Pending"
              value={formatCurrency(summary?.pendingAmount ?? 0)}
              helper={`${summary?.pendingCount ?? 0} awaiting review`}
              tone="amber"
            />
            <StatCard
              label="Defaulted"
              value={formatCurrency(summary?.defaultedAmount ?? 0)}
              helper={`${summary?.defaultedCount ?? 0} issue records`}
              tone="red"
            />
          </div>

          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-7">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search member, phone, form or transaction"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={formType}
                onValueChange={(value) =>
                  setFormType(value as FilterValue<AdminFormPaymentFilterType>)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Form type" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={paymentStatus}
                onValueChange={(value) =>
                  setPaymentStatus(
                    value as FilterValue<AdminFormPaymentStatus>,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(value as AdminFormPaymentSort)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2 xl:col-span-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {isLoading
                  ? "Refreshing form payment records..."
                  : `${meta?.total ?? 0} records found`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear Filters
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={
                        Boolean(exportingFormat) ||
                        isLoading ||
                        (summary?.totalRecords ?? 0) === 0
                      }
                    >
                      <Download className="h-4 w-4" />
                      {exportingFormat
                        ? `Exporting ${exportingFormat.toUpperCase()}...`
                        : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => void handleExport("pdf")}
                      disabled={exportingFormat === "pdf"}
                    >
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleExport("csv")}
                      disabled={exportingFormat === "csv"}
                    >
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleExport("xlsx")}
                      disabled={exportingFormat === "xlsx"}
                    >
                      Export XLSX
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {totalsByFormType.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {totalsByFormType.map((entry) => (
                <div
                  key={entry.type}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {entry.label}
                  </p>
                  <p className="mt-2 text-xl font-bold text-emerald-700">
                    {formatCurrency(entry.amount)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {entry.count} visible record{entry.count === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Form Payment Ledger
                </h3>
                <p className="text-sm text-gray-500">
                  Every paid form payment should have a transaction reference.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                      Member
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                      Form
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                      Submitted
                    </th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-gray-500"
                      >
                        Loading form payments...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-gray-300" />
                        <h4 className="mt-3 font-semibold text-gray-900">
                          No form payments found
                        </h4>
                        <p className="mt-1 text-sm text-gray-500">
                          No form payment records match the current filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment: AdminFormPayment) => (
                      <tr key={payment.id} className="hover:bg-gray-50/70">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {payment.memberName || "Unknown member"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.memberEmail ||
                              payment.memberPhone ||
                              "No contact captured"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {payment.formLabel}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.sourceReference ||
                              formTypeLabel(payment.formType)}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-5 py-4">
                          {statusPill(payment.paymentStatus)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-900">
                            {formatDate(payment.submittedAt)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Reviewed {formatDate(payment.reviewedAt)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-semibold text-emerald-700">
                            {payment.transactionReference || "Pending sync"}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Page <span className="font-semibold text-gray-900">{page}</span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900">
                  {totalPages}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupFormPaymentsDashboardModal;
