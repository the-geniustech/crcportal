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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserRole } from "@/lib/auth";
import { USER_ROLE, ELEVATED_GROUP_ROLES, type GroupRole } from "@/lib/roles";
import {
  LOAN_FACILITIES,
  formatInterestLabel,
  type LoanFacilityKey,
} from "@/lib/loanPolicy";
import { downloadGroupLoanLedgerExport } from "@/lib/groups";

interface GroupLoan {
  id: string;
  borrowerId?: string | null;
  memberSerial?: string | null;
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
  remainingPrincipalBalance?: number | null;
  remainingInterestBalance?: number | null;
  repaidPrincipalToDate?: number | null;
  repaidInterestToDate?: number | null;
  interestPatronageAccrued?: number | null;
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
  currentMemberRole?: GroupRole | null;
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

const LOAN_SORT_OPTIONS = [
  { value: "updated_desc", label: "Recently Updated" },
  { value: "updated_asc", label: "Oldest Updated" },
  { value: "name_asc", label: "Borrower A-Z" },
  { value: "name_desc", label: "Borrower Z-A" },
  { value: "serial_asc", label: "Serial Asc" },
  { value: "serial_desc", label: "Serial Desc" },
  { value: "principal_desc", label: "Principal Highest" },
  { value: "principal_asc", label: "Principal Lowest" },
  { value: "outstanding_desc", label: "Outstanding Highest" },
  { value: "outstanding_asc", label: "Outstanding Lowest" },
  { value: "repaid_desc", label: "Repaid Highest" },
  { value: "repaid_asc", label: "Repaid Lowest" },
] as const;

type LoanSortOption = (typeof LOAN_SORT_OPTIONS)[number]["value"];

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

const loanSortCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

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
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "revolving";
  if (raw.includes("revolv")) return "revolving";
  if (raw.includes("special")) return "special";
  if (raw.includes("bridg") || raw.includes("bridge")) return "bridging";
  if (raw.includes("soft")) return "soft";
  return "revolving";
};

const getLoanStatusKey = (status?: string | null) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "unknown";
  if (["overdue", "defaulted", "default"].includes(normalized))
    return "overdue";
  if (["completed", "repaid", "closed", "paid"].includes(normalized))
    return "repaid";
  if (["disbursed", "active"].includes(normalized)) return "active";
  if (["approved"].includes(normalized)) return "approved";
  if (["pending", "under_review", "review"].includes(normalized))
    return "pending";
  if (["rejected", "declined", "cancelled"].includes(normalized))
    return "rejected";
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

const roundMoney = (value: number) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const deriveRepaymentBreakdown = ({
  principal,
  totalRepayable,
  totalRepaid,
}: {
  principal: number;
  totalRepayable: number | null;
  totalRepaid: number;
}) => {
  const safePrincipal = Math.max(0, roundMoney(principal));
  const safeTotalRepayable =
    totalRepayable != null
      ? Math.max(safePrincipal, roundMoney(totalRepayable))
      : safePrincipal;
  const totalInterest = Math.max(
    0,
    roundMoney(safeTotalRepayable - safePrincipal),
  );
  const safeTotalRepaid = Math.max(
    0,
    Math.min(roundMoney(totalRepaid), safeTotalRepayable),
  );
  const repaidInterest = Math.min(safeTotalRepaid, totalInterest);
  const repaidPrincipal = Math.min(
    safePrincipal,
    Math.max(0, roundMoney(safeTotalRepaid - repaidInterest)),
  );

  return {
    repaidPrincipal: roundMoney(repaidPrincipal),
    repaidInterest: roundMoney(repaidInterest),
    remainingPrincipal: roundMoney(
      Math.max(0, safePrincipal - repaidPrincipal),
    ),
    remainingInterest: roundMoney(Math.max(0, totalInterest - repaidInterest)),
  };
};

const resolveLoanDisplay = (loan: GroupLoan & { typeKey: LoanFacilityKey }) => {
  const principal = Math.max(
    0,
    roundMoney(toOptionalNumber(loan.approvedAmount) ?? loan.loanAmount ?? 0),
  );
  const remainingBalance = toOptionalNumber(loan.remainingBalance);
  const totalRepayable = toOptionalNumber(loan.totalRepayable);
  const fallbackRepaymentToDate =
    toOptionalNumber(loan.repaymentToDate) ??
    (totalRepayable != null && remainingBalance != null
      ? roundMoney(Math.max(0, totalRepayable - remainingBalance))
      : 0);
  const fallbackSplit = deriveRepaymentBreakdown({
    principal,
    totalRepayable,
    totalRepaid: fallbackRepaymentToDate,
  });
  const repaidPrincipal = roundMoney(
    toOptionalNumber(loan.repaidPrincipalToDate) ??
      fallbackSplit.repaidPrincipal,
  );
  const repaidInterest = roundMoney(
    toOptionalNumber(loan.repaidInterestToDate) ?? fallbackSplit.repaidInterest,
  );
  const remainingPrincipal = roundMoney(
    toOptionalNumber(loan.remainingPrincipalBalance) ??
      fallbackSplit.remainingPrincipal,
  );
  const remainingInterest = roundMoney(
    toOptionalNumber(loan.remainingInterestBalance) ??
      fallbackSplit.remainingInterest,
  );
  const remaining =
    remainingBalance != null
      ? roundMoney(Math.max(0, remainingBalance))
      : roundMoney(remainingPrincipal + remainingInterest);
  const repaymentToDate =
    toOptionalNumber(loan.repaymentToDate) ??
    roundMoney(repaidPrincipal + repaidInterest);
  const interestPatronage = roundMoney(
    toOptionalNumber(loan.interestPatronageAccrued) ?? repaidInterest * 0.03,
  );
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
  const progressBase =
    totalRepayable != null && totalRepayable > 0 ? totalRepayable : principal;
  const progressNumerator =
    totalRepayable != null && totalRepayable > 0
      ? repaymentToDate
      : repaidPrincipal;
  const progressValue =
    progressBase > 0
      ? Math.min(100, Math.max(0, (progressNumerator / progressBase) * 100))
      : null;

  return {
    principal,
    remaining,
    remainingPrincipal,
    remainingInterest,
    facility,
    interestLabel,
    repaymentToDate,
    repaidPrincipal,
    repaidInterest,
    interestPatronage,
    progressValue,
  };
};

const buildSummary = (
  loans: Array<GroupLoan & { typeKey: LoanFacilityKey }>,
) => {
  return loans.reduce(
    (acc, loan) => {
      const statusKey = getLoanStatusKey(loan.status);
      const {
        principal,
        remaining,
        repaymentToDate,
        repaidPrincipal,
        repaidInterest,
        interestPatronage,
      } = resolveLoanDisplay(loan);

      acc.total += 1;
      acc.totalPrincipal += principal;
      if (statusKey === "overdue") acc.overdue += 1;
      if (statusKey === "active") acc.active += 1;
      if (statusKey === "repaid") acc.repaid += 1;
      if (repaymentToDate != null && Number.isFinite(repaymentToDate)) {
        acc.repaidToDate += repaymentToDate;
      }
      acc.repaidPrincipal += repaidPrincipal;
      acc.repaidInterest += repaidInterest;
      acc.patronage += interestPatronage;
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
      totalPrincipal: 0,
      outstanding: 0,
      repaidToDate: 0,
      repaidPrincipal: 0,
      repaidInterest: 0,
      patronage: 0,
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
  const [sortBy, setSortBy] = useState<LoanSortOption>("updated_desc");
  const [exportingFormat, setExportingFormat] = useState<
    null | "csv" | "pdf" | "xlsx"
  >(null);
  const normalizedMemberRole = currentMemberRole ?? null;
  const hasElevatedMembership = normalizedMemberRole
    ? ELEVATED_GROUP_ROLES.includes(normalizedMemberRole)
    : false;
  const canViewAll =
    hasUserRole(user, USER_ROLE.ADMIN, USER_ROLE.GROUP_COORDINATOR) ||
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
      setSortBy("updated_desc");
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
      if (
        statusFilter !== "all" &&
        getLoanStatusKey(loan.status) !== statusFilter
      ) {
        return false;
      }
      if (!query) return true;
      const loanLabel =
        loan.loanCode || `LN-${String(loan.id).slice(-6).toUpperCase()}`;
      const haystack = [
        loanLabel,
        loan.borrowerName || "",
        loan.borrowerEmail || "",
        loan.borrowerPhone || "",
        loan.memberSerial || "",
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
      const leftDisplay = resolveLoanDisplay(a);
      const rightDisplay = resolveLoanDisplay(b);
      switch (sortBy) {
        case "updated_asc":
          return (
            new Date(a.updatedAt || a.createdAt || 0).getTime() -
            new Date(b.updatedAt || b.createdAt || 0).getTime()
          );
        case "name_asc":
          return loanSortCollator.compare(
            a.borrowerName || "",
            b.borrowerName || "",
          );
        case "name_desc":
          return loanSortCollator.compare(
            b.borrowerName || "",
            a.borrowerName || "",
          );
        case "serial_asc":
          return loanSortCollator.compare(
            a.memberSerial || "",
            b.memberSerial || "",
          );
        case "serial_desc":
          return loanSortCollator.compare(
            b.memberSerial || "",
            a.memberSerial || "",
          );
        case "principal_desc":
          return rightDisplay.principal - leftDisplay.principal;
        case "principal_asc":
          return leftDisplay.principal - rightDisplay.principal;
        case "outstanding_desc":
          return rightDisplay.remaining - leftDisplay.remaining;
        case "outstanding_asc":
          return leftDisplay.remaining - rightDisplay.remaining;
        case "repaid_desc":
          return rightDisplay.repaymentToDate - leftDisplay.repaymentToDate;
        case "repaid_asc":
          return leftDisplay.repaymentToDate - rightDisplay.repaymentToDate;
        case "updated_desc":
        default:
          return (
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
          );
      }
    });
  }, [filteredLoans, sortBy]);

  const selectedSummary = useMemo(() => {
    const subset = normalizedLoans.filter(
      (loan) => loan.typeKey === selectedType,
    );
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

  const handleExport = async (format: "csv" | "pdf" | "xlsx") => {
    if (!group) return;
    setExportingFormat(format);

    try {
      const response = await downloadGroupLoanLedgerExport(group.id, {
        loanType: selectedType,
        status: statusFilter,
        search: searchQuery || undefined,
        sortBy,
        format,
      });

      const url = URL.createObjectURL(response.blob);
      const link = document.createElement("a");
      const safeName = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.href = url;
      link.download =
        response.filename ||
        `loan-ledger-${safeName}-${selectedType}-${new Date()
          .toISOString()
          .slice(0, 10)}.${format}`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Loan ledger exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : `Unable to export ${format}`,
        variant: "destructive",
      });
    } finally {
      setExportingFormat(null);
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
  const summaryPrincipalLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.totalPrincipal);
  const summaryOutstandingLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.outstanding);
  const summaryRepaidToDateLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.repaidToDate);
  const summaryPatronageLabel = loansLoading
    ? "-"
    : formatCurrency(selectedSummary.patronage);
  const summaryActiveLabel = loansLoading ? "-" : selectedSummary.active;
  const summaryOverdueLabel = loansLoading ? "-" : selectedSummary.overdue;
  const summaryRepaidLabel = loansLoading ? "-" : selectedSummary.repaid;

  return (
    <div className="z-50 fixed inset-0 bg-slate-950/60">
      <div className="flex flex-col bg-slate-50 w-full h-full">
        <div className="relative">
          <div className="w-full h-48 overflow-hidden">
            <img
              src={group.image}
              alt={group.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
          </div>
          <button
            onClick={onClose}
            className="top-6 right-6 absolute bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition"
            aria-label="Close loan dashboard"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="right-6 bottom-6 left-6 absolute">
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-emerald-200 text-xs uppercase tracking-[0.3em]">
                Loan Tracking Dashboard
              </span>
              <div className="flex lg:flex-row flex-col lg:justify-between lg:items-end gap-2">
                <div>
                  <h2 className="font-bold text-white text-2xl">
                    {group.name}
                  </h2>
                  <p className="text-emerald-100 text-sm">
                    {selectedFacility?.name || "Loan Portfolio"} |{" "}
                    {summaryTotalLabel} loans
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!canViewAll && (
                    <span className="bg-amber-100/20 px-4 py-2 border border-amber-200/40 rounded-full font-semibold text-amber-100 text-xs">
                      Showing your data only
                    </span>
                  )}
                  <span className="bg-white/10 px-4 py-2 border border-white/30 rounded-full font-semibold text-white text-xs">
                    Updated {updatedLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 mx-auto px-6 py-6 w-full max-w[1500px]">
            <div className="flex flex-wrap justify-between items-center gap-4">
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
              <div className="flex flex-wrap items-center gap-3 w-full max-w-4xl">
                <div className="relative w-full max-w-xs">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
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
                  className="bg-white px-4 py-2 border border-slate-200 rounded-full font-semibold text-gray-600 text-xs"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as LoanSortOption)
                  }
                  className="bg-white px-4 py-2 border border-slate-200 rounded-full font-semibold text-gray-600 text-xs"
                >
                  {LOAN_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={!!exportingFormat || loansLoading}
                    >
                      <Download className="w-4 h-4" />
                      {exportingFormat ? "Exporting..." : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => void handleExport("csv")}
                      disabled={exportingFormat === "csv"}
                    >
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleExport("pdf")}
                      disabled={exportingFormat === "pdf"}
                    >
                      Export PDF
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

            <div className="gap-4 grid md:grid-cols-2 xl:grid-cols-5">
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Total Loans
                  </p>
                  <Wallet className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="mt-2 font-semibold text-gray-900 text-2xl">
                  {summaryTotalLabel}
                </p>
                <p className="text-gray-500 text-xs">
                  {summaryActiveLabel} active | {summaryRepaidLabel} repaid
                </p>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Principal Volume
                  </p>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="mt-2 font-semibold text-emerald-600 text-2xl">
                  {summaryPrincipalLabel}
                </p>
                <p className="text-gray-500 text-xs">
                  Principal booked for {selectedFacility?.name || "loans"}
                </p>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Repaid So Far
                  </p>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="mt-2 font-semibold text-emerald-600 text-2xl">
                  {summaryRepaidToDateLabel}
                </p>
                <p className="text-gray-500 text-xs">
                  Includes patronage accrual of {summaryPatronageLabel}
                </p>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Outstanding
                  </p>
                  <CreditCard className="w-4 h-4 text-amber-500" />
                </div>
                <p className="mt-2 font-semibold text-gray-900 text-2xl">
                  {summaryOutstandingLabel}
                </p>
                <p className="text-gray-500 text-xs">Active balance due</p>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Risk Watch
                  </p>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="mt-2 font-semibold text-rose-600 text-2xl">
                  {summaryOverdueLabel}
                </p>
                <p className="text-gray-500 text-xs">Loans in overdue status</p>
              </div>
            </div>

            <div className="bg-white shadow-sm p-5 border border-slate-200 rounded-2xl">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    Totals by Loan Type
                  </p>
                  <p className="text-gray-500 text-xs">
                    Tracking totals across all four loan facilities in the same
                    format.
                  </p>
                </div>
                <span className="text-gray-400 text-xs">
                  Portfolio snapshot
                </span>
              </div>
              <div className="gap-4 grid md:grid-cols-2 xl:grid-cols-4">
                {totalsByType.map(({ facility, summary }) => (
                  <div
                    key={facility.key}
                    className={`rounded-xl border px-4 py-3 ${
                      selectedType === facility.key
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
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
                    <div className="space-y-1 mt-3 text-gray-500 text-xs">
                      <div className="flex justify-between">
                        <span>Principal</span>
                        <span className="font-semibold text-gray-900">
                          {loansLoading
                            ? "-"
                            : formatCurrency(summary.totalPrincipal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstanding</span>
                        <span className="font-semibold text-amber-600">
                          {loansLoading
                            ? "-"
                            : formatCurrency(summary.outstanding)}
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

            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl">
              <div className="flex flex-wrap justify-between items-center gap-3 px-5 py-4 border-slate-200 border-b">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    Loan Portfolio Ledger
                  </p>
                  <p className="text-gray-500 text-xs">
                    {selectedFacility?.name || "Loan"} tracking for {group.name}
                  </p>
                </div>
                <div className="text-gray-500 text-xs">
                  {loansLoading ? "-" : `${sortedLoans.length} loan record(s)`}
                </div>
              </div>

              {loansLoading ? (
                <div className="py-16 text-gray-500 text-sm text-center">
                  Loading loan dashboard...
                </div>
              ) : sortedLoans.length === 0 ? (
                <div className="py-16 text-gray-500 text-sm text-center">
                  No loans found for the current selection.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1800px] text-sm">
                    <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase">
                      <tr>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Loan
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Borrower
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Contact
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Type
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-right"
                        >
                          Principal
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Interest Rate
                        </th>
                        <th
                          colSpan={2}
                          className="px-4 py-3 font-semibold text-center"
                        >
                          Remaining
                        </th>
                        <th
                          colSpan={2}
                          className="px-4 py-3 font-semibold text-center"
                        >
                          Repaid So Far
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-right"
                        >
                          Interest Patronage
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Status
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Progress
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Disbursed
                        </th>
                        <th
                          rowSpan={2}
                          className="px-4 py-3 font-semibold text-left"
                        >
                          Updated
                        </th>
                      </tr>
                      <tr>
                        <th className="px-4 py-3 font-semibold text-right">
                          Principal Due
                        </th>
                        <th className="px-4 py-3 font-semibold text-right">
                          Interest Due
                        </th>
                        <th className="px-4 py-3 font-semibold text-right">
                          Principal Paid
                        </th>
                        <th className="px-4 py-3 font-semibold text-right">
                          Interest Paid
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedLoans.map((loan) => {
                        const display = resolveLoanDisplay(loan);
                        const status = loanStatusMeta(loan.status);
                        const StatusIcon = status.icon;
                        const loanLabel =
                          loan.loanCode ||
                          `LN-${String(loan.id).slice(-6).toUpperCase()}`;
                        const facility = display.facility;
                        const typeStyle = loanTypeStyles[loan.typeKey];

                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {loanLabel}
                              </p>
                              <p className="text-gray-500 text-xs">
                                Created {formatDate(loan.createdAt)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {loan.borrowerName || "Member"}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {loan.memberSerial
                                  ? `Member Serial: ${loan.memberSerial}`
                                  : "Member Serial pending"}
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
                            <td className="px-4 py-3 font-medium text-gray-900 text-right">
                              {formatCurrency(display.principal)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {display.interestLabel}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-right">
                              {formatCurrency(display.remainingPrincipal)}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-right">
                              {formatCurrency(display.remainingInterest)}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-right">
                              {formatCurrency(display.repaidPrincipal)}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-right">
                              {formatCurrency(display.repaidInterest)}
                            </td>
                            <td className="px-4 py-3 font-medium text-emerald-700 text-right">
                              {formatCurrency(display.interestPatronage)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.classes}`}
                              >
                                <StatusIcon className="w-3.5 h-3.5" />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {display.progressValue === null ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <div className="min-w-[120px]">
                                  <div className="flex justify-between items-center text-gray-500 text-xs">
                                    <span>
                                      {Math.round(display.progressValue)}%
                                    </span>
                                    <span>
                                      {display.progressValue >= 100
                                        ? "Complete"
                                        : "In progress"}
                                    </span>
                                  </div>
                                  <div className="bg-gray-200 mt-1 rounded-full h-1.5">
                                    <div
                                      className="bg-emerald-500 rounded-full h-1.5"
                                      style={{
                                        width: `${display.progressValue}%`,
                                      }}
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
