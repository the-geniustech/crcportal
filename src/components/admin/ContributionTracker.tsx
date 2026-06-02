import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  MoreHorizontal,
  Search,
  TrendingUp,
} from "lucide-react";
import AdminGroupFilter from "@/components/admin/AdminGroupFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMarkContributionPaidMutation } from "@/hooks/admin/useMarkContributionPaidMutation";
import {
  downloadContributionTrackerExport,
  listContributionTrackerEntries,
  sendContributionReminders,
  updateTrackedContribution,
  type AdminContributionTrackerEntry,
} from "@/lib/admin";
import {
  ContributionTypeOptions,
  calculateContributionInterestForType,
  calculateContributionUnits,
  formatNaira,
  getContributionTypeConfig,
  getContributionTypeLabel,
  type ContributionTypeCanonical,
  validateContributionAmount,
} from "@/lib/contributionPolicy";

interface ContributionRecord {
  id: string;
  userId: string;
  groupId: string;
  contributionType?: ContributionTypeCanonical | null;
  memberName: string;
  memberSerial?: string | null;
  groupName: string;
  expectedAmount: number;
  paidAmount: number;
  expectedUnits?: number;
  paidUnits?: number;
  dueDate: string | null;
  status: "paid" | "partial" | "pending" | "defaulted";
  monthsDefaulted: number;
}

interface ContributionTrackerProps {
  contributions: ContributionRecord[];
  year: number;
  month: number;
  contributionType: ContributionTypeCanonical;
  onContributionTypeChange?: (value: ContributionTypeCanonical) => void;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  selectedGroupId?: string;
  onGroupChange?: (groupId: string) => void;
  canManageActions?: boolean;
}

type ManualPaymentMethod =
  | "bank_transfer"
  | "cash"
  | "card"
  | "pos"
  | "mobile_money"
  | "cheque"
  | "other";

type ManualPaymentFormState = {
  amount: string;
  month: string;
  year: string;
  paymentMethod: ManualPaymentMethod;
  paymentReference: string;
  description: string;
};

type ContributionSortOption =
  | "member_name_asc"
  | "member_name_desc"
  | "group_name_asc"
  | "group_name_desc"
  | "expected_desc"
  | "expected_asc"
  | "paid_desc"
  | "paid_asc"
  | "status"
  | "defaulted_desc";

type ContributionEditFormState = {
  amount: string;
  month: string;
  year: string;
  paymentMethod: ManualPaymentMethod;
  paymentReference: string;
  notes: string;
};

const PAYMENT_METHOD_OPTIONS: Array<{
  value: ManualPaymentMethod;
  label: string;
}> = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "pos", label: "POS" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS: Array<{
  value: ContributionSortOption;
  label: string;
}> = [
  { value: "member_name_asc", label: "Member Name (A-Z)" },
  { value: "member_name_desc", label: "Member Name (Z-A)" },
  { value: "group_name_asc", label: "Group (A-Z)" },
  { value: "group_name_desc", label: "Group (Z-A)" },
  { value: "expected_desc", label: "Expected Units (High-Low)" },
  { value: "expected_asc", label: "Expected Units (Low-High)" },
  { value: "paid_desc", label: "Paid Units (High-Low)" },
  { value: "paid_asc", label: "Paid Units (Low-High)" },
  { value: "status", label: "Status" },
  { value: "defaulted_desc", label: "Most Defaulted" },
];

const buildPageItems = (currentPage: number, totalPages: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  if (currentPage > 3) pages.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
};

const parseRecordPeriod = (
  record: ContributionRecord,
  fallbackYear: number,
  fallbackMonth: number,
) => {
  const parts = String(record.id).split("|");
  const parsedYear = Number(parts[2]);
  const parsedMonth = Number(parts[3]);

  return {
    year:
      Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
        ? parsedYear
        : fallbackYear,
    month:
      Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : fallbackMonth,
  };
};

const sortContributionRecords = (
  records: ContributionRecord[],
  sortBy: ContributionSortOption,
) => {
  const next = [...records];
  next.sort((left, right) => {
    const memberCompare = left.memberName.localeCompare(
      right.memberName,
      "en",
      {
        sensitivity: "base",
      },
    );
    const groupCompare = left.groupName.localeCompare(right.groupName, "en", {
      sensitivity: "base",
    });

    switch (sortBy) {
      case "member_name_desc":
        return -memberCompare || groupCompare;
      case "group_name_asc":
        return groupCompare || memberCompare;
      case "group_name_desc":
        return -groupCompare || memberCompare;
      case "expected_desc":
        return right.expectedAmount - left.expectedAmount || memberCompare;
      case "expected_asc":
        return left.expectedAmount - right.expectedAmount || memberCompare;
      case "paid_desc":
        return right.paidAmount - left.paidAmount || memberCompare;
      case "paid_asc":
        return left.paidAmount - right.paidAmount || memberCompare;
      case "status": {
        const statusOrder = {
          paid: 0,
          partial: 1,
          pending: 2,
          defaulted: 3,
        };
        return (
          statusOrder[left.status] - statusOrder[right.status] || memberCompare
        );
      }
      case "defaulted_desc":
        return right.monthsDefaulted - left.monthsDefaulted || memberCompare;
      case "member_name_asc":
      default:
        return memberCompare || groupCompare;
    }
  });
  return next;
};

const formatUnitNumber = (value: number) => {
  const safe = Number(value);
  if (!Number.isFinite(safe) || safe <= 0) return "0";
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(safe) ? 0 : 2,
  }).format(safe);
};

const amountToUnitNumber = (amount: number) =>
  calculateContributionUnits(Number(amount || 0));

const formatContributionUnits = (amount: number) =>
  formatUnitNumber(amountToUnitNumber(amount));

const formatContributionUnitDelta = (amount: number) => {
  const units = Number(amount || 0) / 1000;
  if (!Number.isFinite(units) || units === 0) return "0";
  const sign = units > 0 ? "+" : "-";
  return `${sign}${formatUnitNumber(Math.abs(units))}`;
};

const getRecordExpectedUnits = (record: ContributionRecord) => {
  const explicit = Number(record.expectedUnits);
  return Number.isFinite(explicit)
    ? explicit
    : amountToUnitNumber(record.expectedAmount);
};

const getRecordPaidUnits = (record: ContributionRecord) => {
  const explicit = Number(record.paidUnits);
  return Number.isFinite(explicit)
    ? explicit
    : amountToUnitNumber(record.paidAmount);
};

const getDefaultManualAmount = (
  record: ContributionRecord,
  contributionType: ContributionTypeCanonical,
) => {
  const typeConfig = getContributionTypeConfig(contributionType);
  const remaining = Math.max(
    0,
    Number(record.expectedAmount || 0) - Number(record.paidAmount || 0),
  );
  if (remaining > 0) return remaining;
  return Math.max(
    Number(record.expectedAmount || 0),
    Number(typeConfig?.minAmount || 1000),
  );
};

const buildManualPaymentDraft = (
  record: ContributionRecord,
  contributionType: ContributionTypeCanonical,
  fallbackYear: number,
  fallbackMonth: number,
): ManualPaymentFormState => {
  const period = parseRecordPeriod(record, fallbackYear, fallbackMonth);
  return {
    amount: String(getDefaultManualAmount(record, contributionType)),
    month: String(period.month),
    year: String(period.year),
    paymentMethod: "bank_transfer",
    paymentReference: "",
    description: "",
  };
};

const buildContributionEditDraft = (
  entry: AdminContributionTrackerEntry,
): ContributionEditFormState => ({
  amount: String(Number(entry.amount || 0)),
  month: String(Number(entry.month || new Date().getMonth() + 1)),
  year: String(Number(entry.year || new Date().getFullYear())),
  paymentMethod:
    (entry.paymentMethod as ManualPaymentMethod | null) || "bank_transfer",
  paymentReference: entry.paymentReference || "",
  notes: entry.notes || "",
});

export default function ContributionTracker({
  contributions,
  year,
  month,
  contributionType,
  onContributionTypeChange,
  onYearChange,
  onMonthChange,
  selectedGroupId,
  onGroupChange,
  canManageActions = true,
}: ContributionTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const markPaidMutation = useMarkContributionPaidMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] =
    useState<ContributionSortOption>("member_name_asc");
  const [localGroupFilter, setLocalGroupFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingFormat, setExportingFormat] = useState<null | "csv" | "xlsx">(
    null,
  );
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTargets, setReminderTargets] = useState<ContributionRecord[]>(
    [],
  );
  const [reminderChannels, setReminderChannels] = useState({
    email: false,
    sms: false,
    notification: true,
  });
  const [sendingReminder, setSendingReminder] = useState(false);
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
  const [confirmManualPaymentOpen, setConfirmManualPaymentOpen] =
    useState(false);
  const [editContributionOpen, setEditContributionOpen] = useState(false);
  const [confirmContributionEditOpen, setConfirmContributionEditOpen] =
    useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<ContributionRecord | null>(null);
  const [selectedEditEntryId, setSelectedEditEntryId] = useState<string | null>(
    null,
  );
  const [manualPaymentForm, setManualPaymentForm] =
    useState<ManualPaymentFormState>({
      amount: "",
      month: String(month),
      year: String(year),
      paymentMethod: "bank_transfer",
      paymentReference: "",
      description: "",
    });
  const [editContributionForm, setEditContributionForm] =
    useState<ContributionEditFormState>({
      amount: "",
      month: String(month),
      year: String(year),
      paymentMethod: "bank_transfer",
      paymentReference: "",
      notes: "",
    });

  const pageSize = 10;
  const isGroupFilterControlled =
    typeof selectedGroupId !== "undefined" &&
    typeof onGroupChange === "function";
  const groupFilter = isGroupFilterControlled
    ? (selectedGroupId ?? "all")
    : localGroupFilter;

  const handleGroupFilterChange = (value: string) => {
    if (!isGroupFilterControlled) {
      setLocalGroupFilter(value);
    }
    onGroupChange?.(value);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    sortBy,
    groupFilter,
    year,
    month,
    contributionType,
  ]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, idx) => currentYear - idx);
  }, []);

  const monthOptions = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    [],
  );

  const groupScopedContributions = useMemo(
    () =>
      contributions.filter(
        (record) => groupFilter === "all" || record.groupId === groupFilter,
      ),
    [contributions, groupFilter],
  );

  const filteredContributions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = groupScopedContributions.filter((record) => {
      const matchesSearch =
        record.memberName.toLowerCase().includes(query) ||
        record.groupName.toLowerCase().includes(query) ||
        (record.memberSerial
          ? record.memberSerial.toLowerCase().includes(query)
          : false);
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return sortContributionRecords(filtered, sortBy);
  }, [groupScopedContributions, searchQuery, sortBy, statusFilter]);

  const total = filteredContributions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);
  const pagedContributions = filteredContributions.slice(
    (currentPage - 1) * pageSize,
    pageEnd,
  );
  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const defaulters = groupScopedContributions.filter(
    (record) => record.status === "defaulted",
  );

  const totalExpected = groupScopedContributions.reduce(
    (sum, record) => sum + Number(record.expectedAmount || 0),
    0,
  );
  const totalPaid = groupScopedContributions.reduce(
    (sum, record) => sum + Number(record.paidAmount || 0),
    0,
  );
  const collectionRate =
    totalExpected > 0
      ? (totalPaid / totalExpected) * 100
      : contributionType === "special" && groupScopedContributions.length > 0
        ? (groupScopedContributions.filter((record) => record.paidAmount > 0)
            .length /
            groupScopedContributions.length) *
          100
        : 0;
  const contributionTypeConfig = getContributionTypeConfig(contributionType);
  const selectedRecordPeriod = selectedRecord
    ? parseRecordPeriod(selectedRecord, year, month)
    : { year, month };
  const trackerEntriesQuery = useQuery({
    queryKey: [
      "admin",
      "contributions",
      "tracker",
      "entries",
      selectedRecord?.userId ?? "none",
      selectedRecord?.groupId ?? "none",
      contributionType,
      selectedRecordPeriod.year,
      selectedRecordPeriod.month,
    ],
    enabled: editContributionOpen && !!selectedRecord,
    queryFn: async () =>
      listContributionTrackerEntries({
        userId: String(selectedRecord?.userId || ""),
        groupId: String(selectedRecord?.groupId || ""),
        year: selectedRecordPeriod.year,
        month: selectedRecordPeriod.month,
        contributionType,
      }),
  });
  const updateContributionMutation = useMutation({
    mutationFn: ({
      contributionId,
      payload,
    }: {
      contributionId: string;
      payload: {
        amount: number;
        month: number;
        year: number;
        paymentMethod?: string;
        paymentReference?: string;
        notes?: string;
      };
    }) => updateTrackedContribution(contributionId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin", "contributions", "tracker"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["group-contributions"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "groups"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "financial-reports"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["transactions", "me"],
        }),
      ]);
    },
  });
  const contributionEntries = useMemo(
    () => trackerEntriesQuery.data ?? [],
    [trackerEntriesQuery.data],
  );

  const manualAmount = Number(manualPaymentForm.amount);
  const manualMonth = Number(manualPaymentForm.month);
  const manualYear = Number(manualPaymentForm.year);
  const expectedAmount = Number(selectedRecord?.expectedAmount || 0);
  const alreadyPaidAmount = Number(selectedRecord?.paidAmount || 0);
  const totalAfterPayment =
    alreadyPaidAmount + (Number.isFinite(manualAmount) ? manualAmount : 0);
  const remainingAfterPayment = Math.max(0, expectedAmount - totalAfterPayment);
  const excessAfterPayment = Math.max(0, totalAfterPayment - expectedAmount);
  const computedUnits = Number.isFinite(manualAmount)
    ? calculateContributionUnits(manualAmount)
    : 0;
  const computedInterest = Number.isFinite(manualAmount)
    ? calculateContributionInterestForType(contributionType, manualAmount)
    : 0;
  const predictedStatus =
    totalAfterPayment >= expectedAmount && expectedAmount > 0
      ? "paid"
      : totalAfterPayment > 0
        ? "partial"
        : "pending";
  const manualPaymentValidation = useMemo(() => {
    if (!Number.isFinite(manualAmount) || manualAmount <= 0) {
      return {
        valid: false,
        message: "Enter a valid contribution amount.",
      };
    }
    return validateContributionAmount(contributionType, manualAmount);
  }, [contributionType, manualAmount]);

  const manualQuickAmounts = useMemo(() => {
    const recommended = selectedRecord
      ? getDefaultManualAmount(selectedRecord, contributionType)
      : 0;
    const minimumAmount = Number(contributionTypeConfig?.minAmount || 1000);
    const stepAmount = Number(
      contributionTypeConfig?.stepAmount ||
        contributionTypeConfig?.unitAmount ||
        minimumAmount,
    );
    const values = [
      recommended,
      expectedAmount,
      minimumAmount,
      minimumAmount + stepAmount,
      minimumAmount + stepAmount * 2,
      minimumAmount + stepAmount * 4,
    ];
    const seen = new Set<number>();
    return values.filter((value) => {
      const safeValue = Math.round(Number(value || 0));
      if (!Number.isFinite(safeValue) || safeValue <= 0) return false;
      if (seen.has(safeValue)) return false;
      seen.add(safeValue);
      return true;
    });
  }, [
    contributionType,
    contributionTypeConfig,
    expectedAmount,
    selectedRecord,
  ]);

  useEffect(() => {
    if (!editContributionOpen) return;
    if (contributionEntries.length === 0) {
      setSelectedEditEntryId(null);
      return;
    }

    setSelectedEditEntryId((current) => {
      if (
        current &&
        contributionEntries.some((entry) => entry.id === current)
      ) {
        return current;
      }
      return contributionEntries[0]?.id ?? null;
    });
  }, [contributionEntries, editContributionOpen]);

  const selectedEditEntry = useMemo(
    () =>
      contributionEntries.find((entry) => entry.id === selectedEditEntryId) ||
      null,
    [contributionEntries, selectedEditEntryId],
  );

  useEffect(() => {
    if (!selectedEditEntry) return;
    setEditContributionForm(buildContributionEditDraft(selectedEditEntry));
    setConfirmContributionEditOpen(false);
  }, [selectedEditEntry]);

  const editAmount = Number(editContributionForm.amount);
  const editMonth = Number(editContributionForm.month);
  const editYear = Number(editContributionForm.year);
  const editPreviousAmount = Number(selectedEditEntry?.amount || 0);
  const editAmountDelta = editAmount - editPreviousAmount;
  const editComputedUnits = Number.isFinite(editAmount)
    ? calculateContributionUnits(editAmount)
    : 0;
  const editComputedInterest = Number.isFinite(editAmount)
    ? calculateContributionInterestForType(contributionType, editAmount)
    : 0;
  const editValidation = useMemo(() => {
    if (!selectedEditEntry) {
      return { valid: false, message: "Select a contribution entry to edit." };
    }
    if (!Number.isFinite(editAmount) || editAmount <= 0) {
      return {
        valid: false,
        message: "Enter a valid contribution amount.",
      };
    }
    return validateContributionAmount(contributionType, editAmount);
  }, [contributionType, editAmount, selectedEditEntry]);

  const reminderSummary = useMemo(() => {
    if (reminderTargets.length === 0) return "No recipients selected";
    if (reminderTargets.length === 1) {
      return `Send reminder to ${reminderTargets[0].memberName}`;
    }
    return `Send reminders to ${reminderTargets.length} members`;
  }, [reminderTargets]);

  const canSendReminder =
    reminderChannels.email ||
    reminderChannels.sms ||
    reminderChannels.notification;

  const selectedMonthLabel =
    monthOptions[manualMonth - 1] ||
    new Date(manualYear, Math.max(manualMonth - 1, 0), 1).toLocaleDateString(
      "en-US",
      {
        month: "long",
      },
    );
  const selectedEditMonthLabel =
    monthOptions[editMonth - 1] ||
    new Date(editYear, Math.max(editMonth - 1, 0), 1).toLocaleDateString(
      "en-US",
      {
        month: "long",
      },
    );

  const handleExport = async (format: "csv" | "xlsx") => {
    if (filteredContributions.length === 0) {
      toast({
        title: "Nothing to export",
        description:
          "No contribution records match the current filters for export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setExportingFormat(format);
      const { blob, filename } = await downloadContributionTrackerExport({
        year,
        month,
        groupId: groupFilter !== "all" ? groupFilter : undefined,
        contributionType,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
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
        title: "Export ready",
        description: `Contribution tracker ${format.toUpperCase()} downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to export contribution tracker.",
        variant: "destructive",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const getStatusBadge = (status: string, monthsDefaulted: number) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle className="mr-1 w-3 h-3" />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Clock className="mr-1 w-3 h-3" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="mr-1 w-3 h-3" />
            Pending
          </Badge>
        );
      case "defaulted":
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="mr-1 w-3 h-3" />
            {monthsDefaulted}mo Defaulted
          </Badge>
        );
      default:
        return null;
    }
  };

  const resetManualPaymentFlow = () => {
    setManualPaymentOpen(false);
    setConfirmManualPaymentOpen(false);
    setSelectedRecord(null);
    setManualPaymentForm({
      amount: "",
      month: String(month),
      year: String(year),
      paymentMethod: "bank_transfer",
      paymentReference: "",
      description: "",
    });
  };

  const resetEditContributionFlow = () => {
    setEditContributionOpen(false);
    setConfirmContributionEditOpen(false);
    setSelectedEditEntryId(null);
    setSelectedRecord(null);
    setEditContributionForm({
      amount: "",
      month: String(month),
      year: String(year),
      paymentMethod: "bank_transfer",
      paymentReference: "",
      notes: "",
    });
  };

  const openReminderModal = (targets: ContributionRecord[]) => {
    if (!canManageActions) return;
    if (targets.length === 0) {
      toast({
        title: "No recipients",
        description:
          "There are no members to remind for the current selection.",
      });
      return;
    }

    setReminderTargets(targets);
    setReminderOpen(true);
  };

  const openManualPaymentModal = (record: ContributionRecord) => {
    if (!canManageActions) return;
    setSelectedRecord(record);
    setManualPaymentForm(
      buildManualPaymentDraft(record, contributionType, year, month),
    );
    setConfirmManualPaymentOpen(false);
    setManualPaymentOpen(true);
  };

  const openEditContributionModal = (record: ContributionRecord) => {
    if (!canManageActions) return;
    setSelectedRecord(record);
    setSelectedEditEntryId(null);
    setConfirmContributionEditOpen(false);
    setEditContributionOpen(true);
  };

  const buildChannelSummary = (
    label: string,
    channel?: {
      requested: boolean;
      sent: number;
      failed: number;
      skipped: number;
    },
  ) => {
    if (!channel || !channel.requested) return null;

    const segments = [`${label}: ${channel.sent} sent`];
    if (channel.failed > 0) segments.push(`${channel.failed} failed`);
    if (channel.skipped > 0) segments.push(`${channel.skipped} skipped`);
    return segments.join(", ");
  };

  const handleSendReminder = async () => {
    if (!canManageActions) return;
    if (!canSendReminder || reminderTargets.length === 0) return;

    setSendingReminder(true);
    try {
      const recipients = reminderTargets.map((target) => ({
        userId: target.userId,
        groupId: target.groupId,
      }));
      const response = await sendContributionReminders({
        year,
        month,
        recipients,
        sendEmail: reminderChannels.email,
        sendSMS: reminderChannels.sms,
        sendNotification: reminderChannels.notification,
      });
      const channelSummaries = [
        buildChannelSummary("Email", response.channels?.email),
        buildChannelSummary("SMS", response.channels?.sms),
        buildChannelSummary("In-app", response.channels?.notification),
      ].filter(Boolean);
      const summary =
        channelSummaries.length > 0
          ? channelSummaries.join(" | ")
          : "Delivery queued.";
      const recipientLabel =
        reminderTargets.length === 1 ? "member" : "members";

      toast({
        title: `Reminders sent to ${reminderTargets.length} ${recipientLabel}`,
        description: summary,
      });
      setReminderOpen(false);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Unable to send reminders.";

      toast({
        title: "Reminder failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleReviewContributionEdit = () => {
    if (!selectedEditEntry) {
      toast({
        title: "No contribution entry selected",
        description: "Choose the posted contribution entry you want to edit.",
        variant: "destructive",
      });
      return;
    }

    if (!editValidation.valid) {
      toast({
        title: "Invalid update",
        description:
          editValidation.message || "Enter a valid contribution amount.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(editMonth) || editMonth < 1 || editMonth > 12) {
      toast({
        title: "Invalid month",
        description: "Select a valid contribution month.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(editYear) || editYear < 2000 || editYear > 2100) {
      toast({
        title: "Invalid year",
        description: "Select a valid contribution year.",
        variant: "destructive",
      });
      return;
    }

    setConfirmContributionEditOpen(true);
  };

  const handleConfirmContributionEdit = async () => {
    if (!selectedRecord || !selectedEditEntry) return;

    try {
      const result = await updateContributionMutation.mutateAsync({
        contributionId: selectedEditEntry.id,
        payload: {
          amount: editAmount,
          month: editMonth,
          year: editYear,
          paymentMethod: editContributionForm.paymentMethod,
          paymentReference:
            editContributionForm.paymentReference.trim() || undefined,
          notes: editContributionForm.notes.trim() || undefined,
        },
      });

      toast({
        title: "Contribution updated",
        description: `${selectedRecord.memberName}'s ${getContributionTypeLabel(contributionType).toLowerCase()} entry was updated successfully${result.transaction?.reference ? ` (ref: ${result.transaction.reference})` : ""}.`,
      });
      resetEditContributionFlow();
    } catch (error) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to update this contribution entry.",
        variant: "destructive",
      });
    }
  };

  const handleReviewManualPayment = () => {
    if (!selectedRecord) return;

    if (!manualPaymentValidation.valid) {
      toast({
        title: "Invalid amount",
        description:
          manualPaymentValidation.message ||
          "Enter a valid contribution amount.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(manualMonth) || manualMonth < 1 || manualMonth > 12) {
      toast({
        title: "Invalid month",
        description: "Select the contribution month to post this payment to.",
        variant: "destructive",
      });
      return;
    }

    if (
      !Number.isFinite(manualYear) ||
      manualYear < 2000 ||
      manualYear > 2100
    ) {
      toast({
        title: "Invalid year",
        description: "Select a valid contribution year.",
        variant: "destructive",
      });
      return;
    }

    setConfirmManualPaymentOpen(true);
  };

  const handleConfirmManualPayment = async () => {
    if (!selectedRecord) return;

    try {
      const result = await markPaidMutation.mutateAsync({
        userId: selectedRecord.userId,
        groupId: selectedRecord.groupId,
        amount: manualAmount,
        month: manualMonth,
        year: manualYear,
        contributionType,
        paymentMethod: manualPaymentForm.paymentMethod,
        paymentReference:
          manualPaymentForm.paymentReference.trim() || undefined,
        description: manualPaymentForm.description.trim() || undefined,
      });

      toast({
        title: "Payment recorded",
        description: `${selectedRecord.memberName}'s manual ${getContributionTypeLabel(contributionType).toLowerCase()} payment of ${formatNaira(manualAmount)} for ${selectedMonthLabel} ${manualYear} has been posted successfully${result.transaction?.reference ? ` (ref: ${result.transaction.reference})` : ""}.`,
      });

      resetManualPaymentFlow();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Unable to record the manual contribution payment.";

      toast({
        title: "Manual payment failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">
                {contributionType === "special"
                  ? "Participation Rate"
                  : "Collection Rate"}
              </p>
              <p className="font-bold text-emerald-600 text-2xl">
                {collectionRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <Progress value={collectionRate} className="mt-2 h-2" />
        </div>

        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <p className="text-gray-500 text-sm">
            {contributionType === "special"
              ? "Monthly Benchmark Units"
              : "Total Expected Units"}
          </p>
          <p className="font-bold text-gray-900 text-2xl">
            {formatContributionUnits(totalExpected)}
          </p>
        </div>

        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <p className="text-gray-500 text-sm">Total Collected Units</p>
          <p className="font-bold text-emerald-600 text-2xl">
            {formatContributionUnits(totalPaid)}
          </p>
        </div>

        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Defaulters</p>
              <p className="font-bold text-red-600 text-2xl">
                {defaulters.length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {defaulters.length > 0 && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 w-5 h-5 text-red-600" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Defaulter Alert</h4>
              <p className="mt-1 text-red-600 text-sm">
                {defaulters.length} member(s) have outstanding contributions.
                {defaulters.filter((record) => record.monthsDefaulted >= 3)
                  .length > 0 &&
                  ` ${defaulters.filter((record) => record.monthsDefaulted >= 3).length} have been defaulting for 3+ months.`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {defaulters.slice(0, 5).map((record) => (
                  <Badge
                    key={record.id}
                    variant="outline"
                    className="bg-white border-red-300 text-red-700"
                  >
                    {record.memberName}
                    {record.memberSerial ? ` - ${record.memberSerial}` : ""} (
                    {record.monthsDefaulted}mo)
                  </Badge>
                ))}
                {defaulters.length > 5 && (
                  <Badge
                    variant="outline"
                    className="bg-white border-red-300 text-red-700"
                  >
                    +{defaulters.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
            {canManageActions && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => openReminderModal(defaulters)}
              >
                Send Reminders
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
        <div className="flex md:flex-row flex-col gap-4">
          <div className="relative flex-1">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={contributionType}
            onValueChange={(value) =>
              onContributionTypeChange?.(value as ContributionTypeCanonical)
            }
            disabled={!onContributionTypeChange}
          >
            <SelectTrigger className="w-full md:w-52">
              <SelectValue placeholder="Contribution type" />
            </SelectTrigger>
            <SelectContent>
              {ContributionTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="defaulted">Defaulted</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) =>
              setSortBy(value as ContributionSortOption)
            }
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort records" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AdminGroupFilter
            value={groupFilter}
            onValueChange={handleGroupFilterChange}
            allLabel="All groups"
            placeholder="Filter by group"
            className="md:w-56"
          />
          <Select
            value={String(year)}
            onValueChange={(value) => onYearChange?.(Number(value))}
            disabled={!onYearChange}
          >
            <SelectTrigger className="w-full md:w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(month)}
            onValueChange={(value) => onMonthChange?.(Number(value))}
            disabled={!onMonthChange}
          >
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((label, idx) => (
                <SelectItem key={label} value={String(idx + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                disabled={
                  !!exportingFormat || filteredContributions.length === 0
                }
              >
                {exportingFormat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("csv")}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                Export Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Member
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Group
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Expected Units
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Paid Units
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Due Date
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Status
                </th>
                {canManageActions && (
                  <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedContributions.length === 0 && (
                <tr>
                  <td
                    colSpan={canManageActions ? 7 : 6}
                    className="px-4 py-10 text-gray-500 text-sm text-center"
                  >
                    No contribution records match the current filters.
                  </td>
                </tr>
              )}

              {pagedContributions.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.memberName}
                      </p>
                      {record.memberSerial && (
                        <p className="text-gray-400 text-xs">
                          {record.memberSerial}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {record.groupName}
                  </td>
                  <td className="px-4 py-3 font-medium text-sm">
                    {formatUnitNumber(getRecordExpectedUnits(record))}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        record.paidAmount >= record.expectedAmount
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    >
                      {formatUnitNumber(getRecordPaidUnits(record))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    <div className="space-y-1">
                      <div>
                        {record.dueDate
                          ? new Date(record.dueDate).toLocaleDateString("en-NG")
                          : "Anytime"}
                      </div>
                      {record.dueDate ? (
                        <span className="inline-flex bg-emerald-50 px-2 py-0.5 rounded-full font-medium text-[11px] text-emerald-700">
                          Open: 27th-4th
                        </span>
                      ) : (
                        <span className="inline-flex bg-slate-100 px-2 py-0.5 rounded-full font-medium text-[11px] text-slate-700">
                          Flexible contribution
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.status, record.monthsDefaulted)}
                  </td>
                  {canManageActions && (
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openReminderModal([record])}
                          >
                            Remind
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditContributionModal(record)}
                            disabled={record.paidAmount <= 0}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openManualPaymentModal(record)}
                          >
                            Mark Paid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && totalPages > 1 && (
        <div className="flex justify-between items-center bg-white px-4 py-3 border border-gray-100 rounded-xl">
          <p className="text-gray-500 text-sm">
            Showing {pageStart}-{pageEnd} of {total} records
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
      )}

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Contribution Reminder</DialogTitle>
            <DialogDescription>{reminderSummary}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-email"
                  checked={reminderChannels.email}
                  onCheckedChange={(value) =>
                    setReminderChannels((prev) => ({
                      ...prev,
                      email: Boolean(value),
                    }))
                  }
                />
                <Label htmlFor="reminder-email">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-sms"
                  checked={reminderChannels.sms}
                  onCheckedChange={(value) =>
                    setReminderChannels((prev) => ({
                      ...prev,
                      sms: Boolean(value),
                    }))
                  }
                />
                <Label htmlFor="reminder-sms">SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-notification"
                  checked={reminderChannels.notification}
                  onCheckedChange={(value) =>
                    setReminderChannels((prev) => ({
                      ...prev,
                      notification: Boolean(value),
                    }))
                  }
                />
                <Label htmlFor="reminder-notification">
                  In-app notification
                </Label>
              </div>
            </div>

            {!canSendReminder && (
              <p className="text-rose-500 text-sm">
                Select at least one channel to send reminders.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!canSendReminder || sendingReminder}
              onClick={handleSendReminder}
            >
              {sendingReminder ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editContributionOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetEditContributionFlow();
            return;
          }
          setEditContributionOpen(true);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Posted Contribution</DialogTitle>
            <DialogDescription>
              Choose the exact posted entry to edit. Updates will reconcile the
              contribution record, linked transaction, and member/group totals.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              <div className="gap-3 grid md:grid-cols-4 bg-amber-50/70 p-4 border border-amber-100 rounded-xl">
                <div>
                  <p className="font-medium text-amber-700 text-xs uppercase tracking-wide">
                    Member
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedRecord.memberName}
                  </p>
                  {selectedRecord.memberSerial && (
                    <p className="text-gray-500 text-xs">
                      {selectedRecord.memberSerial}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-amber-700 text-xs uppercase tracking-wide">
                    Group
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedRecord.groupName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-amber-700 text-xs uppercase tracking-wide">
                    Contribution Type
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {getContributionTypeLabel(contributionType)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-amber-700 text-xs uppercase tracking-wide">
                    Period Units
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatContributionUnits(selectedRecord.paidAmount)}
                  </p>
                </div>
              </div>

              <div className="gap-6 grid lg:grid-cols-[320px,1fr]">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900">
                      Posted Entries
                    </h4>
                    {trackerEntriesQuery.isFetching && (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {trackerEntriesQuery.isLoading ? (
                    <div className="flex justify-center items-center gap-2 p-6 border border-gray-200 border-dashed rounded-xl text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading posted entries...
                    </div>
                  ) : contributionEntries.length === 0 ? (
                    <div className="p-6 border border-gray-200 border-dashed rounded-xl text-gray-500 text-sm">
                      No posted entries were found for this period yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contributionEntries.map((entry) => {
                        const isSelected = entry.id === selectedEditEntryId;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => setSelectedEditEntryId(entry.id)}
                            className={`w-full rounded-xl border p-4 text-left transition ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {formatContributionUnits(entry.amount)}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {monthOptions[entry.month - 1]} {entry.year}
                                </p>
                              </div>
                              <Badge
                                className={
                                  isSelected
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }
                              >
                                {entry.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 mt-3 text-gray-500 text-xs">
                              <p>
                                Method:{" "}
                                {entry.paymentMethod
                                  ? entry.paymentMethod.replace(/_/g, " ")
                                  : "-"}
                              </p>
                              <p>
                                Tx Ref: {entry.transaction?.reference || "-"}
                              </p>
                              <p>
                                Updated:{" "}
                                {entry.updatedAt
                                  ? new Date(entry.updatedAt).toLocaleString(
                                      "en-NG",
                                    )
                                  : "-"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  {!selectedEditEntry ? (
                    <div className="p-8 border border-gray-200 border-dashed rounded-xl text-gray-500 text-sm text-center">
                      Select a posted contribution entry to continue editing.
                    </div>
                  ) : (
                    <>
                      <div className="gap-4 grid md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="edit-contribution-amount">
                            Amount (NGN)
                          </Label>
                          <Input
                            id="edit-contribution-amount"
                            type="number"
                            min={String(
                              Number(contributionTypeConfig?.minAmount || 0),
                            )}
                            step={String(
                              Number(
                                contributionTypeConfig?.stepAmount ||
                                  contributionTypeConfig?.unitAmount ||
                                  1000,
                              ),
                            )}
                            value={editContributionForm.amount}
                            onChange={(event) =>
                              setEditContributionForm((prev) => ({
                                ...prev,
                                amount: event.target.value,
                              }))
                            }
                          />
                          {!editValidation.valid && (
                            <p className="text-rose-500 text-sm">
                              {editValidation.message}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs">
                            Enter the actual amount. It must be a positive
                            multiple of NGN 1,000.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-contribution-method">
                            Payment Method
                          </Label>
                          <Select
                            value={editContributionForm.paymentMethod}
                            onValueChange={(value) =>
                              setEditContributionForm((prev) => ({
                                ...prev,
                                paymentMethod: value as ManualPaymentMethod,
                              }))
                            }
                          >
                            <SelectTrigger id="edit-contribution-method">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHOD_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Contribution Month</Label>
                          <Select
                            value={editContributionForm.month}
                            onValueChange={(value) =>
                              setEditContributionForm((prev) => ({
                                ...prev,
                                month: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent>
                              {monthOptions.map((label, idx) => (
                                <SelectItem key={label} value={String(idx + 1)}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Contribution Year</Label>
                          <Select
                            value={editContributionForm.year}
                            onValueChange={(value) =>
                              setEditContributionForm((prev) => ({
                                ...prev,
                                year: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="edit-contribution-reference">
                            Receipt / Bank Reference
                          </Label>
                          <Input
                            id="edit-contribution-reference"
                            value={editContributionForm.paymentReference}
                            onChange={(event) =>
                              setEditContributionForm((prev) => ({
                                ...prev,
                                paymentReference: event.target.value,
                              }))
                            }
                            placeholder="Optional external reference"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="edit-contribution-notes">Notes</Label>
                          <Textarea
                            id="edit-contribution-notes"
                            rows={3}
                            value={editContributionForm.notes}
                            onChange={(event) =>
                              setEditContributionForm((prev) => ({
                                ...prev,
                                notes: event.target.value,
                              }))
                            }
                            placeholder="Optional notes for this edit"
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-900">
                            Edit Preview
                          </h4>
                          <Badge className="bg-blue-100 text-blue-700">
                            Unit Delta{" "}
                            {Number.isFinite(editAmountDelta)
                              ? formatContributionUnitDelta(editAmountDelta)
                              : "0"}
                          </Badge>
                        </div>
                        <div className="gap-3 grid md:grid-cols-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">
                              Current units
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatContributionUnits(editPreviousAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">
                              Updated units
                            </span>
                            <span className="font-medium text-gray-900">
                              {Number.isFinite(editAmount)
                                ? formatContributionUnits(editAmount)
                                : "0"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Units</span>
                            <span className="font-medium text-gray-900">
                              {editComputedUnits.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Interest</span>
                            <span className="font-medium text-gray-900">
                              {formatNaira(editComputedInterest)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Period</span>
                            <span className="font-medium text-gray-900">
                              {selectedEditMonthLabel} {editYear}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Linked Tx Ref</span>
                            <span className="font-medium text-gray-900">
                              {selectedEditEntry.transaction?.reference || "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          variant="outline"
                          onClick={resetEditContributionFlow}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleReviewContributionEdit}
                          disabled={
                            !selectedEditEntry ||
                            updateContributionMutation.isPending
                          }
                        >
                          Review Update
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmContributionEditOpen}
        onOpenChange={setConfirmContributionEditOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Contribution Update</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the contribution entry, reconcile the linked
              transaction, and adjust member/group totals by the unit delta.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedRecord && selectedEditEntry && (
            <div className="space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-xl text-sm">
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Member</span>
                <span className="font-medium text-gray-900 text-right">
                  {selectedRecord.memberName}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Contribution type</span>
                <span className="font-medium text-gray-900 text-right">
                  {getContributionTypeLabel(contributionType)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Existing units</span>
                <span className="font-medium text-gray-900 text-right">
                  {formatContributionUnits(editPreviousAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Updated units</span>
                <span className="font-semibold text-gray-900 text-right">
                  {Number.isFinite(editAmount)
                    ? formatContributionUnits(editAmount)
                    : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Unit delta</span>
                <span className="font-medium text-gray-900 text-right">
                  {Number.isFinite(editAmountDelta)
                    ? formatContributionUnitDelta(editAmountDelta)
                    : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">New period</span>
                <span className="font-medium text-gray-900 text-right">
                  {selectedEditMonthLabel} {editYear}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Units / Interest</span>
                <span className="font-medium text-gray-900 text-right">
                  {editComputedUnits.toLocaleString()} units /{" "}
                  {formatNaira(editComputedInterest)}
                </span>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={updateContributionMutation.isPending}
              >
                Back
              </Button>
            </AlertDialogCancel>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={updateContributionMutation.isPending}
              onClick={() => void handleConfirmContributionEdit()}
            >
              {updateContributionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Update"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={manualPaymentOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetManualPaymentFlow();
            return;
          }
          setManualPaymentOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Manual Contribution Payment</DialogTitle>
            <DialogDescription>
              Post a verified manual remittance for this member. This will
              create a contribution entry and a successful transaction record.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              <div className="gap-3 grid md:grid-cols-3 bg-emerald-50/70 p-4 border border-emerald-100 rounded-xl">
                <div>
                  <p className="font-medium text-emerald-700 text-xs uppercase tracking-wide">
                    Member
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedRecord.memberName}
                  </p>
                  {selectedRecord.memberSerial && (
                    <p className="text-gray-500 text-xs">
                      {selectedRecord.memberSerial}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-emerald-700 text-xs uppercase tracking-wide">
                    Group
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedRecord.groupName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-emerald-700 text-xs uppercase tracking-wide">
                    Contribution Type
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {getContributionTypeLabel(contributionType)}
                  </p>
                </div>
              </div>

              <div className="gap-4 grid md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-payment-amount">Amount (NGN)</Label>
                  <Input
                    id="manual-payment-amount"
                    type="number"
                    min={String(Number(contributionTypeConfig?.minAmount || 0))}
                    step={String(
                      Number(
                        contributionTypeConfig?.stepAmount ||
                          contributionTypeConfig?.unitAmount ||
                          1000,
                      ),
                    )}
                    value={manualPaymentForm.amount}
                    onChange={(event) =>
                      setManualPaymentForm((prev) => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {manualQuickAmounts.map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={
                          manualPaymentForm.amount === String(value)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : ""
                        }
                        onClick={() =>
                          setManualPaymentForm((prev) => ({
                            ...prev,
                            amount: String(value),
                          }))
                        }
                      >
                        {formatNaira(value)}
                      </Button>
                    ))}
                  </div>
                  {!manualPaymentValidation.valid && (
                    <p className="text-rose-500 text-sm">
                      {manualPaymentValidation.message}
                    </p>
                  )}
                  {contributionTypeConfig?.description && (
                    <p className="text-gray-500 text-xs">
                      {contributionTypeConfig.description}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs">
                    Enter the actual amount received. It must be a positive
                    multiple of NGN 1,000.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-payment-method">Payment Method</Label>
                  <Select
                    value={manualPaymentForm.paymentMethod}
                    onValueChange={(value) =>
                      setManualPaymentForm((prev) => ({
                        ...prev,
                        paymentMethod: value as ManualPaymentMethod,
                      }))
                    }
                  >
                    <SelectTrigger id="manual-payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contribution Month</Label>
                  <Select
                    value={manualPaymentForm.month}
                    onValueChange={(value) =>
                      setManualPaymentForm((prev) => ({
                        ...prev,
                        month: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((label, idx) => (
                        <SelectItem key={label} value={String(idx + 1)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contribution Year</Label>
                  <Select
                    value={manualPaymentForm.year}
                    onValueChange={(value) =>
                      setManualPaymentForm((prev) => ({
                        ...prev,
                        year: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="manual-payment-reference">
                    Receipt / Bank Reference
                  </Label>
                  <Input
                    id="manual-payment-reference"
                    value={manualPaymentForm.paymentReference}
                    onChange={(event) =>
                      setManualPaymentForm((prev) => ({
                        ...prev,
                        paymentReference: event.target.value,
                      }))
                    }
                    placeholder="Optional external receipt, teller, or transfer reference"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="manual-payment-description">
                    Description / Notes
                  </Label>
                  <Textarea
                    id="manual-payment-description"
                    rows={3}
                    value={manualPaymentForm.description}
                    onChange={(event) =>
                      setManualPaymentForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Optional context for this manual remittance"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">
                    Posting Preview
                  </h4>
                  <Badge className="bg-blue-100 text-blue-700">
                    {predictedStatus === "paid"
                      ? "Will settle month"
                      : predictedStatus === "partial"
                        ? "Will remain partial"
                        : "Pending"}
                  </Badge>
                </div>
                <div className="gap-3 grid md:grid-cols-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Expected units</span>
                    <span className="font-medium text-gray-900">
                      {formatContributionUnits(expectedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Recorded units</span>
                    <span className="font-medium text-gray-900">
                      {formatContributionUnits(alreadyPaidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Posting units</span>
                    <span className="font-medium text-gray-900">
                      {Number.isFinite(manualAmount)
                        ? formatContributionUnits(manualAmount)
                        : "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Total units after posting</span>
                    <span className="font-medium text-gray-900">
                      {formatContributionUnits(totalAfterPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Equivalent units</span>
                    <span className="font-medium text-gray-900">
                      {computedUnits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Interest to persist</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(computedInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">
                      Remaining units after posting
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatContributionUnits(remainingAfterPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Excess units above expected</span>
                    <span className="font-medium text-gray-900">
                      {formatContributionUnits(excessAfterPayment)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={resetManualPaymentFlow}>
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleReviewManualPayment}
                >
                  Review Payment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmManualPaymentOpen}
        onOpenChange={setConfirmManualPaymentOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Manual Payment Posting</AlertDialogTitle>
            <AlertDialogDescription>
              This action will create a verified contribution record, persist
              units and interest, update balances, and store a successful
              transaction for the member.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedRecord && (
            <div className="space-y-3 bg-gray-50 p-4 border border-gray-200 rounded-xl text-sm">
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Member</span>
                <span className="font-medium text-gray-900 text-right">
                  {selectedRecord.memberName}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Group</span>
                <span className="font-medium text-gray-900 text-right">
                  {selectedRecord.groupName}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Contribution period</span>
                <span className="font-medium text-gray-900 text-right">
                  {selectedMonthLabel} {manualYear}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Payment method</span>
                <span className="font-medium text-gray-900 text-right capitalize">
                  {manualPaymentForm.paymentMethod.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Payment amount (NGN)</span>
                <span className="font-semibold text-gray-900 text-right">
                  {formatNaira(
                    Number.isFinite(manualAmount) ? manualAmount : 0,
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Units / Interest</span>
                <span className="font-medium text-gray-900 text-right">
                  {computedUnits.toLocaleString()} units /{" "}
                  {formatNaira(computedInterest)}
                </span>
              </div>
              {manualPaymentForm.paymentReference.trim() && (
                <div className="flex justify-between items-center gap-4">
                  <span className="text-gray-500">External reference</span>
                  <span className="font-medium text-gray-900 text-right">
                    {manualPaymentForm.paymentReference.trim()}
                  </span>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={markPaidMutation.isPending}>
                Back
              </Button>
            </AlertDialogCancel>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={markPaidMutation.isPending}
              onClick={() => void handleConfirmManualPayment()}
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Confirm and Post Payment"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
