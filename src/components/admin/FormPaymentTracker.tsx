import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  XCircle,
} from "lucide-react";

import AdminGroupFilter from "@/components/admin/AdminGroupFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Textarea } from "@/components/ui/textarea";
import { useAdminFormPaymentDetailsQuery } from "@/hooks/admin/useAdminFormPaymentDetailsQuery";
import { useAdminFormPaymentsQuery } from "@/hooks/admin/useAdminFormPaymentsQuery";
import { useUpdateAdminFormPaymentMutation } from "@/hooks/admin/useUpdateAdminFormPaymentMutation";
import { useToast } from "@/hooks/use-toast";
import {
  downloadAdminFormPaymentsExport,
  type AdminFormPayment,
  type AdminFormPaymentFilterType,
  type AdminFormPaymentSort,
  type AdminFormPaymentStatus,
} from "@/lib/adminFormPayments";
import { cn } from "@/lib/utils";

type FilterValue<T extends string> = T | "all";

const FORM_TYPE_OPTIONS: Array<{
  value: FilterValue<AdminFormPaymentFilterType>;
  label: string;
}> = [
  { value: "all", label: "All form types" },
  { value: "membership_registration", label: "Membership Registration" },
  { value: "revolving_loan", label: "Revolving Loan" },
  { value: "bss_loan", label: "BSS Loan Form" },
];

const DEFAULT_PAYMENT_STATUS: FilterValue<AdminFormPaymentStatus> = "all";

const STATUS_OPTIONS: Array<{
  value: FilterValue<AdminFormPaymentStatus>;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "defaulted", label: "Defaulted" },
];

const SORT_OPTIONS: Array<{ value: AdminFormPaymentSort; label: string }> = [
  { value: "submitted_desc", label: "Newest submitted" },
  { value: "submitted_asc", label: "Oldest submitted" },
  { value: "reviewed_desc", label: "Recently reviewed" },
  { value: "reviewed_asc", label: "Oldest reviewed" },
  { value: "amount_desc", label: "Amount high to low" },
  { value: "amount_asc", label: "Amount low to high" },
  { value: "member_asc", label: "Member A-Z" },
  { value: "member_desc", label: "Member Z-A" },
  { value: "group_asc", label: "Group A-Z" },
  { value: "group_desc", label: "Group Z-A" },
  { value: "form_type_asc", label: "Form type A-Z" },
  { value: "status_asc", label: "Status" },
];

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentYearDateRange() {
  const today = new Date();
  return {
    from: `${today.getFullYear()}-01-01`,
    to: formatDateInputValue(today),
  };
}

function formatCurrency(value?: number | null) {
  const safe = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(safe) ? safe : 0);
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

function formatPlainDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: AdminFormPaymentStatus) {
  switch (status) {
    case "paid":
      return (
        <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Paid
        </Badge>
      );
    case "defaulted":
      return (
        <Badge className="gap-1 border-red-200 bg-red-50 text-red-700">
          <XCircle className="h-3.5 w-3.5" />
          Defaulted
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
          <Clock3 className="h-3.5 w-3.5" />
          Pending
        </Badge>
      );
  }
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

function displayFormLabel(payment: Pick<AdminFormPayment, "formType" | "formLabel">) {
  if (
    payment.formType === "bridging_loan" ||
    payment.formType === "soft_loan" ||
    payment.formType === "special_loan"
  ) {
    return "BSS Loan Form";
  }

  return payment.formLabel || formTypeLabel(payment.formType);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((entry) => entry && typeof entry === "object") as Array<
        Record<string, unknown>
      >
    : [];
}

function formatDetailValue(value: unknown): string {
  if (value === null || typeof value === "undefined" || value === "") return "-";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const maybeDate = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(maybeDate.getTime())) {
      return formatDateTime(value);
    }
    return value;
  }
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DetailGrid({
  items,
}: {
  items: Array<{ label: string; value: unknown }>;
}) {
  const visible = items.filter(
    (item) =>
      item.value !== null &&
      typeof item.value !== "undefined" &&
      item.value !== "",
  );

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">No details recorded.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {visible.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-100 bg-gray-50/70 p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {item.label}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-gray-900">
            {formatDetailValue(item.value)}
          </p>
        </div>
      ))}
    </div>
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
  tone: "slate" | "amber" | "emerald" | "red";
}) {
  const tones = {
    slate: "from-slate-900 to-slate-700 text-white",
    amber: "from-amber-500 to-orange-500 text-white",
    emerald: "from-emerald-500 to-teal-500 text-white",
    red: "from-red-500 to-rose-500 text-white",
  };

  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-5 shadow-sm", tones[tone])}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-3 text-sm opacity-80">{helper}</p>
    </div>
  );
}

export default function FormPaymentTracker() {
  const { toast } = useToast();
  const [defaultDateRange] = useState(() => getCurrentYearDateRange());
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [formType, setFormType] =
    useState<FilterValue<AdminFormPaymentFilterType>>("all");
  const [paymentStatus, setPaymentStatus] =
    useState<FilterValue<AdminFormPaymentStatus>>(DEFAULT_PAYMENT_STATUS);
  const [groupId, setGroupId] = useState("all");
  const [fromDate, setFromDate] = useState(defaultDateRange.from);
  const [toDate, setToDate] = useState(defaultDateRange.to);
  const [sortBy, setSortBy] =
    useState<AdminFormPaymentSort>("submitted_desc");
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] =
    useState<AdminFormPayment | null>(null);
  const [reviewStatus, setReviewStatus] =
    useState<AdminFormPaymentStatus>("pending");
  const [reviewNotes, setReviewNotes] = useState("");
  const [exportingFormat, setExportingFormat] = useState<
    "pdf" | "csv" | "xlsx" | null
  >(null);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [
    deferredSearch,
    formType,
    paymentStatus,
    groupId,
    fromDate,
    toDate,
    sortBy,
  ]);

  const paymentsQuery = useAdminFormPaymentsQuery({
    search: deferredSearch || undefined,
    formType,
    paymentStatus,
    groupId,
    from: fromDate || undefined,
    to: toDate || undefined,
    sort: sortBy,
    page,
    limit: pageSize,
  });

  const payments = paymentsQuery.data?.payments ?? [];
  const summary = paymentsQuery.data?.summary;
  const meta = paymentsQuery.data?.meta;
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / pageSize));

  const detailsQuery = useAdminFormPaymentDetailsQuery(
    selectedPayment?.id ?? null,
    Boolean(selectedPayment),
  );
  const activePayment = detailsQuery.data ?? selectedPayment;
  const updateMutation = useUpdateAdminFormPaymentMutation();

  useEffect(() => {
    if (!activePayment) return;
    setReviewStatus(activePayment.paymentStatus);
    setReviewNotes(activePayment.notes || "");
  }, [activePayment]);

  const hasActiveFilters =
    Boolean(deferredSearch) ||
    formType !== "all" ||
    paymentStatus !== DEFAULT_PAYMENT_STATUS ||
    groupId !== "all" ||
    fromDate !== defaultDateRange.from ||
    toDate !== defaultDateRange.to ||
    sortBy !== "submitted_desc";

  const detail = useMemo(
    () => asRecord(activePayment?.formDetails),
    [activePayment?.formDetails],
  );
  const memberDetail = asRecord(detail.member);
  const groupDetail = asRecord(detail.group);
  const disbursementAccount = asRecord(detail.disbursementAccount);
  const documents = asArray(detail.documents);
  const guarantors = asArray(detail.guarantors);

  const resetFilters = () => {
    setSearchInput("");
    setFormType("all");
    setPaymentStatus(DEFAULT_PAYMENT_STATUS);
    setGroupId("all");
    setFromDate(defaultDateRange.from);
    setToDate(defaultDateRange.to);
    setSortBy("submitted_desc");
    setPage(1);
  };

  const handleExport = async (format: "pdf" | "csv" | "xlsx") => {
    if (paymentsQuery.isFetching) {
      toast({
        title: "Please wait",
        description: "Form payment records are still refreshing.",
      });
      return;
    }

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
      const { blob, filename } = await downloadAdminFormPaymentsExport({
        search: deferredSearch || undefined,
        formType,
        paymentStatus,
        groupId,
        from: fromDate || undefined,
        to: toDate || undefined,
        sort: sortBy,
        format,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export complete",
        description: `Form payment records exported as ${format.toUpperCase()}.`,
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

  const openReview = (payment: AdminFormPayment) => {
    setSelectedPayment(payment);
    setReviewStatus(payment.paymentStatus);
    setReviewNotes(payment.notes || "");
  };

  const closeReview = () => {
    if (updateMutation.isPending) return;
    setSelectedPayment(null);
  };

  const updatePaymentStatus = (
    payment: AdminFormPayment,
    nextStatus: AdminFormPaymentStatus,
  ) => {
    if (payment.paymentStatus === nextStatus) {
      toast({
        title: "No change needed",
        description: `${displayFormLabel(payment)} is already ${
          nextStatus === "pending" ? "unpaid" : nextStatus
        }.`,
      });
      return;
    }

    updateMutation.mutate(
      {
        paymentId: payment.id,
        payload: { paymentStatus: nextStatus },
      },
      {
        onSuccess: (updatedPayment) => {
          toast({
            title:
              nextStatus === "paid"
                ? "Form payment marked paid"
                : "Form payment marked unpaid",
            description: `${displayFormLabel(updatedPayment)} is now ${
              nextStatus === "pending" ? "unpaid" : nextStatus
            }.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Update failed",
            description:
              error instanceof Error
                ? error.message
                : "Unable to update form payment.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const saveReview = (statusOverride?: AdminFormPaymentStatus) => {
    if (!activePayment) return;
    const nextStatus = statusOverride || reviewStatus;
    updateMutation.mutate(
      {
        paymentId: activePayment.id,
        payload: {
          paymentStatus: nextStatus,
          notes: reviewNotes,
        },
      },
      {
        onSuccess: (payment) => {
          toast({
            title: "Form payment updated",
            description: `${displayFormLabel(payment)} is now ${payment.paymentStatus}.`,
          });
          setSelectedPayment(payment);
        },
        onError: (error) => {
          toast({
            title: "Update failed",
            description:
              error instanceof Error
                ? error.message
                : "Unable to update form payment.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-emerald-100">
              <FileText className="h-4 w-4" />
              Member form payment control
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">
              Form Payment Tracker
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-50/80">
              Track membership registration and loan form fees from submitted
              member applications, review the form details, and keep payment
              status decisions documented.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm backdrop-blur">
            <p className="font-medium text-emerald-100">Current pricing</p>
            <div className="mt-3 grid gap-2 text-emerald-50">
              <span>Membership Registration: {formatCurrency(2000)}</span>
              <span>Revolving Loan: {formatCurrency(1000)}</span>
              <span>BSS Loan Form: {formatCurrency(2000)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Expected"
          value={formatCurrency(summary?.totalAmount ?? 0)}
          helper={`${summary?.totalRecords ?? 0} form payments`}
          tone="slate"
        />
        <StatCard
          label="Pending Review"
          value={formatCurrency(summary?.pendingAmount ?? 0)}
          helper={`${summary?.pendingCount ?? 0} pending records`}
          tone="amber"
        />
        <StatCard
          label="Paid"
          value={formatCurrency(summary?.paidAmount ?? 0)}
          helper={`${summary?.paidCount ?? 0} confirmed payments`}
          tone="emerald"
        />
        <StatCard
          label="Defaulted"
          value={formatCurrency(summary?.defaultedAmount ?? 0)}
          helper={`${summary?.defaultedCount ?? 0} issue records`}
          tone="red"
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-7">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search member, group, phone, email or reference"
              className="pl-9"
            />
          </div>
          <AdminGroupFilter
            value={groupId}
            onValueChange={setGroupId}
            allLabel="All groups"
            placeholder="Filter group"
          />
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
          <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as FilterValue<AdminFormPaymentStatus>)}>
            <SelectTrigger>
              <SelectValue placeholder="Payment status" />
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
            onValueChange={(value) => setSortBy(value as AdminFormPaymentSort)}
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
          <div className="grid grid-cols-2 gap-2">
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

        <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {paymentsQuery.isFetching
              ? "Refreshing form payment records..."
              : `${meta?.total ?? 0} ${
                  paymentStatus === "defaulted" ? "defaulted records" : "records"
                } found from ${formatPlainDate(fromDate)} to ${formatPlainDate(
                  toDate,
                )}`}
          </span>
          <div className="flex items-center gap-2">
            {paymentsQuery.isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            )}
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Clear filters
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={
                    Boolean(exportingFormat) ||
                    paymentsQuery.isFetching ||
                    (summary?.totalRecords ?? 0) === 0
                  }
                >
                  {exportingFormat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
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

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Payment Records</h3>
          <p className="text-sm text-gray-500">
            Pending records are created automatically when members submit the
            relevant application forms.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <AlertTriangle className="mx-auto h-10 w-10 text-red-300" />
                      <h4 className="mt-3 font-medium text-gray-900">
                        Unable to load form payments
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {paymentsQuery.error instanceof Error
                          ? paymentsQuery.error.message
                          : "Please refresh and try again."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paymentsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading form payments...
                    </div>
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <AlertTriangle className="mx-auto h-10 w-10 text-gray-300" />
                      <h4 className="mt-3 font-medium text-gray-900">
                        No form payments found
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        There is no payment data for the current filters. New
                        pending records will appear here when members submit
                        membership or loan forms.
                      </p>
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={resetFilters}
                        >
                          Reset filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {payment.memberName || "Unknown member"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.memberEmail || payment.memberPhone || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {payment.groupName || "No group"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.sourceReference || "-"}
                      </div>
                      {payment.transactionReference && (
                        <div className="text-xs font-medium text-emerald-600">
                          Tx: {payment.transactionReference}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {displayFormLabel(payment)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formTypeLabel(payment.formType)}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{statusBadge(payment.paymentStatus)}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {formatPlainDate(payment.submittedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Reviewed {formatPlainDate(payment.reviewedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Open actions for ${payment.memberName || "form payment"}`}
                            disabled={updateMutation.isPending}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openReview(payment)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updatePaymentStatus(payment, "paid")}
                            disabled={payment.paymentStatus === "paid"}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updatePaymentStatus(payment, "pending")
                            }
                            disabled={payment.paymentStatus === "pending"}
                          >
                            <Clock3 className="mr-2 h-4 w-4" />
                            Mark Unpaid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page <span className="font-medium text-gray-900">{page}</span> of{" "}
            <span className="font-medium text-gray-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || paymentsQuery.isFetching}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || paymentsQuery.isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 px-6 py-5">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Review Form Payment
            </DialogTitle>
            <DialogDescription>
              Inspect the submitted form details, add notes, and update the
              payment status.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] px-6 py-5">
            {!activePayment || detailsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment details...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">
                          {formTypeLabel(activePayment.formType)}
                        </p>
                        <h3 className="mt-1 text-xl font-bold text-gray-900">
                          {displayFormLabel(activePayment)}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Reference: {activePayment.sourceReference || "-"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-emerald-700">
                          Transaction:{" "}
                          {activePayment.transactionReference ||
                            "Pending sync"}
                        </p>
                      </div>
                      {statusBadge(activePayment.paymentStatus)}
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Amount
                        </p>
                        <p className="mt-1 text-lg font-bold text-gray-900">
                          {formatCurrency(activePayment.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Submitted
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {formatDateTime(activePayment.submittedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Reviewed
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {formatDateTime(activePayment.reviewedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-semibold text-amber-900">
                          Review guidance
                        </p>
                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          Mark as paid only after confirming the submitted form
                          and payment evidence. Use defaulted when payment or
                          form details are unresolved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <section className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Member</h4>
                  <DetailGrid
                    items={[
                      {
                        label: "Name",
                        value: activePayment.memberName || memberDetail.fullName,
                      },
                      {
                        label: "Email",
                        value: activePayment.memberEmail || memberDetail.email,
                      },
                      {
                        label: "Phone",
                        value: activePayment.memberPhone || memberDetail.phone,
                      },
                      { label: "Profile ID", value: activePayment.userId },
                      {
                        label: "Transaction Ref",
                        value: activePayment.transactionReference,
                      },
                      { label: "Date of Birth", value: memberDetail.dateOfBirth },
                      { label: "Address", value: memberDetail.address },
                      { label: "City", value: memberDetail.city },
                      { label: "State", value: memberDetail.state },
                      { label: "Occupation", value: memberDetail.occupation },
                      { label: "Employer", value: memberDetail.employer },
                      {
                        label: "Next of Kin",
                        value: memberDetail.nextOfKinName,
                      },
                      {
                        label: "Next of Kin Phone",
                        value: memberDetail.nextOfKinPhone,
                      },
                      {
                        label: "Next of Kin Relationship",
                        value: memberDetail.nextOfKinRelationship,
                      },
                    ]}
                  />
                </section>

                <section className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Group</h4>
                  <DetailGrid
                    items={[
                      {
                        label: "Group Name",
                        value: activePayment.groupName || groupDetail.name,
                      },
                      { label: "Group Number", value: groupDetail.number },
                      {
                        label: "Membership Status",
                        value: detail.membershipStatus,
                      },
                      { label: "Member Serial", value: detail.memberSerial },
                    ]}
                  />
                </section>

                {activePayment.formCategory === "loan" && (
                  <section className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Loan Form</h4>
                    <DetailGrid
                      items={[
                        { label: "Loan Code", value: detail.loanCode },
                        { label: "Loan Type", value: detail.loanLabel },
                        {
                          label: "Requested Amount",
                          value:
                            typeof detail.loanAmount === "number"
                              ? formatCurrency(detail.loanAmount)
                              : detail.loanAmount,
                        },
                        { label: "Purpose", value: detail.loanPurpose },
                        {
                          label: "Description",
                          value: detail.purposeDescription,
                        },
                        {
                          label: "Repayment Period",
                          value: detail.repaymentPeriod
                            ? `${detail.repaymentPeriod} months`
                            : null,
                        },
                        {
                          label: "Interest Rate",
                          value:
                            detail.interestRate === null ||
                            typeof detail.interestRate === "undefined"
                              ? null
                              : `${detail.interestRate}% ${detail.interestRateType || ""}`,
                        },
                        {
                          label: "Monthly Income",
                          value:
                            typeof detail.monthlyIncome === "number"
                              ? formatCurrency(detail.monthlyIncome)
                              : detail.monthlyIncome,
                        },
                      ]}
                    />
                  </section>
                )}

                {activePayment.formCategory === "loan" && (
                  <section className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Disbursement Account
                    </h4>
                    <DetailGrid
                      items={[
                        {
                          label: "Bank Name",
                          value: disbursementAccount.bankName,
                        },
                        {
                          label: "Account Number",
                          value: disbursementAccount.accountNumber,
                        },
                        {
                          label: "Account Name",
                          value: disbursementAccount.accountName,
                        },
                      ]}
                    />
                  </section>
                )}

                {documents.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Documents ({documents.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((document, index) => (
                            <TableRow key={`${document.name}-${index}`}>
                              <TableCell className="font-medium">
                                {formatDetailValue(document.name)}
                              </TableCell>
                              <TableCell>
                                {formatDetailValue(
                                  document.documentType || document.type,
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDetailValue(document.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                )}

                {guarantors.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Guarantors ({guarantors.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Liability</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {guarantors.map((guarantor, index) => (
                            <TableRow key={`${guarantor.name}-${index}`}>
                              <TableCell className="font-medium">
                                {formatDetailValue(guarantor.name)}
                              </TableCell>
                              <TableCell>
                                {formatDetailValue(guarantor.type)}
                              </TableCell>
                              <TableCell>
                                {formatDetailValue(
                                  guarantor.email || guarantor.phone,
                                )}
                              </TableCell>
                              <TableCell>
                                {guarantor.liabilityPercentage
                                  ? `${guarantor.liabilityPercentage}%`
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Admin Review</h4>
                  <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={reviewStatus}
                        onValueChange={(value) =>
                          setReviewStatus(value as AdminFormPaymentStatus)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="defaulted">Defaulted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={reviewNotes}
                        onChange={(event) => setReviewNotes(event.target.value)}
                        placeholder="Add review notes, payment confirmation reference, or default reason."
                        rows={4}
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2 border-t border-gray-100 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeReview}
              disabled={updateMutation.isPending}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => saveReview("defaulted")}
              disabled={!activePayment || updateMutation.isPending}
            >
              Mark Defaulted
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => saveReview("paid")}
              disabled={!activePayment || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark Paid
            </Button>
            <Button
              type="button"
              onClick={() => saveReview()}
              disabled={!activePayment || updateMutation.isPending}
            >
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
