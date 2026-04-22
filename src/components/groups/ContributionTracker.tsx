import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ContributionTypeConfig,
  ContributionTypeOptions,
  CONTRIBUTION_UNIT_BASE,
  normalizeContributionType,
  type ContributionTypeCanonical,
} from "@/lib/contributionPolicy";
import { downloadGroupContributionReportPdf } from "@/lib/groups";

interface Member {
  id: string;
  name: string;
  avatar: string;
  memberSerial?: string | null;
  contributionSettings?: {
    year?: number;
    units?: unknown;
  } | null;
}

interface Contribution {
  memberId: string;
  month: number;
  year: number;
  amount: number;
  status: "pending" | "completed" | "verified" | "overdue";
  paidDate?: string;
  contributionType?: string | null;
}

interface ContributionTrackerProps {
  members: Member[];
  contributions: Contribution[];
  monthlyAmount: number;
  groupName: string;
  groupId?: string;
  selectedType?: ContributionTypeCanonical;
  onSelectedTypeChange?: (type: ContributionTypeCanonical) => void;
  selectedPeriod?: {
    year: number;
    month: number;
  };
  showMonthFilter?: boolean;
  showScopedHint?: boolean;
}

const formatMonthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const ContributionTracker: React.FC<ContributionTrackerProps> = ({
  members,
  contributions,
  monthlyAmount,
  groupName,
  groupId,
  selectedType,
  onSelectedTypeChange,
  selectedPeriod,
  showMonthFilter = true,
  showScopedHint = false,
}) => {
  const { toast } = useToast();
  const [internalType, setInternalType] =
    useState<ContributionTypeCanonical>("revolving");
  const activeType = selectedType ?? internalType;
  const setActiveType =
    onSelectedTypeChange ??
    ((value: ContributionTypeCanonical) => setInternalType(value));
  const paidStatuses = useMemo(() => new Set(["completed", "verified"]), []);
  const now = useMemo(() => new Date(), []);
  const [internalSelectedMonth, setInternalSelectedMonth] = useState(() => {
    return formatMonthKey(now.getFullYear(), now.getMonth() + 1);
  });
  const controlledSelectedMonth = selectedPeriod
    ? formatMonthKey(selectedPeriod.year, selectedPeriod.month)
    : null;
  const activeSelectedMonth = controlledSelectedMonth ?? internalSelectedMonth;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "pending" | "overdue"
  >("all");
  const [isExporting, setIsExporting] = useState(false);
  const activePeriod = useMemo(() => {
    const [yearStr, monthStr] = activeSelectedMonth.split("-");
    return {
      year: Number(yearStr),
      month: Number(monthStr),
    };
  }, [activeSelectedMonth]);

  useEffect(() => {
    if (selectedType === undefined) {
      setInternalType("revolving");
    }
  }, [groupId, selectedType]);

  const normalizedContributions = useMemo(() => {
    return contributions
      .map((contribution) => {
        const month = Number(contribution.month);
        const year = Number(contribution.year);
        const amount = Number(contribution.amount ?? 0);
        const resolvedType =
          normalizeContributionType(contribution.contributionType) ??
          "revolving";
        return {
          ...contribution,
          month,
          year,
          amount,
          resolvedType,
        };
      })
      .filter((contribution) => {
        if (
          !Number.isFinite(contribution.month) ||
          !Number.isFinite(contribution.year)
        ) {
          return false;
        }
        return true;
      });
  }, [contributions]);

  const filteredContributions = useMemo(() => {
    return normalizedContributions.filter(
      (contribution) => contribution.resolvedType === activeType,
    );
  }, [normalizedContributions, activeType]);

  const monthOptions = useMemo(() => {
    const unique = new Set<string>();
    filteredContributions.forEach((c) => {
      if (Number.isFinite(c.month) && Number.isFinite(c.year)) {
        unique.add(formatMonthKey(c.year, c.month));
      }
    });

    if (unique.size === 0) {
      for (let i = 0; i < 6; i += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        unique.add(formatMonthKey(d.getFullYear(), d.getMonth() + 1));
      }
    }

    return Array.from(unique)
      .map((value) => {
        const [yearStr, monthStr] = value.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        return { value, label };
      })
      .sort((a, b) => (a.value < b.value ? 1 : -1));
  }, [filteredContributions, now]);

  useEffect(() => {
    if (selectedPeriod) return;
    if (!monthOptions.find((m) => m.value === activeSelectedMonth)) {
      setInternalSelectedMonth(monthOptions[0]?.value ?? activeSelectedMonth);
    }
  }, [monthOptions, activeSelectedMonth, selectedPeriod]);

  const contributionMap = useMemo(() => {
    const map = new Map<
      string,
      {
        paidAmount: number;
        lastPaidDate?: string;
        hasOverdue: boolean;
        hasPaid: boolean;
      }
    >();

    filteredContributions.forEach((c) => {
      const key = `${c.memberId}-${formatMonthKey(c.year, c.month)}`;
      const current = map.get(key) ?? {
        paidAmount: 0,
        lastPaidDate: undefined,
        hasOverdue: false,
        hasPaid: false,
      };

      if (paidStatuses.has(c.status)) {
        current.paidAmount += Number(c.amount ?? 0);
        current.hasPaid = true;
        if (c.paidDate) {
          if (!current.lastPaidDate) {
            current.lastPaidDate = c.paidDate;
          } else if (new Date(c.paidDate) > new Date(current.lastPaidDate)) {
            current.lastPaidDate = c.paidDate;
          }
        }
      } else if (c.status === "overdue") {
        current.hasOverdue = true;
      }

      map.set(key, current);
    });

    return map;
  }, [filteredContributions, paidStatuses]);

  const resolvePlannedUnits = (
    settings: Member["contributionSettings"],
    year: number,
    type: ContributionTypeCanonical,
  ) => {
    if (!settings || typeof settings !== "object") return null;
    const settingsYear = Number((settings as Record<string, unknown>).year);
    if (!Number.isFinite(settingsYear) || settingsYear !== year) return null;
    const rawUnits = (settings as Record<string, unknown>).units;
    if (typeof rawUnits === "number" || typeof rawUnits === "string") {
      const num = Number(rawUnits);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    if (!rawUnits || typeof rawUnits !== "object") return null;
    const num = Number((rawUnits as Record<string, unknown>)[type]);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const expectedByMemberId = useMemo(() => {
    const unitAmount =
      Number(ContributionTypeConfig?.[activeType]?.unitAmount ?? NaN) ||
      CONTRIBUTION_UNIT_BASE;
    const minAmount = Number(
      ContributionTypeConfig?.[activeType]?.minAmount ?? 0,
    );
    const fallbackAmount = Number(monthlyAmount || 0);

    const map = new Map<string, number>();
    members.forEach((member) => {
      const plannedUnits = resolvePlannedUnits(
        member.contributionSettings,
        activePeriod.year,
        activeType,
      );
      let expectedAmount = 0;
      if (plannedUnits && unitAmount) {
        const computed = plannedUnits * unitAmount;
        expectedAmount = minAmount > 0 ? Math.max(computed, minAmount) : computed;
      } else if (minAmount > 0) {
        expectedAmount = minAmount;
      } else if (Number.isFinite(fallbackAmount) && fallbackAmount > 0) {
        expectedAmount = fallbackAmount;
      }
      map.set(member.id, expectedAmount);
    });
    return map;
  }, [members, monthlyAmount, activePeriod.year, activeType]);

  const formatCurrency = (value: number) => {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `₦${amount.toLocaleString()}`;
  };

  const getContributionForMember = useCallback(
    (memberId: string, monthKey: string) => {
      return contributionMap.get(`${memberId}-${monthKey}`);
    },
    [contributionMap],
  );

  const resolveStatus = (
    summary:
      | {
          paidAmount: number;
          lastPaidDate?: string;
          hasOverdue: boolean;
          hasPaid: boolean;
        }
      | undefined,
  ) => {
    if (summary?.hasPaid) return "paid";
    if (summary?.hasOverdue) return "overdue";
    return "pending";
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesSerial = member.memberSerial
      ? member.memberSerial.toLowerCase().includes(searchQuery.toLowerCase())
      : false;
    if (!matchesSearch && !matchesSerial) return false;

    if (statusFilter === "all") return true;

    const contribution = getContributionForMember(member.id, activeSelectedMonth);
    const status = resolveStatus(contribution);
    return statusFilter === "all" || status === statusFilter;
  });

  const stats = useMemo(() => {
    const expected = members.reduce(
      (sum, member) => sum + Number(expectedByMemberId.get(member.id) || 0),
      0,
    );
    let collected = 0;
    let paidCount = 0;
    let overdueCount = 0;

    for (const member of members) {
      const contribution = getContributionForMember(
        member.id,
        activeSelectedMonth,
      );
      const status = resolveStatus(contribution);
      collected += Number(contribution?.paidAmount ?? 0);
      if (status === "paid") paidCount += 1;
      if (status === "overdue") overdueCount += 1;
    }

    const pendingCount = Math.max(0, members.length - paidCount - overdueCount);

    return {
      totalExpected: expected,
      totalCollected: collected,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }, [members, activeSelectedMonth, expectedByMemberId, getContributionForMember]);

  const collectionRate =
    stats.totalExpected > 0
      ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
      : 0;
  const cappedRate = Math.min(collectionRate, 100);

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full font-medium text-green-700 text-xs">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 px-2 py-1 rounded-full font-medium text-red-700 text-xs">
            <XCircle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full font-medium text-amber-700 text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const exportReport = async () => {
    if (!groupId) return;
    const [yearStr, monthStr] = activeSelectedMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    setIsExporting(true);
    try {
      const blob = await downloadGroupContributionReportPdf(groupId, {
        year,
        month,
        contributionType: activeType,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contribution-report-${activeSelectedMonth}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unable to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {ContributionTypeOptions.map((option) => {
            const isActive = option.value === activeType;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveType(option.value)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-600"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-gray-500 text-xs">
          {ContributionTypeConfig?.[activeType]?.description ?? ""}
        </p>
      </div>
      {showScopedHint && (
        <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          Showing your data only
        </div>
      )}

      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Collected</p>
              <p className="font-bold text-gray-900 text-lg">
                {formatCurrency(stats.totalCollected)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Collection Rate</p>
              <p className="font-bold text-gray-900 text-lg">
                {collectionRate}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-green-100 rounded-lg w-10 h-10">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Paid</p>
              <p className="font-bold text-gray-900 text-lg">
                {stats.paidCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Pending</p>
              <p className="font-bold text-gray-900 text-lg">
                {stats.pendingCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-700 text-sm">
            Monthly Collection Progress
          </span>
          <span className="text-gray-500 text-sm">
            {formatCurrency(stats.totalCollected)} /{" "}
            {formatCurrency(stats.totalExpected)}
          </span>
        </div>
        <div className="bg-gray-200 rounded-full w-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full h-full transition-all duration-500"
            style={{ width: `${cappedRate}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-2 pr-4 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
              />
            </div>
          </div>
          {showMonthFilter && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={activeSelectedMonth}
                onChange={(e) => setInternalSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "paid" | "pending" | "overdue",
                )
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <button
            onClick={exportReport}
            disabled={isExporting || !groupId}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-gray-200 border-b">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Member
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Expected
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Paid
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Status
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => {
              const contribution = getContributionForMember(
                member.id,
                activeSelectedMonth,
              );
              const status = resolveStatus(contribution);
              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="rounded-full w-8 h-8 object-cover"
                      />
                      <div>
                        <span className="font-medium text-gray-900">
                          {member.name}
                        </span>
                        {member.memberSerial && (
                          <p className="text-gray-400 text-xs">
                            {member.memberSerial}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {formatCurrency(expectedByMemberId.get(member.id) || 0)}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">
                    {formatCurrency(contribution?.paidAmount || 0)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(status)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {contribution?.lastPaidDate
                      ? new Date(contribution.lastPaidDate).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContributionTracker;
