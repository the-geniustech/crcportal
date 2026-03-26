import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  TrendingUp,
  Users,
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
import { useGroupContributionTargetsQuery } from "@/hooks/groups/useGroupContributionTargetsQuery";
import {
  ContributionTypeConfig,
  ContributionTypeOptions,
  normalizeContributionType,
  type ContributionTypeCanonical,
} from "@/lib/contributionPolicy";
import { downloadGroupContributionLedgerPdf } from "@/lib/groups";

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  totalContributed: number;
}

interface GroupContribution {
  memberId: string;
  month: number;
  year: number;
  amount: number;
  status: "pending" | "completed" | "verified" | "overdue";
  contributionType?: string | null;
  paidDate?: string;
}

interface GroupContributionDashboardModalProps {
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
  members: GroupMember[];
  contributions: GroupContribution[];
  membersLoading?: boolean;
  contributionsLoading?: boolean;
}

const MONTHS = [
  { value: 1, label: "Jan", long: "January" },
  { value: 2, label: "Feb", long: "February" },
  { value: 3, label: "Mar", long: "March" },
  { value: 4, label: "Apr", long: "April" },
  { value: 5, label: "May", long: "May" },
  { value: 6, label: "Jun", long: "June" },
  { value: 7, label: "Jul", long: "July" },
  { value: 8, label: "Aug", long: "August" },
  { value: 9, label: "Sep", long: "September" },
  { value: 10, label: "Oct", long: "October" },
  { value: 11, label: "Nov", long: "November" },
  { value: 12, label: "Dec", long: "December" },
];

const paidStatuses = new Set(["completed", "verified"]);

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return currencyFormatter.format(safe);
};

const GroupContributionDashboardModal: React.FC<
  GroupContributionDashboardModalProps
> = ({
  isOpen,
  onClose,
  group,
  members,
  contributions,
  membersLoading = false,
  contributionsLoading = false,
}) => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] =
    useState<ContributionTypeCanonical>("revolving");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const targetsQuery = useGroupContributionTargetsQuery(group?.id);
  const targets = targetsQuery.data?.monthlyTargets ?? null;
  const unitAmounts = targetsQuery.data?.unitAmounts ?? null;

  const normalizedContributions = useMemo(
    () =>
      contributions.map((contribution) => ({
        memberId: contribution.memberId,
        month: Number(contribution.month),
        year: Number(contribution.year),
        amount: Number(contribution.amount ?? 0),
        status: contribution.status,
        type:
          normalizeContributionType(contribution.contributionType) ||
          "revolving",
      })),
    [contributions],
  );

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    normalizedContributions.forEach((contribution) => {
      if (Number.isFinite(contribution.year)) {
        years.add(contribution.year);
      }
    });
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [normalizedContributions, currentYear]);

  const [selectedYear, setSelectedYear] = useState(() => {
    return yearOptions[0] ?? currentYear;
  });

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0] ?? currentYear);
    }
  }, [yearOptions, selectedYear, currentYear]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedType("revolving");
    }
  }, [isOpen]);

  const monthsToDate = selectedYear === currentYear ? currentMonth : 12;
  const totalMembers =
    members.length > 0 ? members.length : Number(group?.memberCount ?? 0);

  const getExpectedMonthly = (type: ContributionTypeCanonical) => {
    const target = targets?.[type];
    if (typeof target === "number" && Number.isFinite(target) && target > 0) {
      return target;
    }
    const base = Number(group?.monthlyContribution ?? 0);
    if (type === "revolving" && base > 0) return base;
    return ContributionTypeConfig[type]?.minAmount ?? 0;
  };

  const expectedMonthly = getExpectedMonthly(selectedType);
  const resolvedUnitAmount =
    unitAmounts?.[selectedType] ?? ContributionTypeConfig[selectedType]?.unitAmount;
  const expectedUnits =
    resolvedUnitAmount && resolvedUnitAmount > 0 && expectedMonthly > 0
      ? Math.max(1, Math.round(expectedMonthly / resolvedUnitAmount))
      : null;

  const filteredContributions = useMemo(
    () =>
      normalizedContributions.filter(
        (contribution) =>
          contribution.year === selectedYear &&
          contribution.type === selectedType &&
          contribution.month >= 1 &&
          contribution.month <= 12,
      ),
    [normalizedContributions, selectedYear, selectedType],
  );

  const memberMonthMap = useMemo(() => {
    const map = new Map<
      string,
      Map<number, { amount: number; hasRecord: boolean; status: string }>
    >();
    for (const contribution of filteredContributions) {
      if (!contribution.memberId) continue;
      const month = contribution.month;
      if (!month) continue;
      const memberMap = map.get(contribution.memberId) ?? new Map();
      const current =
        memberMap.get(month) ?? { amount: 0, hasRecord: false, status: "pending" };
      current.hasRecord = true;
      if (paidStatuses.has(contribution.status)) {
        current.amount += Number(contribution.amount ?? 0);
        current.status = "paid";
      } else if (contribution.status === "overdue") {
        current.status = "overdue";
      }
      memberMap.set(month, current);
      map.set(contribution.memberId, memberMap);
    }
    return map;
  }, [filteredContributions]);

  const allMemberRows = useMemo(() => {
    const sorted = [...members].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return sorted.map((member) => {
      const monthAmounts = MONTHS.map(({ value }) => {
        const record = memberMonthMap.get(member.id)?.get(value);
        return {
          amount: record?.amount ?? 0,
          hasRecord: record?.hasRecord ?? false,
        };
      });
      const ytdTotal = monthAmounts
        .slice(0, monthsToDate)
        .reduce((sum, month) => sum + month.amount, 0);
      const expectedYtd = expectedMonthly * monthsToDate;
      const arrears = Math.max(expectedYtd - ytdTotal, 0);
      return {
        member,
        monthAmounts,
        ytdTotal,
        expectedYtd,
        arrears,
        status: arrears > 0 ? "ARREARS" : "ON TRACK",
      };
    });
  }, [members, memberMonthMap, monthsToDate, expectedMonthly]);

  const visibleRows = useMemo(() => {
    if (!searchQuery) return allMemberRows;
    const query = searchQuery.toLowerCase();
    return allMemberRows.filter((row) =>
      row.member.name.toLowerCase().includes(query),
    );
  }, [allMemberRows, searchQuery]);

  const collectionSummary = useMemo(() => {
    const expectedTotal = expectedMonthly * totalMembers * monthsToDate;
    const collectedTotal = filteredContributions
      .filter(
        (contribution) =>
          paidStatuses.has(contribution.status) &&
          contribution.month <= monthsToDate,
      )
      .reduce((sum, contribution) => sum + contribution.amount, 0);
    const arrears = Math.max(expectedTotal - collectedTotal, 0);
    const collectionRate =
      expectedTotal > 0
        ? Math.round((collectedTotal / expectedTotal) * 100)
        : 0;
    const membersInArrears = allMemberRows.filter(
      (row) => row.arrears > 0,
    ).length;
    return {
      expectedTotal,
      collectedTotal,
      arrears,
      collectionRate,
      membersInArrears,
    };
  }, [
    expectedMonthly,
    totalMembers,
    monthsToDate,
    filteredContributions,
    allMemberRows,
  ]);

  const totalsByType = useMemo(() => {
    return ContributionTypeOptions.map((type) => {
      const expectedMonthlyAmount = getExpectedMonthly(type.value);
      const expectedTotal =
        expectedMonthlyAmount * totalMembers * monthsToDate;
      const collectedTotal = normalizedContributions
        .filter(
          (contribution) =>
            contribution.year === selectedYear &&
            contribution.type === type.value &&
            contribution.month <= monthsToDate &&
            paidStatuses.has(contribution.status),
        )
        .reduce((sum, contribution) => sum + contribution.amount, 0);
      const arrears = Math.max(expectedTotal - collectedTotal, 0);
      const rate =
        expectedTotal > 0
          ? Math.round((collectedTotal / expectedTotal) * 100)
          : 0;
      return {
        ...type,
        expectedTotal,
        collectedTotal,
        arrears,
        rate,
      };
    });
  }, [
    normalizedContributions,
    selectedYear,
    monthsToDate,
    totalMembers,
    targets,
    group?.monthlyContribution,
  ]);

  const tableTotals = useMemo(() => {
    const monthTotals = MONTHS.map((_, monthIndex) =>
      visibleRows.reduce(
        (sum, row) => sum + (row.monthAmounts[monthIndex]?.amount ?? 0),
        0,
      ),
    );
    const ytdTotal = monthTotals
      .slice(0, monthsToDate)
      .reduce((sum, value) => sum + value, 0);
    const expectedYtd = expectedMonthly * monthsToDate * visibleRows.length;
    const arrears = Math.max(expectedYtd - ytdTotal, 0);
    return {
      monthTotals,
      ytdTotal,
      expectedYtd,
      arrears,
      status: arrears > 0 ? "ARREARS" : "ON TRACK",
    };
  }, [visibleRows, monthsToDate, expectedMonthly]);

  const selectedTypeMeta = ContributionTypeConfig[selectedType];
  const isSummaryLoading =
    membersLoading || contributionsLoading || targetsQuery.isLoading;
  const isTableLoading = membersLoading || contributionsLoading;

  const csvEscape = (value: string | number) => {
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
        "S/N",
        "Member Name",
        "Units",
        "Expected Monthly",
        ...MONTHS.map((month) => month.label),
        "YTD Total",
        "Expected YTD",
        "Arrears",
        "Status",
      ];

      const rows = visibleRows.map((row, index) => [
        index + 1,
        row.member.name,
        expectedUnits ?? "-",
        formatCurrency(expectedMonthly),
        ...row.monthAmounts.map((month) =>
          month.amount > 0 ? formatCurrency(month.amount) : "-",
        ),
        formatCurrency(row.ytdTotal),
        formatCurrency(row.expectedYtd),
        formatCurrency(row.arrears),
        row.status,
      ]);

      const totals = [
        "Totals",
        `${visibleRows.length} members`,
        expectedUnits ?? "-",
        formatCurrency(expectedMonthly * visibleRows.length),
        ...tableTotals.monthTotals.map((total) =>
          total > 0 ? formatCurrency(total) : "-",
        ),
        formatCurrency(tableTotals.ytdTotal),
        formatCurrency(tableTotals.expectedYtd),
        formatCurrency(tableTotals.arrears),
        tableTotals.status,
      ];

      const csvBody = [headers, ...rows, totals]
        .map((row) => row.map((value) => csvEscape(value)).join(","))
        .join("\n");
      const csv = `\uFEFF${csvBody}`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.href = url;
      link.download = `contribution-ledger-${safeName}-${selectedType}-${selectedYear}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!group) return;
    setIsExportingPdf(true);
    try {
      const blob = await downloadGroupContributionLedgerPdf(group.id, {
        year: selectedYear,
        contributionType: selectedType,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.href = url;
      link.download = `contribution-ledger-${safeName}-${selectedType}-${selectedYear}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unable to export PDF",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
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
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            aria-label="Close contribution dashboard"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                Contribution Tracking Dashboard
              </span>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {group.name}
                  </h2>
                  <p className="text-sm text-emerald-100">
                    {selectedTypeMeta?.label} | {selectedYear} |{" "}
                    {totalMembers} members
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {yearOptions.length > 1 && (
                    <select
                      value={selectedYear}
                      onChange={(event) =>
                        setSelectedYear(Number(event.target.value))
                      }
                      className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
                    Updated {currentDate.toLocaleDateString("en-US")}
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
                {ContributionTypeOptions.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedType === type.value
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="flex w-full max-w-lg items-center gap-3">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={isExportingPdf || isExportingCsv}
                    >
                      <Download className="h-4 w-4" />
                      {isExportingPdf || isExportingCsv ? "Exporting..." : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleExportPdf}
                      disabled={isExportingPdf}
                    >
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportCsv}
                      disabled={isExportingCsv}
                    >
                      Export CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Expected YTD
                  </p>
                  <Users className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {isSummaryLoading
                    ? "-"
                    : formatCurrency(collectionSummary.expectedTotal)}
                </p>
                <p className="text-xs text-gray-500">
                  {totalMembers} members | {monthsToDate} months
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Collected YTD
                  </p>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {isSummaryLoading
                    ? "-"
                    : formatCurrency(collectionSummary.collectedTotal)}
                </p>
                <p className="text-xs text-gray-500">
                  {isSummaryLoading
                    ? "-"
                    : `${collectionSummary.collectionRate}% collection rate`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Arrears YTD
                  </p>
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                  {isSummaryLoading
                    ? "-"
                    : formatCurrency(collectionSummary.arrears)}
                </p>
                <p className="text-xs text-gray-500">
                  {isSummaryLoading
                    ? "-"
                    : `${collectionSummary.membersInArrears} members behind`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Expected Monthly
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {formatCurrency(expectedMonthly)}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedTypeMeta?.description || "Expected monthly target"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Totals by Contribution Type
                  </p>
                  <p className="text-xs text-gray-500">
                    Tracking totals across all four contribution types in the
                    same format.
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  Year to date overview
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {totalsByType.map((type) => (
                  <div
                    key={type.value}
                    className={`rounded-xl border px-4 py-3 ${
                      selectedType === type.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {type.label}
                      </p>
                      <span className="text-xs font-semibold text-gray-500">
                        {type.rate}%
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Expected</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(type.expectedTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Collected</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(type.collectedTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Arrears</span>
                        <span
                          className={`font-semibold ${
                            type.arrears > 0
                              ? "text-rose-600"
                              : "text-gray-700"
                          }`}
                        >
                          {formatCurrency(type.arrears)}
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
                    Member Contribution Ledger
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedTypeMeta?.label} tracking in {selectedYear}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  Expected Monthly: {formatCurrency(expectedMonthly)}
                  {ContributionTypeConfig[selectedType]?.unitAmount ? (
                    <span>
                      {" "}
                      | Units: {expectedUnits ?? "-"} @{" "}
                      {formatCurrency(
                        ContributionTypeConfig[selectedType]?.unitAmount || 0,
                      )}{" "}
                      per unit
                    </span>
                  ) : null}
                </div>
              </div>

              {isTableLoading ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Loading contribution dashboard...
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  No members found for the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1400px] w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">S/N</th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Member Name
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Units
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Expected Monthly
                        </th>
                        {MONTHS.map((month) => (
                          <th
                            key={month.value}
                            className="px-3 py-3 text-center font-semibold"
                          >
                            {month.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left font-semibold">
                          YTD Total
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Expected YTD
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Arrears
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRows.map((row, rowIndex) => (
                        <tr key={row.member.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-gray-500">
                            {rowIndex + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={row.member.avatar}
                                alt={row.member.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                              <span className="font-medium text-gray-900">
                                {row.member.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {expectedUnits ?? "-"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatCurrency(expectedMonthly)}
                          </td>
                          {row.monthAmounts.map((month, index) => (
                            <td
                              key={`${row.member.id}-${MONTHS[index].value}`}
                              className="px-3 py-3 text-center text-gray-700"
                            >
                              {month.amount > 0
                                ? formatCurrency(month.amount)
                                : "-"}
                            </td>
                          ))}
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatCurrency(row.ytdTotal)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCurrency(row.expectedYtd)}
                          </td>
                          <td className="px-4 py-3 font-medium text-rose-600">
                            {formatCurrency(row.arrears)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                row.status === "ARREARS"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                          Totals
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                          {visibleRows.length} members
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {expectedUnits ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatCurrency(expectedMonthly * visibleRows.length)}
                        </td>
                        {tableTotals.monthTotals.map((total, index) => (
                          <td
                            key={`total-${MONTHS[index].value}`}
                            className="px-3 py-3 text-center text-sm font-semibold text-gray-700"
                          >
                            {total > 0 ? formatCurrency(total) : "-"}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatCurrency(tableTotals.ytdTotal)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatCurrency(tableTotals.expectedYtd)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-rose-600">
                          {formatCurrency(tableTotals.arrears)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              tableTotals.status === "ARREARS"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {tableTotals.status}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
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

export default GroupContributionDashboardModal;
