import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  SlidersHorizontal,
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
import { useGroupContributionInterestLedgerQuery } from "@/hooks/groups/useGroupContributionInterestLedgerQuery";
import { useContributionSettingsQuery } from "@/hooks/profile/useContributionSettingsQuery";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserRole } from "@/lib/auth";
import {
  ContributionTypeConfig,
  ContributionTypeOptions,
  CONTRIBUTION_UNIT_BASE,
  calculateContributionUnits,
  normalizeContributionType,
  type ContributionTypeCanonical,
} from "@/lib/contributionPolicy";
import { downloadGroupContributionLedgerExport } from "@/lib/groups";
import { USER_ROLE, ELEVATED_GROUP_ROLES, type GroupRole } from "@/lib/roles";

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  totalContributed: number;
  memberSerial?: string | null;
  memberNumber?: number | null;
  contributionUnitsByType?: {
    revolving?: number | null;
    special?: number | null;
    endwell?: number | null;
    festive?: number | null;
  } | null;
}

interface GroupContribution {
  memberId: string;
  month: number;
  year: number;
  amount: number;
  units?: number;
  interestAmount?: number;
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
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  currentMemberRole?: GroupRole | null;
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

type DashboardContributionType = ContributionTypeCanonical | "all" | "interest";

const ALL_META = {
  value: "all",
  label: "All",
  description:
    "Combined contribution performance across revolving, special, endwell, and festive tabs.",
} as const;

const INTEREST_META = {
  value: "interest",
  label: "Interest Earned",
  description:
    "Interest earned based on monthly rates configured by the admin.",
} as const;

const DASHBOARD_TYPES: Array<{
  value: DashboardContributionType;
  label: string;
  description: string;
}> = [ALL_META, ...ContributionTypeOptions, INTEREST_META];

const CONTRIBUTION_TYPE_KEYS = ContributionTypeOptions.map(
  (type) => type.value,
) as ContributionTypeCanonical[];

const CONTRIBUTION_TYPE_SHORT_LABELS: Record<ContributionTypeCanonical, string> =
  {
    revolving: "R",
    special: "S",
    endwell: "E",
    festive: "F",
  };

const CONTRIBUTION_SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "serial_asc", label: "Serial Asc" },
  { value: "serial_desc", label: "Serial Desc" },
  { value: "ytd_desc", label: "YTD Highest" },
  { value: "ytd_asc", label: "YTD Lowest" },
  { value: "arrears_desc", label: "Arrears Highest" },
  { value: "arrears_asc", label: "Arrears Lowest" },
] as const;

type ContributionSortOption =
  (typeof CONTRIBUTION_SORT_OPTIONS)[number]["value"];

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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatRateDelta = (value: number) =>
  `${value > 0 ? "+" : ""}${Math.round(value)}% vs overall`;

const contributionSortCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

type MonthContributionCell = {
  amount: number;
  hasRecord: boolean;
  byType: Partial<Record<ContributionTypeCanonical, number>>;
};

type ContributionMemberRow = {
  member: GroupMember;
  units: number | null;
  expectedMonthly: number;
  monthAmounts: MonthContributionCell[];
  ytdTotal: number;
  expectedYtd: number;
  arrears: number;
  status: "ARREARS" | "ON TRACK";
  ytdByType: Partial<Record<ContributionTypeCanonical, number>>;
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
  selectedYear: selectedYearProp,
  onYearChange,
  currentMemberRole,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] =
    useState<DashboardContributionType>("revolving");
  const [selectedInterestType, setSelectedInterestType] =
    useState<ContributionTypeCanonical>("revolving");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ContributionSortOption>("name_asc");
  const [exportingFormat, setExportingFormat] = useState<
    null | "pdf" | "csv" | "xlsx"
  >(null);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const targetsQuery = useGroupContributionTargetsQuery(group?.id);
  const contributionSettingsQuery = useContributionSettingsQuery();
  const targets = targetsQuery.data?.monthlyTargets ?? null;
  const unitAmounts = targetsQuery.data?.unitAmounts ?? null;
  const normalizedMemberRole = currentMemberRole ?? null;
  const hasElevatedMembership = normalizedMemberRole
    ? ELEVATED_GROUP_ROLES.includes(normalizedMemberRole)
    : false;
  const canViewAll =
    hasUserRole(user, USER_ROLE.ADMIN, USER_ROLE.GROUP_COORDINATOR) ||
    hasElevatedMembership;
  const scopedMemberId = profile?.id ? String(profile.id) : null;
  const scopedMembers = useMemo(() => {
    if (canViewAll) return members;
    if (!scopedMemberId) return [];
    return members.filter((member) => String(member.id) === scopedMemberId);
  }, [members, canViewAll, scopedMemberId]);
  const scopedContributions = useMemo(() => {
    if (canViewAll) return contributions;
    if (!scopedMemberId) return [];
    return contributions.filter(
      (contribution) => String(contribution.memberId) === scopedMemberId,
    );
  }, [contributions, canViewAll, scopedMemberId]);

  const normalizedContributions = useMemo(
    () =>
      scopedContributions.map((contribution) => {
        const amount = Number(contribution.amount ?? 0);
        const normalizedType = normalizeContributionType(
          contribution.contributionType,
        );
        const resolvedType = normalizedType || "revolving";
        return {
          memberId: contribution.memberId,
          month: Number(contribution.month),
          year: Number(contribution.year),
          amount,
          units:
            typeof contribution.units === "number"
              ? contribution.units
              : calculateContributionUnits(amount),
          interestAmount:
            typeof contribution.interestAmount === "number" &&
            contribution.interestAmount > 0
              ? contribution.interestAmount
              : 0,
          status: contribution.status,
          type: resolvedType,
        };
      }),
    [scopedContributions],
  );

  const resolvedSelectedYear =
    Number.isFinite(Number(selectedYearProp)) && selectedYearProp
      ? Number(selectedYearProp)
      : null;

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const span = 20;
    for (let i = 0; i < span; i += 1) {
      years.add(currentYear - i);
    }
    normalizedContributions.forEach((contribution) => {
      if (Number.isFinite(contribution.year)) {
        years.add(contribution.year);
      }
    });
    if (Number.isFinite(resolvedSelectedYear || NaN)) {
      years.add(Number(resolvedSelectedYear));
    }
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [normalizedContributions, currentYear, resolvedSelectedYear]);

  const [internalYear, setInternalYear] = useState(() => {
    return resolvedSelectedYear ?? yearOptions[0] ?? currentYear;
  });

  const selectedYear = resolvedSelectedYear ?? internalYear;

  const interestLedgerQuery = useGroupContributionInterestLedgerQuery(
    group?.id,
    { year: selectedYear, contributionType: selectedInterestType },
    isOpen && selectedType === "interest",
  );

  const normalizedInterestEntries = useMemo(() => {
    const entries = interestLedgerQuery.data?.entries ?? [];
    return entries.map((entry) => ({
      memberId: entry.memberId,
      month: Number(entry.month),
      year: Number(entry.year),
      amount: 0,
      units: undefined,
      interestAmount: Number(entry.interestAmount ?? 0),
      status: "verified" as const,
      type: selectedInterestType,
    }));
  }, [interestLedgerQuery.data?.entries, selectedInterestType]);

  useEffect(() => {
    if (resolvedSelectedYear !== null) {
      setInternalYear(resolvedSelectedYear);
      return;
    }
    if (!yearOptions.includes(internalYear)) {
      setInternalYear(yearOptions[0] ?? currentYear);
    }
  }, [yearOptions, resolvedSelectedYear, internalYear, currentYear]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedType("revolving");
      setSelectedInterestType("revolving");
      setSortBy("name_asc");
    }
  }, [isOpen]);

  const handleYearSelect = (year: number) => {
    if (!Number.isFinite(year)) return;
    if (onYearChange) onYearChange(year);
    if (resolvedSelectedYear === null) {
      setInternalYear(year);
    }
  };

  const monthsToDate = selectedYear === currentYear ? currentMonth : 12;
  const totalMembers =
    scopedMembers.length > 0
      ? scopedMembers.length
      : canViewAll
        ? Number(group?.memberCount ?? 0)
        : 0;
  const effectiveType: ContributionTypeCanonical =
    selectedType === "interest"
      ? selectedInterestType
      : selectedType === "all"
        ? "revolving"
        : selectedType;

  const getExpectedMonthlyBase = useCallback((type: ContributionTypeCanonical) => {
    const target = targets?.[type];
    if (typeof target === "number" && Number.isFinite(target) && target > 0) {
      return target;
    }
    const base = Number(group?.monthlyContribution ?? 0);
    if (type === "revolving" && base > 0) return base;
    return ContributionTypeConfig[type]?.minAmount ?? 0;
  }, [group?.monthlyContribution, targets]);

  const expectedMonthlyBase = getExpectedMonthlyBase(effectiveType);
  const expectedMonthly = expectedMonthlyBase;
  const getUnitAmountForType = useCallback(
    (type: ContributionTypeCanonical) =>
      unitAmounts?.[type] ??
      ContributionTypeConfig[type]?.unitAmount ??
      CONTRIBUTION_UNIT_BASE,
    [unitAmounts],
  );
  const resolvedUnitAmount = getUnitAmountForType(effectiveType);

  const resolveMemberUnits = useCallback((
    member: GroupMember,
    type: ContributionTypeCanonical,
  ) => {
    if (selectedYear !== currentYear) return null;
    if (!member.contributionUnitsByType) return null;
    const raw = Number(member.contributionUnitsByType[type] ?? NaN);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  }, [currentYear, selectedYear]);

  const resolveMemberExpectedMonthly = useCallback((
    member: GroupMember,
    type: ContributionTypeCanonical,
  ) => {
    const units = resolveMemberUnits(member, type);
    const unitAmount = getUnitAmountForType(type);
    if (units && unitAmount) {
      return units * unitAmount;
    }
    return getExpectedMonthlyBase(type);
  }, [resolveMemberUnits, getExpectedMonthlyBase, getUnitAmountForType]);

  const contributionDataset =
    selectedType === "interest"
      ? normalizedInterestEntries
      : normalizedContributions;

  const filteredContributions = useMemo(
    () =>
      contributionDataset.filter(
        (contribution) =>
          contribution.year === selectedYear &&
          (selectedType === "all"
            ? CONTRIBUTION_TYPE_KEYS.includes(contribution.type)
            : contribution.type === effectiveType) &&
          contribution.month >= 1 &&
          contribution.month <= 12,
      ),
    [contributionDataset, selectedYear, effectiveType, selectedType],
  );

  const buildContributionRows = useCallback((
    mode: ContributionTypeCanonical | "all",
  ): ContributionMemberRow[] => {
    const relevantTypes =
      mode === "all" ? CONTRIBUTION_TYPE_KEYS : ([mode] as ContributionTypeCanonical[]);

    const memberMonthMap = new Map<string, Map<number, MonthContributionCell>>();
    for (const contribution of normalizedContributions) {
      if (
        contribution.year !== selectedYear ||
        !relevantTypes.includes(contribution.type) ||
        contribution.month < 1 ||
        contribution.month > 12
      ) {
        continue;
      }
      const memberMap = memberMonthMap.get(contribution.memberId) ?? new Map();
      const current = memberMap.get(contribution.month) ?? {
        amount: 0,
        hasRecord: false,
        byType: {},
      };
      current.hasRecord = true;
      if (paidStatuses.has(contribution.status)) {
        current.amount += Number(contribution.amount ?? 0);
        current.byType[contribution.type] =
          Number(current.byType[contribution.type] ?? 0) +
          Number(contribution.amount ?? 0);
      }
      memberMap.set(contribution.month, current);
      memberMonthMap.set(contribution.memberId, memberMap);
    }

    return [...scopedMembers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((member) => {
        const monthAmounts = MONTHS.map(({ value }) => {
          const record = memberMonthMap.get(member.id)?.get(value);
          return {
            amount: record?.amount ?? 0,
            hasRecord: record?.hasRecord ?? false,
            byType: record?.byType ?? {},
          };
        });
        const ytdByType = relevantTypes.reduce(
          (acc, type) => {
            acc[type] = monthAmounts
              .slice(0, monthsToDate)
              .reduce(
                (sum, month) => sum + Number(month.byType[type] ?? 0),
                0,
              );
            return acc;
          },
          {} as Partial<Record<ContributionTypeCanonical, number>>,
        );
        const ytdTotal = Object.values(ytdByType).reduce(
          (sum, value) => sum + Number(value ?? 0),
          0,
        );
        const units =
          mode === "all"
            ? (() => {
                const totalUnits = relevantTypes.reduce(
                  (sum, type) => sum + Number(resolveMemberUnits(member, type) ?? 0),
                  0,
                );
                return totalUnits > 0 ? totalUnits : null;
              })()
            : resolveMemberUnits(member, mode);
        const expectedMonthlyForMember =
          mode === "all"
            ? relevantTypes.reduce(
                (sum, type) => sum + resolveMemberExpectedMonthly(member, type),
                0,
              )
            : resolveMemberExpectedMonthly(member, mode);
        const expectedYtd = expectedMonthlyForMember * monthsToDate;
        const arrears = Math.max(expectedYtd - ytdTotal, 0);
        return {
          member,
          units,
          expectedMonthly: expectedMonthlyForMember,
          monthAmounts,
          ytdTotal,
          expectedYtd,
          arrears,
          status: arrears > 0 ? "ARREARS" : "ON TRACK",
          ytdByType,
        };
      });
  }, [
    monthsToDate,
    normalizedContributions,
    scopedMembers,
    selectedYear,
    resolveMemberExpectedMonthly,
    resolveMemberUnits,
  ]);

  const contributionRowsByMode = useMemo(
    () => ({
      all: buildContributionRows("all"),
      revolving: buildContributionRows("revolving"),
      special: buildContributionRows("special"),
      endwell: buildContributionRows("endwell"),
      festive: buildContributionRows("festive"),
    }),
    [buildContributionRows],
  );

  const interestMemberRows = useMemo<ContributionMemberRow[]>(() => {
    const memberMonthMap = new Map<string, Map<number, MonthContributionCell>>();
    for (const contribution of filteredContributions) {
      const memberMap = memberMonthMap.get(contribution.memberId) ?? new Map();
      const current = memberMap.get(contribution.month) ?? {
        amount: 0,
        hasRecord: false,
        byType: {},
      };
      current.hasRecord = true;
      if (paidStatuses.has(contribution.status)) {
        const interestValue = Number(contribution.interestAmount ?? 0);
        current.amount += interestValue;
        current.byType[selectedInterestType] =
          Number(current.byType[selectedInterestType] ?? 0) + interestValue;
      }
      memberMap.set(contribution.month, current);
      memberMonthMap.set(contribution.memberId, memberMap);
    }

    return [...scopedMembers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((member) => {
        const monthAmounts = MONTHS.map(({ value }) => {
          const record = memberMonthMap.get(member.id)?.get(value);
          return {
            amount: record?.amount ?? 0,
            hasRecord: record?.hasRecord ?? false,
            byType: record?.byType ?? {},
          };
        });
        const ytdTotal = monthAmounts
          .slice(0, monthsToDate)
          .reduce((sum, month) => sum + month.amount, 0);
        return {
          member,
          units: null,
          expectedMonthly: 0,
          monthAmounts,
          ytdTotal,
          expectedYtd: ytdTotal,
          arrears: 0,
          status: "ON TRACK",
          ytdByType: {
            [selectedInterestType]: ytdTotal,
          },
        };
      });
  }, [filteredContributions, monthsToDate, scopedMembers, selectedInterestType]);

  const allMemberRows =
    selectedType === "interest"
      ? interestMemberRows
      : contributionRowsByMode[selectedType];

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredRows = query
      ? allMemberRows.filter(
          (row) =>
            row.member.name.toLowerCase().includes(query) ||
            (row.member.memberSerial
              ? row.member.memberSerial.toLowerCase().includes(query)
              : false),
        )
      : allMemberRows;

    return [...filteredRows].sort((left, right) => {
      switch (sortBy) {
        case "name_desc":
          return contributionSortCollator.compare(
            right.member.name,
            left.member.name,
          );
        case "serial_asc":
          return contributionSortCollator.compare(
            left.member.memberSerial ?? "",
            right.member.memberSerial ?? "",
          );
        case "serial_desc":
          return contributionSortCollator.compare(
            right.member.memberSerial ?? "",
            left.member.memberSerial ?? "",
          );
        case "ytd_desc":
          return right.ytdTotal - left.ytdTotal;
        case "ytd_asc":
          return left.ytdTotal - right.ytdTotal;
        case "arrears_desc":
          return right.arrears - left.arrears;
        case "arrears_asc":
          return left.arrears - right.arrears;
        case "name_asc":
        default:
          return contributionSortCollator.compare(
            left.member.name,
            right.member.name,
          );
      }
    });
  }, [allMemberRows, searchQuery, sortBy]);

  const collectionSummary = useMemo(() => {
    const collectedTotal = filteredContributions
      .filter(
        (contribution) =>
          paidStatuses.has(contribution.status) &&
          contribution.month <= monthsToDate,
      )
      .reduce((sum, contribution) => {
        const value =
          selectedType === "interest"
            ? Number(contribution.interestAmount ?? 0)
            : Number(contribution.amount ?? 0);
        return sum + value;
      }, 0);
    const expectedTotal =
      selectedType === "interest"
        ? collectedTotal
        : allMemberRows.reduce((sum, row) => sum + row.expectedYtd, 0);
    const arrears = Math.max(expectedTotal - collectedTotal, 0);
    const collectionRate =
      expectedTotal > 0
        ? Math.round((collectedTotal / expectedTotal) * 100)
        : 0;
    const membersInArrears =
      selectedType === "interest"
        ? 0
        : allMemberRows.filter((row) => row.arrears > 0).length;
    return {
      expectedTotal,
      collectedTotal,
      arrears,
      collectionRate,
      membersInArrears,
    };
  }, [filteredContributions, allMemberRows, selectedType, monthsToDate]);

  const plannedUnitsSummary = useMemo(() => {
    const units = allMemberRows
      .map((row) => row.units)
      .filter((value): value is number => Number.isFinite(value ?? NaN));
    const total = units.reduce((sum, value) => sum + value, 0);
    const average = units.length > 0 ? Math.round(total / units.length) : null;
    return { total, average, count: units.length };
  }, [allMemberRows]);

  const averageExpectedMonthly = useMemo(() => {
    const denominator = totalMembers * monthsToDate;
    if (!denominator) return 0;
    if (selectedType === "interest") {
      return collectionSummary.collectedTotal / denominator;
    }
    return collectionSummary.expectedTotal / denominator;
  }, [
    collectionSummary.expectedTotal,
    collectionSummary.collectedTotal,
    monthsToDate,
    totalMembers,
    selectedType,
  ]);

  const totalsByType = useMemo(() => {
    return ContributionTypeOptions.map((type) => {
      const rows = contributionRowsByMode[type.value] ?? [];
      const expectedTotal = rows.reduce(
        (sum, row) => sum + Number(row.expectedYtd ?? 0),
        0,
      );
      const collectedTotal = rows.reduce(
        (sum, row) => sum + Number(row.ytdTotal ?? 0),
        0,
      );
      const arrears = Math.max(expectedTotal - collectedTotal, 0);
      const rate =
        expectedTotal > 0
          ? Math.round((collectedTotal / expectedTotal) * 100)
          : 0;
      const membersInArrears = rows.filter((row) => row.arrears > 0).length;
      return {
        ...type,
        expectedTotal,
        collectedTotal,
        arrears,
        rate,
        membersInArrears,
      };
    });
  }, [
    contributionRowsByMode,
  ]);

  const allContributionSummary = useMemo(() => {
    const expectedTotal = totalsByType.reduce(
      (sum, type) => sum + Number(type.expectedTotal ?? 0),
      0,
    );
    const collectedTotal = totalsByType.reduce(
      (sum, type) => sum + Number(type.collectedTotal ?? 0),
      0,
    );
    const arrears = Math.max(expectedTotal - collectedTotal, 0);
    const collectionRate =
      expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;
    const membersInArrears = contributionRowsByMode.all.filter(
      (row) => row.arrears > 0,
    ).length;
    return {
      expectedTotal,
      collectedTotal,
      arrears,
      collectionRate,
      membersInArrears,
    };
  }, [contributionRowsByMode.all, totalsByType]);

  const allTypeComparisons = useMemo(() => {
    const overallCollected = Math.max(allContributionSummary.collectedTotal, 1);
    return totalsByType.map((type) => {
      const shareOfCollection = Math.round(
        (Number(type.collectedTotal || 0) / overallCollected) * 100,
      );
      const rateGap = Number(type.rate || 0) - allContributionSummary.collectionRate;
      const arrearsWeight =
        allContributionSummary.arrears > 0
          ? Math.round(
              (Number(type.arrears || 0) / allContributionSummary.arrears) * 100,
            )
          : 0;
      return {
        ...type,
        shareOfCollection,
        rateGap,
        arrearsWeight,
      };
    });
  }, [allContributionSummary, totalsByType]);

  const tableTotals = useMemo(() => {
    const monthTotals = MONTHS.map((_, monthIndex) =>
      visibleRows.reduce(
        (sum, row) => sum + (row.monthAmounts[monthIndex]?.amount ?? 0),
        0,
      ),
    );
    const unitsTotal = visibleRows.reduce(
      (sum, row) => sum + (row.units ?? 0),
      0,
    );
    const ytdTotal = monthTotals
      .slice(0, monthsToDate)
      .reduce((sum, value) => sum + value, 0);
    const expectedYtd = visibleRows.reduce(
      (sum, row) => sum + row.expectedYtd,
      0,
    );
    const arrears = Math.max(expectedYtd - ytdTotal, 0);
    return {
      monthTotals,
      unitsTotal,
      ytdTotal,
      expectedYtd,
      arrears,
      status: arrears > 0 ? "ARREARS" : "ON TRACK",
    };
  }, [visibleRows, monthsToDate]);

  const selectedTypeMeta =
    selectedType === "all"
      ? ALL_META
      : selectedType === "interest"
      ? {
          ...INTEREST_META,
          label: `Interest Earned \u00b7 ${
            ContributionTypeConfig[selectedInterestType]?.label ??
            "Contribution"
          }`,
          description: `Interest earned using the monthly rate schedule for ${
            ContributionTypeConfig[selectedInterestType]?.label ??
            "contributions"
          }.`,
        }
      : ContributionTypeConfig[selectedType];
  const interestLedgerLoading = interestLedgerQuery.isLoading;
  const isSummaryLoading =
    membersLoading ||
    targetsQuery.isLoading ||
    (selectedType === "interest"
      ? interestLedgerLoading
      : contributionsLoading);
  const isSettingsLoading = contributionSettingsQuery.isLoading;
  const isTableLoading =
    membersLoading ||
    (selectedType === "interest"
      ? interestLedgerLoading
      : contributionsLoading);
  const settingsUnits = contributionSettingsQuery.data?.units ?? null;
  const settingsYear = contributionSettingsQuery.data?.year ?? currentYear;
  const formatUnitsLabel = (value: number | null | undefined) => {
    if (isSettingsLoading) return "-";
    const num = Number(value ?? NaN);
    if (!Number.isFinite(num) || num <= 0) return "-";
    return `${num} units`;
  };
  const settingsSummaryLabel =
    settingsYear === selectedYear
      ? `Planned units for ${settingsYear}`
      : `Planned units (current year ${settingsYear})`;

  const formatTypeBreakdown = (
    byType: Partial<Record<ContributionTypeCanonical, number>>,
  ) =>
    CONTRIBUTION_TYPE_KEYS.filter((type) => Number(byType[type] ?? 0) > 0)
      .map(
        (type) =>
          `${CONTRIBUTION_TYPE_SHORT_LABELS[type]}: ${formatCurrency(
            Number(byType[type] ?? 0),
          )}`,
      )
      .join(" | ");

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAllCsv = () => {
    if (!group) return;
    const lines: string[] = [];
    const pushRow = (values: Array<string | number>) => {
      lines.push(
        values
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      );
    };

    pushRow(["Group Contribution Dashboard - All Types Summary"]);
    pushRow([group.name]);
    pushRow([`Year`, selectedYear]);
    pushRow([`Members`, visibleRows.length]);
    pushRow([`Expected YTD`, formatCurrency(allContributionSummary.expectedTotal)]);
    pushRow([`Collected YTD`, formatCurrency(allContributionSummary.collectedTotal)]);
    pushRow([`Arrears YTD`, formatCurrency(allContributionSummary.arrears)]);
    pushRow([`Collection Rate`, `${allContributionSummary.collectionRate}%`]);
    pushRow([]);
    pushRow([
      "Type",
      "Expected YTD",
      "Collected YTD",
      "Arrears",
      "Collection Rate",
      "Share of Collected",
      "Members in Arrears",
    ]);
    allTypeComparisons.forEach((type) => {
      pushRow([
        type.label,
        formatCurrency(type.expectedTotal),
        formatCurrency(type.collectedTotal),
        formatCurrency(type.arrears),
        `${type.rate}%`,
        `${type.shareOfCollection}%`,
        type.membersInArrears,
      ]);
    });
    pushRow([]);
    pushRow([
      "S/N",
      "Member Name",
      "Serial",
      "Units",
      "Type Mix",
      ...MONTHS.map((month) => month.label),
      "YTD Total",
      "Expected YTD",
      "Arrears",
      "Status",
    ]);
    visibleRows.forEach((row, index) => {
      pushRow([
        index + 1,
        row.member.name,
        row.member.memberSerial ?? "-",
        row.units ?? "-",
        formatTypeBreakdown(row.ytdByType) || "-",
        ...row.monthAmounts.map((month) => {
          if (month.amount <= 0) return "-";
          const breakdown = formatTypeBreakdown(month.byType);
          return breakdown
            ? `${formatCurrency(month.amount)} (${breakdown})`
            : formatCurrency(month.amount);
        }),
        formatCurrency(row.ytdTotal),
        formatCurrency(row.expectedYtd),
        formatCurrency(row.arrears),
        row.status,
      ]);
    });
      pushRow([
        "Totals",
        `${visibleRows.length} members`,
        "-",
        tableTotals.unitsTotal > 0 ? tableTotals.unitsTotal : "-",
        "-",
        ...tableTotals.monthTotals.map((total) =>
          total > 0 ? formatCurrency(total) : "-",
        ),
        formatCurrency(tableTotals.ytdTotal),
        formatCurrency(tableTotals.expectedYtd),
        formatCurrency(tableTotals.arrears),
        tableTotals.status,
      ]);

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const safeName = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadBlob(
      blob,
      `group-contribution-all-summary-${safeName}-${selectedYear}.csv`,
    );
  };

  const exportAllPdf = () => {
    if (!group) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      throw new Error("Unable to open print window for PDF export.");
    }

    const rowsHtml = visibleRows
      .map((row, index) => {
        const monthCells = row.monthAmounts
          .map((month) => {
            if (month.amount <= 0) return "<td>-</td>";
            const breakdown = formatTypeBreakdown(month.byType);
            return `<td><div>${escapeHtml(
              formatCurrency(month.amount),
            )}</div>${
              breakdown
                ? `<div class="sub">${escapeHtml(breakdown)}</div>`
                : ""
            }</td>`;
          })
          .join("");

        return `<tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.member.name)}</td>
          <td>${escapeHtml(row.member.memberSerial ?? "-")}</td>
          <td>${escapeHtml(String(row.units ?? "-"))}</td>
          <td>${escapeHtml(formatTypeBreakdown(row.ytdByType) || "-")}</td>
          ${monthCells}
          <td>${escapeHtml(formatCurrency(row.ytdTotal))}</td>
          <td>${escapeHtml(formatCurrency(row.expectedYtd))}</td>
          <td>${escapeHtml(formatCurrency(row.arrears))}</td>
          <td>${escapeHtml(row.status)}</td>
        </tr>`;
      })
      .join("");

    const comparisonHtml = allTypeComparisons
      .map(
        (type) => `<tr>
          <td>${escapeHtml(type.label)}</td>
          <td>${escapeHtml(formatCurrency(type.expectedTotal))}</td>
          <td>${escapeHtml(formatCurrency(type.collectedTotal))}</td>
          <td>${escapeHtml(formatCurrency(type.arrears))}</td>
          <td>${escapeHtml(`${type.rate}%`)}</td>
          <td>${escapeHtml(`${type.shareOfCollection}%`)}</td>
          <td>${escapeHtml(formatRateDelta(type.rateGap))}</td>
        </tr>`,
      )
      .join("");

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(group.name)} - All Contributions ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            h2 { margin: 24px 0 12px; font-size: 16px; }
            p { margin: 0; color: #475569; }
            .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
            .label { font-size: 11px; text-transform: uppercase; color: #64748b; }
            .value { margin-top: 8px; font-size: 18px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; text-align: left; }
            th { background: #f8fafc; }
            .sub { margin-top: 2px; color: #64748b; font-size: 9px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(group.name)}</h1>
          <p>All contribution types summary · ${selectedYear}</p>
          <div class="grid">
            <div class="card"><div class="label">Expected YTD</div><div class="value">${escapeHtml(formatCurrency(allContributionSummary.expectedTotal))}</div></div>
            <div class="card"><div class="label">Collected YTD</div><div class="value">${escapeHtml(formatCurrency(allContributionSummary.collectedTotal))}</div></div>
            <div class="card"><div class="label">Arrears</div><div class="value">${escapeHtml(formatCurrency(allContributionSummary.arrears))}</div></div>
            <div class="card"><div class="label">Collection Rate</div><div class="value">${escapeHtml(`${allContributionSummary.collectionRate}%`)}</div></div>
          </div>
          <h2>Comparison by Contribution Type</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Expected</th>
                <th>Collected</th>
                <th>Arrears</th>
                <th>Rate</th>
                <th>Share</th>
                <th>Gap vs Overall</th>
              </tr>
            </thead>
            <tbody>${comparisonHtml}</tbody>
          </table>
          <h2>Member Ledger</h2>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Member</th>
                <th>Serial</th>
                <th>Units</th>
                <th>Type Mix</th>
                ${MONTHS.map((month) => `<th>${month.label}</th>`).join("")}
                <th>YTD Total</th>
                <th>Expected YTD</th>
                <th>Arrears</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExport = async (format: "pdf" | "csv" | "xlsx") => {
    if (!group) return;
    if (selectedType === "all") {
      setExportingFormat(format);
      try {
        if (format === "csv") {
          exportAllCsv();
        } else if (format === "pdf") {
          exportAllPdf();
        } else {
          throw new Error(
            "XLSX export is not available for the All tab yet. Use CSV or PDF.",
          );
        }
        toast({
          title: "Export Complete",
          description:
            format === "pdf"
              ? "Print dialog opened. Choose Save as PDF to download the report."
              : `Aggregated contribution summary exported as ${format.toUpperCase()}.`,
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
      return;
    }

    setExportingFormat(format);
    try {
      const response = await downloadGroupContributionLedgerExport(group.id, {
        year: selectedYear,
        contributionType: selectedType,
        interestType:
          selectedType === "interest" ? selectedInterestType : undefined,
        search: searchQuery || undefined,
        sortBy,
        format,
      });
      const url = URL.createObjectURL(response.blob);
      const link = document.createElement("a");
      const safeName = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const typeLabel =
        selectedType === "interest"
          ? `interest-${selectedInterestType}`
          : selectedType;
      link.href = url;
      link.download =
        response.filename ||
        `contribution-ledger-${safeName}-${typeLabel}-${selectedYear}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: `Contribution ledger exported as ${format.toUpperCase()}.`,
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
            aria-label="Close contribution dashboard"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="right-6 bottom-6 left-6 absolute">
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-emerald-200 text-xs uppercase tracking-[0.3em]">
                Contribution Tracking Dashboard
              </span>
              <div className="flex lg:flex-row flex-col lg:justify-between lg:items-end gap-2">
                <div>
                  <h2 className="font-bold text-white text-2xl">
                    {group.name}
                  </h2>
                  <p className="text-emerald-100 text-sm">
                    {selectedTypeMeta?.label} | {selectedYear} | {totalMembers}{" "}
                    members
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {yearOptions.length > 1 && (
                    <select
                      value={selectedYear}
                      onChange={(event) =>
                        handleYearSelect(Number(event.target.value))
                      }
                      className="bg-white/10 backdrop-blur-sm px-4 py-2 border border-white/30 rounded-full font-semibold text-white text-xs"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  )}
                  {!canViewAll && (
                    <span className="bg-amber-100/20 px-4 py-2 border border-amber-200/40 rounded-full font-semibold text-amber-100 text-xs">
                      Showing your data only
                    </span>
                  )}
                  <span className="bg-white/10 px-4 py-2 border border-white/30 rounded-full font-semibold text-white text-xs">
                    Updated {currentDate.toLocaleDateString("en-US")}
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
                {DASHBOARD_TYPES.map((type) => (
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
              <div className="flex flex-wrap items-center gap-3 w-full max-w-3xl">
                {selectedType === "interest" && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 border border-gray-200 rounded-full font-semibold text-gray-600 text-xs">
                    <span>Interest for</span>
                    <select
                      value={selectedInterestType}
                      onChange={(event) =>
                        setSelectedInterestType(
                          event.target.value as ContributionTypeCanonical,
                        )
                      }
                      className="bg-transparent focus:outline-none font-semibold text-gray-800"
                    >
                      {ContributionTypeOptions.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="relative w-full max-w-xs">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as ContributionSortOption)
                  }
                  className="bg-white px-4 py-2 border border-slate-200 rounded-full font-semibold text-gray-600 text-xs"
                >
                  {CONTRIBUTION_SORT_OPTIONS.map((option) => (
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
                      disabled={!!exportingFormat || isTableLoading}
                    >
                      <Download className="w-4 h-4" />
                      {exportingFormat ? "Exporting..." : "Export"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                    {selectedType !== "all" && (
                      <DropdownMenuItem
                        onClick={() => void handleExport("xlsx")}
                        disabled={exportingFormat === "xlsx"}
                      >
                        Export XLSX
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    {selectedType === "all" ? "Total Expected YTD" : "Expected YTD"}
                  </p>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="mt-2 font-semibold text-gray-900 text-2xl">
                  {isSummaryLoading
                    ? "-"
                    : formatCurrency(collectionSummary.expectedTotal)}
                </p>
                <p className="text-gray-500 text-xs">
                  {totalMembers} members | {monthsToDate} months
                </p>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    {selectedType === "all"
                      ? "Total Contributions"
                      : "Collected YTD"}
                  </p>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="mt-2 font-semibold text-emerald-600 text-2xl">
                  {isSummaryLoading
                    ? "-"
                    : formatCurrency(collectionSummary.collectedTotal)}
                </p>
                <p className="text-gray-500 text-xs">
                  {isSummaryLoading
                    ? "-"
                    : `${collectionSummary.collectionRate}% collection rate`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(collectionSummary.collectionRate, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    {selectedType === "all" ? "Arrears Summary" : "Arrears YTD"}
                  </p>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="mt-2 font-semibold text-rose-600 text-2xl">
                  {isSummaryLoading
                    ? "-"
                    : formatCurrency(collectionSummary.arrears)}
                </p>
                <p className="text-gray-500 text-xs">
                  {isSummaryLoading
                    ? "-"
                    : `${collectionSummary.membersInArrears} members behind`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all"
                    style={{
                      width: `${Math.min(
                        collectionSummary.expectedTotal > 0
                          ? Math.max(
                              (collectionSummary.arrears /
                                collectionSummary.expectedTotal) *
                                100,
                              0,
                            )
                          : 0,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Avg Expected Monthly
                  </p>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
                <p className="mt-2 font-semibold text-gray-900 text-2xl">
                  {formatCurrency(averageExpectedMonthly)}
                </p>
                <p className="text-gray-500 text-xs">
                  {selectedTypeMeta?.description || "Expected monthly target"}
                </p>
              </div>
              <div className="bg-white shadow-sm p-4 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Settings Summary
                  </p>
                  <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                </div>
                <div className="space-y-1 mt-2 text-gray-500 text-xs">
                  <div className="flex justify-between">
                    <span>Revolving</span>
                    <span className="font-semibold text-gray-900">
                      {formatUnitsLabel(settingsUnits?.revolving)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Endwell</span>
                    <span className="font-semibold text-gray-900">
                      {formatUnitsLabel(settingsUnits?.endwell)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Festival</span>
                    <span className="font-semibold text-gray-900">
                      {formatUnitsLabel(settingsUnits?.festive)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  {settingsSummaryLabel}
                </p>
              </div>
            </div>

            <div className="bg-white shadow-sm p-5 border border-slate-200 rounded-2xl">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {selectedType === "all"
                      ? "Comparison to Individual Contribution Types"
                      : "Totals by Contribution Type"}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {selectedType === "all"
                      ? "See how the combined all-types position compares with each individual contribution stream."
                      : "Tracking totals across all four contribution types in the same format."}
                  </p>
                </div>
                <span className="text-gray-400 text-xs">
                  Year to date overview
                </span>
              </div>
              <div className="gap-4 grid md:grid-cols-2 xl:grid-cols-4">
                {allTypeComparisons.map((type) => (
                  <div
                    key={type.value}
                    className={`rounded-xl border px-4 py-3 ${
                      selectedType === type.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
                        {type.label}
                      </p>
                      <span className="font-semibold text-gray-500 text-xs">
                        {type.rate}% rate
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          type.rate >= 85
                            ? "bg-emerald-500"
                            : type.rate >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(Math.max(type.rate, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <div className="space-y-1 mt-3 text-gray-500 text-xs">
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
                      {selectedType === "all" && (
                        <div className="flex justify-between">
                          <span>Share of all</span>
                          <span className="font-semibold text-sky-600">
                            {type.shareOfCollection}%
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Arrears</span>
                        <span
                          className={`font-semibold ${
                            type.arrears > 0 ? "text-rose-600" : "text-gray-700"
                          }`}
                        >
                          {formatCurrency(type.arrears)}
                        </span>
                      </div>
                      {selectedType === "all" && (
                        <>
                          <div className="flex justify-between">
                            <span>Rate gap</span>
                            <span
                              className={`font-semibold ${
                                type.rateGap >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {formatRateDelta(type.rateGap)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Members in arrears</span>
                            <span className="font-semibold text-gray-900">
                              {type.membersInArrears}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl">
              <div className="flex flex-wrap justify-between items-center gap-3 px-5 py-4 border-slate-200 border-b">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {selectedType === "all"
                      ? "All Contributions Summary Ledger"
                      : selectedType === "interest"
                      ? "Member Interest Ledger"
                      : "Member Contribution Ledger"}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {selectedType === "all"
                      ? `Combined monthly and type-by-type contribution tracking in ${selectedYear}`
                      : `${selectedTypeMeta?.label} tracking in ${selectedYear}`}
                  </p>
                </div>
                <div className="text-gray-500 text-xs">
                  Avg Expected Monthly: {formatCurrency(averageExpectedMonthly)}
                  {selectedType !== "all" && resolvedUnitAmount ? (
                    <span>
                      {" "}
                      | Planned Units (avg):{" "}
                      {plannedUnitsSummary.average ?? "-"} @{" "}
                      {formatCurrency(resolvedUnitAmount)} per unit
                    </span>
                  ) : (
                    <span>
                      {" "}
                      | Planned Units (avg): {plannedUnitsSummary.average ?? "-"}
                      {selectedType === "all"
                        ? " across tracked contribution types"
                        : ""}
                    </span>
                  )}
                </div>
              </div>

              {isTableLoading ? (
                <div className="py-16 text-gray-500 text-sm text-center">
                  Loading contribution dashboard...
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="py-16 text-gray-500 text-sm text-center">
                  No members found for the current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1500px] text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-left">
                          S/N
                        </th>
                        <th className="px-4 py-3 font-semibold text-left">
                          Member Name
                        </th>
                        <th className="px-4 py-3 font-semibold text-left">
                          Serial
                        </th>
                        <th className="px-4 py-3 font-semibold text-left">
                          Units
                        </th>
                        {selectedType === "all" && (
                          <th className="px-4 py-3 font-semibold text-left">
                            Type Mix
                          </th>
                        )}
                        {MONTHS.map((month) => (
                          <th
                            key={month.value}
                            className="px-3 py-3 font-semibold text-center"
                          >
                            {month.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-semibold text-left">
                          YTD Total
                        </th>
                        <th className="px-4 py-3 font-semibold text-left">
                          Expected YTD
                        </th>
                        <th className="px-4 py-3 font-semibold text-left">
                          Arrears
                        </th>
                        <th className="px-4 py-3 font-semibold text-left">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRows.map((row, rowIndex) => (
                        <tr
                          key={row.member.id}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 text-gray-500">
                            {rowIndex + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={row.member.avatar}
                                alt={row.member.name}
                                className="rounded-full w-8 h-8 object-cover"
                              />
                              <span className="font-medium text-gray-900">
                                {row.member.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {row.member.memberSerial ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.units ?? "-"}
                          </td>
                          {selectedType === "all" && (
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {formatTypeBreakdown(row.ytdByType) || "-"}
                            </td>
                          )}
                          {row.monthAmounts.map((month, index) => (
                            <td
                              key={`${row.member.id}-${MONTHS[index].value}`}
                              className="px-3 py-3 text-gray-700 text-center"
                            >
                              {month.amount > 0 ? (
                                <div className="space-y-1">
                                  <div>{formatCurrency(month.amount)}</div>
                                  {selectedType === "all" &&
                                    formatTypeBreakdown(month.byType) && (
                                      <div className="text-[10px] text-slate-400">
                                        {formatTypeBreakdown(month.byType)}
                                      </div>
                                    )}
                                </div>
                              ) : (
                                "-"
                              )}
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
                        <td className="px-4 py-3 font-semibold text-gray-700 text-sm">
                          Totals
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700 text-sm">
                          {visibleRows.length} members
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">-</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {tableTotals.unitsTotal > 0
                            ? tableTotals.unitsTotal
                            : "-"}
                        </td>
                        {selectedType === "all" && (
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            -
                          </td>
                        )}
                        {tableTotals.monthTotals.map((total, index) => (
                          <td
                            key={`total-${MONTHS[index].value}`}
                            className="px-3 py-3 font-semibold text-gray-700 text-sm text-center"
                          >
                            {total > 0 ? formatCurrency(total) : "-"}
                          </td>
                        ))}
                        <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                          {formatCurrency(tableTotals.ytdTotal)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {formatCurrency(tableTotals.expectedYtd)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-rose-600 text-sm">
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

/*

*/
