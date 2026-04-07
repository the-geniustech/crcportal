import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserRole } from "@/lib/auth";
import {
  LOAN_FACILITIES,
  formatInterestLabel,
  type LoanFacilityKey,
} from "@/lib/loanPolicy";

interface GroupLoan {
  id: string;
  borrowerId?: string | null;
  loanCode?: string | null;
  loanType?: string | null;
  loanAmount: number;
  groupName?: string | null;
  borrowerName?: string | null;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
  approvedAmount?: number | null;
  approvedInterestRate?: number | null;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  totalRepayable?: number | null;
  remainingBalance?: number | null;
  repaymentToDate?: number | null;
  status: string;
  createdAt?: string;
  disbursedAt?: string | null;
  updatedAt?: string;
}

interface GroupLoanDashboardModalProps {
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
  loans: GroupLoan[];
  loansLoading?: boolean;
  currentMemberRole?: string | null;
}

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "approved", label: "Approved" },
  { value: "overdue", label: "Overdue" },
  { value: "repaid", label: "Repaid" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

const loanTypeStyles: Record<LoanFacilityKey, { badge: string }> = {
  revolving: {
    badge: "bg-emerald-100 text-emerald-700",
  },
  special: {
    badge: "bg-blue-100 text-blue-700",
  },
  bridging: {
    badge: "bg-amber-100 text-amber-700",
  },
  soft: {
    badge: "bg-purple-100 text-purple-700",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return currencyFormatter.format(safe);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeLoanType = (value?: string | null): LoanFacilityKey => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "revolving";
  if (raw.includes("revolv")) return "revolving";
  if (raw.includes("special")) return "special";
  if (raw.includes("bridg") || raw.includes("bridge")) return "bridging";
  if (raw.includes("soft")) return "soft";
  return "revolving";
};

const getLoanStatusKey = (status?: string | null) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (["overdue", "defaulted", "default"].includes(normalized)) return "overdue";
  if (["completed", "repaid", "closed", "paid"].includes(normalized)) return "repaid";
  if (["disbursed", "active"].includes(normalized)) return "active";
  if (["approved"].includes(normalized)) return "approved";
  if (["pending", "under_review", "review"].includes(normalized)) return "pending";
  if (["rejected", "declined", "cancelled"].includes(normalized)) return "rejected";
  return "unknown";
};

const loanStatusMeta = (status?: string | null) => {
  const key = getLoanStatusKey(status);
  switch (key) {
    case "active":
      return {
        label: "Active",
        classes: "bg-emerald-100 text-emerald-700",
        icon: CreditCard,
      };
    case "approved":
      return {
        label: "Approved",
        classes: "bg-blue-100 text-blue-700",
        icon: Wallet,
      };
    case "overdue":
      return {
        label: "Overdue",
        classes: "bg-red-100 text-red-700",
        icon: AlertTriangle,
      };
    case "repaid":
      return {
        label: "Repaid",
        classes: "bg-gray-100 text-gray-700",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        label: "Rejected",
        classes: "bg-slate-100 text-slate-600",
        icon: X,
      };
    case "pending":
      return {
        label: "Pending",
        classes: "bg-amber-100 text-amber-700",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "In Review",
        classes: "bg-gray-100 text-gray-600",
        icon: AlertTriangle,
      };
  }
};

const buildSummary = (loans: Array<GroupLoan & { typeKey: LoanFacilityKey }>) => {
  return loans.reduce(
    (acc, loan) => {
      const statusKey = getLoanStatusKey(loan.status);
      const principal = Number(loan.approvedAmount ?? loan.loanAmount ?? 0);
      const remaining =
        loan.remainingBalance === null || loan.remainingBalance === undefined
          ? null
          : Number(loan.remainingBalance);
      const totalRepayable = Number(loan.totalRepayable ?? 0);
      const repaymentToDate =
        loan.repaymentToDate != null
          ? Number(loan.repaymentToDate)
          : totalRepayable > 0 && remaining !== null
            ? Math.max(0, totalRepayable - remaining)
            : null;

      acc.total += 1;
      acc.totalApproved += principal;
      if (statusKey === "overdue") acc.overdue += 1;
      if (statusKey === "active") acc.active += 1;
      if (statusKey === "repaid") acc.repaid += 1;
      if (repaymentToDate != null && Number.isFinite(repaymentToDate)) {
        acc.repaidToDate += repaymentToDate;
      }
      if (statusKey !== "repaid" && statusKey !== "rejected") {
        acc.outstanding += Math.max(remaining ?? 0, 0);
      }
      return acc;
    },
    {
      total: 0,
      active: 0,
      overdue: 0,
      repaid: 0,
      totalApproved: 0,
      outstanding: 0,
      repaidToDate: 0,
    },
  );
};

const GroupLoanDashboardModal: React.FC<GroupLoanDashboardModalProps> = ({
  isOpen,
  onClose,
  group,
  loans,
  loansLoading = false,
  currentMemberRole,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] =
    useState<LoanFacilityKey>("revolving");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const normalizedMemberRole = String(currentMemberRole || "").toLowerCase();
  const hasElevatedMembership = ["coordinator", "treasurer", "secretary", "admin"].includes(
    normalizedMemberRole,
  );
  const canViewAll =
    hasUserRole(user, "admin", "groupCoordinator", "group_coordinator") ||
    hasElevatedMembership;
  const scopedBorrowerId = profile?.id ? String(profile.id) : null;
  const scopedLoans = useMemo(() => {
    if (canViewAll) return loans;
    if (!scopedBorrowerId) return [];
    return loans.filter(
      (loan) => String(loan.borrowerId ?? "") === scopedBorrowerId,
    );
  }, [loans, canViewAll, scopedBorrowerId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedType("revolving");
      setSearchQuery("");
      setStatusFilter("all");
    }
  }, [isOpen]);

  const normalizedLoans = useMemo(
    () =>
      scopedLoans.map((loan) => ({
        ...loan,
        typeKey: normalizeLoanType(loan.loanType),
      })),
    [scopedLoans],
  );

  const filteredLoans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return normalizedLoans.filter((loan) => {
      if (loan.typeKey !== selectedType) return false;
      if (statusFilter !== "all" && getLoanStatusKey(loan.status) !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const loanLabel =
        loan.loanCode || `LN-${String(loan.id).slice(-6).toUpperCase()}`;
      const haystack = [
        loanLabel,
        loan.status || "",
        loan.loanType || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [normalizedLoans, selectedType, statusFilter, searchQuery]);

  const sortedLoans = useMemo(() => {
    return [...filteredLoans].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredLoans]);

  const selectedSummary = useMemo(() => {
    const subset = normalizedLoans.filter((loan) => loan.typeKey === selectedType);
    return buildSummary(subset);
  }, [normalizedLoans, selectedType]);

  const totalsByType = useMemo(() => {
    return LOAN_FACILITIES.map((facility) => {
      const subset = normalizedLoans.filter(
        (loan) => loan.typeKey === facility.key,
      );
      return {
        facility,
        summary: buildSummary(subset),
      };
    });
  }, [normalizedLoans]);

  const resolveLoanDisplay = (loan: GroupLoan & { typeKey: LoanFacilityKey }) => {
    const principal = Number(loan.approvedAmount ?? loan.loanAmount ?? 0);
    const remaining =
      loan.remainingBalance === null || loan.remainingBalance === undefined
        ? null
        : Number(loan.remainingBalance);
    const facility =
      LOAN_FACILITIES.find((item) => item.key === loan.typeKey) || null;
    const rateValue = loan.approvedInterestRate ?? loan.interestRate ?? null;
    const resolvedRate =
      rateValue != null && Number.isFinite(Number(rateValue))
        ? Number(rateValue)
        : null;
    const rateType = (loan.interestRateType ||
      facility?.interestRateType ||
      "annual") as "annual" | "monthly" | "total";
    const interestLabel =
      resolvedRate != null
        ? formatInterestLabel(resolvedRate, rateType)
        : facility?.interestRateRange
          ? formatInterestLabel(
              facility.interestRateRange.min,
              rateType,
              facility.interestRateRange,
            )
          : "-";
    const totalRepayable = Number(loan.totalRepayable ?? 0);
    const repaymentToDate =
      loan.repaymentToDate != null
        ? Number(loan.repaymentToDate)
        : totalRepayable > 0 && remaining !== null
          ? Math.max(0, totalRepayable - remaining)
          : null;
    const progressRaw =
      remaining === null || principal <= 0
        ? null
        : ((principal - remaining) / principal) * 100;
    const progressValue =
      progressRaw === null
        ? null
        : Math.min(100, Math.max(0, progressRaw));

    return {
      principal,
      remaining,
      facility,
      interestLabel,
      repaymentToDate,
      progressValue,
    };
  };

  const csvEscape = (value: unknown) => {
    const raw = String(value ?? "");
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const handleExportCsv = () => {
    if (!group) return;
    setIsExportingCsv(true);

    try {
      const headers = [
        "Loan Code",
        "Loan Type",
        "Borrower Name",
        "Borrower Email",
        "Borrower Phone",
        "Group Name",
        "Principal",
        "Approved Amount",
        "Interest Rate",
        "Remaining Balance",
        "Repaid So Far",
        "Status",
        "Progress",
        "Disbursed At",
        "Updated At",
      ];

      const totals = sortedLoans.reduce(
        (acc, loan) => {
          const { remaining, repaymentToDate } = resolveLoanDisplay(loan);
          acc.principal += Number(loan.loanAmount ?? 0);
          acc.approved += Number(loan.approvedAmount ?? 0);
          acc.remaining += Number(remaining ?? 0);
          acc.repaid += Number(repaymentToDate ?? 0);
          return acc;
        },
        { principal: 0, approved: 0, remaining: 0, repaid: 0 },
      );

      const rows = sortedLoans.map((loan) => {
        const loanLabel =
          loan.loanCode || `LN-${String(loan.id).slice(-6).toUpperCase()}`;
        const { facility, remaining, interestLabel, repaymentToDate, progressValue } =
          resolveLoanDisplay(loan);
        return [
          loanLabel,
          facility?.name || "Loan",
          loan.borrowerName || "-",
          loan.borrowerEmail || "-",
          loan.borrowerPhone || "-",
          loan.groupName || group.name,
          formatCurrency(loan.loanAmount),
          loan.approvedAmount != null
            ? formatCurrency(loan.approvedAmount)
            : "-",
          interestLabel,
          remaining !== null ? formatCurrency(remaining) : "-",
          repaymentToDate != null ? formatCurrency(repaymentToDate) : "-",
          loan.status || "-",
          progressValue === null ? "-" : `${Math.round(progressValue)}%`,
          formatDate(loan.disbursedAt),
          formatDate(loan.updatedAt || loan.createdAt),
        ];
      });

      const totalsRow = [
        "Totals",
        `${sortedLoans.length} loans`,
        "-",
        "-",
        "-",
        "-",
        formatCurrency(totals.principal),
        formatCurrency(totals.approved),
        "-",
        formatCurrency(totals.remaining),
        formatCurrency(totals.repaid),
        "-",
        "-",
        "-",
        "-",
      ];

      const csvBody = [headers, ...rows, totalsRow]
        .map((row) => row.map((value) => csvEscape(value)).join(","))
        .join("\n");
      const csv = `\uFEFF${csvBody}`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.href = url;
      link.download = `loan-ledger-${safeName}-${selectedType}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Loan ledger exported as CSV.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unable to export CSV",
        variant: "destructive",
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (!isOpen || !group) return null;

  const selectedFacility =
    LOAN_FACILITIES.find((facility) => facility.key === selectedType) || null;
  const updatedLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const summaryTotalLabel = loansLoading ? "-" : selectedSummary.total;
  const summaryApprovedLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.totalApproved);
  const summaryOutstandingLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.outstanding);
  const summaryRepaidToDateLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.repaidToDate);
  const summaryActiveLabel = loansLoading ? "-" : selectedSummary.active;
  const summaryOverdueLabel = loansLoading ? "-" : selectedSummary.overdue;
  const summaryRepaidLabel = loansLoading ? "-" : selectedSummary.repaid;

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
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            aria-label="Close loan dashboard"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                Loan Tracking Dashboard
              </span>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {group.name}
                  </h2>
                  <p className="text-sm text-emerald-100">
                    {selectedFacility?.name || "Loan Portfolio"} |{" "}
                    {summaryTotalLabel} loans
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!canViewAll && (
                    <span className="rounded-full border border-amber-200/40 bg-amber-100/20 px-4 py-2 text-xs font-semibold text-amber-100">
                      Showing your data only
                    </span>
                  )}
                  <span className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
                    Updated {updatedLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {LOAN_FACILITIES.map((facility) => (
                  <button
                    key={facility.key}
                    onClick={() => setSelectedType(facility.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedType === facility.key
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {facility.name}
                  </button>
                ))}
              </div>
              <div className="flex w-full max-w-2xl items-center gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search loans..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleExportCsv}
                  disabled={isExportingCsv || loansLoading}
                >
                  <Download className="h-4 w-4" />
                  {isExportingCsv ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Total Loans
                  </p>
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {summaryTotalLabel}
                </p>
                <p className="text-xs text-gray-500">
                  {summaryActiveLabel} active | {summaryRepaidLabel} repaid
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Approved Volume
                  </p>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {summaryApprovedLabel}
                </p>
                <p className="text-xs text-gray-500">
                  Principal approved for {selectedFacility?.name || "loans"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Repaid So Far
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {summaryRepaidToDateLabel}
                </p>
                <p className="text-xs text-gray-500">
                  Total repayments recorded
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Outstanding
                  </p>
                  <CreditCard className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {summaryOutstandingLabel}
                </p>
                <p className="text-xs text-gray-500">Active balance due</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Risk Watch
                  </p>
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                  {summaryOverdueLabel}
                </p>
                <p className="text-xs text-gray-500">
                  Loans in overdue status
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Totals by Loan Type
                  </p>
                  <p className="text-xs text-gray-500">
                    Tracking totals across all four loan facilities in the same
                    format.
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  Portfolio snapshot
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {totalsByType.map(({ facility, summary }) => (
                  <div
                    key={facility.key}
                    className={`rounded-xl border px-4 py-3 ${
                      selectedType === facility.key
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {facility.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          loanTypeStyles[facility.key].badge
                        }`}
                      >
                        {summary.total} loans
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Approved</span>
                        <span className="font-semibold text-gray-900">
                          {loansLoading ? "-" : formatCurrency(summary.totalApproved)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstanding</span>
                        <span className="font-semibold text-amber-600">
                          {loansLoading ? "-" : formatCurrency(summary.outstanding)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overdue</span>
                        <span
                          className={`font-semibold ${
                            summary.overdue > 0
                              ? "text-rose-600"
                              : "text-gray-700"
                          }`}
                        >
                          {loansLoading ? "-" : summary.overdue}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Loan Portfolio Ledger
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedFacility?.name || "Loan"} tracking for{" "}
                    {group.name}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {loansLoading ? "-" : `${sortedLoans.length} loan record(s)`}
                </div>
              </div>

              {loansLoading ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Loading loan dashboard...
                </div>
              ) : sortedLoans.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  No loans found for the current selection.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1500px] w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Loan
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Borrower
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Principal
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Approved
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Interest Rate
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Remaining
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Repaid So Far
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Progress
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Disbursed
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedLoans.map((loan) => {
                        const principal = Number(
                          loan.approvedAmount ?? loan.loanAmount ?? 0,
                        );
                        const remaining =
                          loan.remainingBalance === null ||
                          loan.remainingBalance === undefined
                            ? null
                            : Number(loan.remainingBalance);
                        const progressRaw =
                          remaining === null || principal <= 0
                            ? null
                            : ((principal - remaining) / principal) * 100;
                        const progressValue =
                          progressRaw === null
                            ? null
                            : Math.min(100, Math.max(0, progressRaw));
                        const status = loanStatusMeta(loan.status);
                        const StatusIcon = status.icon;
                        const loanLabel =
                          loan.loanCode ||
                          `LN-${String(loan.id).slice(-6).toUpperCase()}`;
                        const facility =
                          LOAN_FACILITIES.find(
                            (item) => item.key === loan.typeKey,
                          ) || null;
                        const typeStyle = loanTypeStyles[loan.typeKey];
                        const rateValue =
                          loan.approvedInterestRate ?? loan.interestRate ?? null;
                        const rateType = (loan.interestRateType ||
                          facility?.interestRateType ||
                          "annual") as "annual" | "monthly" | "total";
                        const interestLabel =
                          rateValue != null
                            ? formatInterestLabel(
                                rateValue,
                                rateType,
                              )
                            : facility?.interestRateRange
                              ? formatInterestLabel(
                                  facility.interestRateRange.min,
                                  rateType,
                                  facility.interestRateRange,
                                )
                              : "-";
                        const repaymentToDate =
                          loan.repaymentToDate != null
                            ? loan.repaymentToDate
                            : loan.totalRepayable != null && remaining !== null
                              ? Math.max(0, loan.totalRepayable - remaining)
                              : null;

                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {loanLabel}
                              </p>
                              <p className="text-xs text-gray-500">
                                Created {formatDate(loan.createdAt)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {loan.borrowerName || "Member"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {loan.groupName || group.name}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="space-y-1 text-xs">
                                <p>{loan.borrowerEmail || "-"}</p>
                                <p>{loan.borrowerPhone || "-"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyle.badge}`}
                              >
                                {facility?.name || "Loan"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {formatCurrency(loan.loanAmount)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {loan.approvedAmount != null
                                ? formatCurrency(loan.approvedAmount)
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {interestLabel}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {remaining !== null
                                ? formatCurrency(remaining)
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {repaymentToDate != null
                                ? formatCurrency(repaymentToDate)
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.classes}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {progressValue === null ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <div className="min-w-[120px]">
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{Math.round(progressValue)}%</span>
                                    <span>
                                      {progressValue >= 100
                                        ? "Complete"
                                        : "In progress"}
                                    </span>
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                                    <div
                                      className="h-1.5 rounded-full bg-emerald-500"
                                      style={{ width: `${progressValue}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatDate(loan.disbursedAt)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatDate(loan.updatedAt || loan.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupLoanDashboardModal;
