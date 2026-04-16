import { useEffect, useMemo, useState } from "react";
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
import { sendContributionReminders } from "@/lib/admin";
import {
  calculateContributionInterestForType,
  calculateContributionUnits,
  formatNaira,
  getContributionTypeLabel,
  validateContributionAmount,
} from "@/lib/contributionPolicy";

interface ContributionRecord {
  id: string;
  userId: string;
  groupId: string;
  memberName: string;
  memberSerial?: string | null;
  groupName: string;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string;
  status: "paid" | "partial" | "pending" | "defaulted";
  monthsDefaulted: number;
}

interface ContributionTrackerProps {
  contributions: ContributionRecord[];
  year: number;
  month: number;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
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

const getDefaultManualAmount = (record: ContributionRecord) => {
  const remaining = Math.max(
    0,
    Number(record.expectedAmount || 0) - Number(record.paidAmount || 0),
  );
  if (remaining > 0) return remaining;
  return Math.max(Number(record.expectedAmount || 0), 5000);
};

const buildManualPaymentDraft = (
  record: ContributionRecord,
  fallbackYear: number,
  fallbackMonth: number,
): ManualPaymentFormState => {
  const period = parseRecordPeriod(record, fallbackYear, fallbackMonth);
  return {
    amount: String(getDefaultManualAmount(record)),
    month: String(period.month),
    year: String(period.year),
    paymentMethod: "bank_transfer",
    paymentReference: "",
    description: "",
  };
};

export default function ContributionTracker({
  contributions,
  year,
  month,
  onYearChange,
  onMonthChange,
  canManageActions = true,
}: ContributionTrackerProps) {
  const { toast } = useToast();
  const markPaidMutation = useMarkContributionPaidMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
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
  const [selectedRecord, setSelectedRecord] =
    useState<ContributionRecord | null>(null);
  const [manualPaymentForm, setManualPaymentForm] =
    useState<ManualPaymentFormState>({
      amount: "",
      month: String(month),
      year: String(year),
      paymentMethod: "bank_transfer",
      paymentReference: "",
      description: "",
    });

  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, groupFilter, year, month]);

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

  const groups = [...new Set(contributions.map((record) => record.groupName))];

  const filteredContributions = contributions.filter((record) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      record.memberName.toLowerCase().includes(query) ||
      record.groupName.toLowerCase().includes(query) ||
      (record.memberSerial
        ? record.memberSerial.toLowerCase().includes(query)
        : false);
    const matchesStatus =
      statusFilter === "all" || record.status === statusFilter;
    const matchesGroup =
      groupFilter === "all" || record.groupName === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

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

  const defaulters = contributions.filter(
    (record) => record.status === "defaulted",
  );

  const totalExpected = contributions.reduce(
    (sum, record) => sum + Number(record.expectedAmount || 0),
    0,
  );
  const totalPaid = contributions.reduce(
    (sum, record) => sum + Number(record.paidAmount || 0),
    0,
  );
  const collectionRate =
    totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

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
    ? calculateContributionInterestForType("revolving", manualAmount)
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
    return validateContributionAmount("revolving", manualAmount);
  }, [manualAmount]);

  const manualQuickAmounts = useMemo(() => {
    const recommended = selectedRecord ? getDefaultManualAmount(selectedRecord) : 0;
    const values = [recommended, expectedAmount, 5000, 10000, 15000, 25000];
    const seen = new Set<number>();
    return values.filter((value) => {
      const safeValue = Math.round(Number(value || 0));
      if (!Number.isFinite(safeValue) || safeValue <= 0) return false;
      if (seen.has(safeValue)) return false;
      seen.add(safeValue);
      return true;
    });
  }, [expectedAmount, selectedRecord]);

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

  const exportCsv = () => {
    const headers = [
      "Member Serial",
      "Member Name",
      "Group",
      "Expected",
      "Paid",
      "Due Date",
      "Status",
      "Months Defaulted",
    ];

    const rows = filteredContributions.map((record) => [
      record.memberSerial ?? "-",
      record.memberName,
      record.groupName,
      record.expectedAmount,
      record.paidAmount,
      record.dueDate,
      record.status,
      record.monthsDefaulted,
    ]);

    const csvEscape = (value: string | number) => {
      const raw = String(value ?? "");
      if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const csvBody = [headers, ...rows]
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\n");

    const csv = `\uFEFF${csvBody}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contribution-tracker-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string, monthsDefaulted: number) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Clock className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "defaulted":
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="mr-1 h-3 w-3" />
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
    setManualPaymentForm(buildManualPaymentDraft(record, year, month));
    setConfirmManualPaymentOpen(false);
    setManualPaymentOpen(true);
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

    if (!Number.isFinite(manualYear) || manualYear < 2000 || manualYear > 2100) {
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
        contributionType: "revolving",
        paymentMethod: manualPaymentForm.paymentMethod,
        paymentReference: manualPaymentForm.paymentReference.trim() || undefined,
        description: manualPaymentForm.description.trim() || undefined,
      });

      toast({
        title: "Payment recorded",
        description: `${selectedRecord.memberName}'s manual ${getContributionTypeLabel("revolving").toLowerCase()} payment of ${formatNaira(manualAmount)} for ${selectedMonthLabel} ${manualYear} has been posted successfully${result.transaction?.reference ? ` (ref: ${result.transaction.reference})` : ""}.`,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Collection Rate</p>
              <p className="text-2xl font-bold text-emerald-600">
                {collectionRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500" />
          </div>
          <Progress value={collectionRate} className="mt-2 h-2" />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Expected</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNaira(totalExpected)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600">
            {formatNaira(totalPaid)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Defaulters</p>
              <p className="text-2xl font-bold text-red-600">
                {defaulters.length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {defaulters.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Defaulter Alert</h4>
              <p className="mt-1 text-sm text-red-600">
                {defaulters.length} member(s) have outstanding contributions.
                {defaulters.filter((record) => record.monthsDefaulted >= 3)
                  .length > 0 &&
                  ` ${defaulters.filter((record) => record.monthsDefaulted >= 3).length} have been defaulting for 3+ months.`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {defaulters.slice(0, 5).map((record) => (
                  <Badge
                    key={record.id}
                    variant="outline"
                    className="border-red-300 bg-white text-red-700"
                  >
                    {record.memberName}
                    {record.memberSerial ? ` - ${record.memberSerial}` : ""} (
                    {record.monthsDefaulted}mo)
                  </Badge>
                ))}
                {defaulters.length > 5 && (
                  <Badge
                    variant="outline"
                    className="border-red-300 bg-white text-red-700"
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

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>

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

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Group
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Expected
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Status
                </th>
                {canManageActions && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
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
                    className="px-4 py-10 text-center text-sm text-gray-500"
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
                        <p className="text-xs text-gray-400">
                          {record.memberSerial}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.groupName}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatNaira(record.expectedAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        record.paidAmount >= record.expectedAmount
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    >
                      {formatNaira(record.paidAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="space-y-1">
                      <div>
                        {new Date(record.dueDate).toLocaleDateString("en-NG")}
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Open: 27th-4th
                      </span>
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
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openReminderModal([record])}
                          >
                            Remind
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openManualPaymentModal(record)}
                            disabled={record.status === "paid"}
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
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">
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
              <p className="text-sm text-rose-500">
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
              Post a verified manual remittance for this member. This will create
              a contribution entry and a successful transaction record.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Member
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedRecord.memberName}
                  </p>
                  {selectedRecord.memberSerial && (
                    <p className="text-xs text-gray-500">
                      {selectedRecord.memberSerial}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Group
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedRecord.groupName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Contribution Type
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {getContributionTypeLabel("revolving")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-payment-amount">Amount</Label>
                  <Input
                    id="manual-payment-amount"
                    type="number"
                    min="5000"
                    step="5000"
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
                    <p className="text-sm text-rose-500">
                      {manualPaymentValidation.message}
                    </p>
                  )}
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

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
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
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Expected this month</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(expectedAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Already recorded</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(alreadyPaidAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Posting now</span>
                    <span className="font-medium text-gray-900">
                      {Number.isFinite(manualAmount)
                        ? formatNaira(manualAmount)
                        : formatNaira(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total after posting</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(totalAfterPayment)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Equivalent units</span>
                    <span className="font-medium text-gray-900">
                      {computedUnits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Interest to persist</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(computedInterest)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Remaining after posting</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(remainingAfterPayment)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Excess above expected</span>
                    <span className="font-medium text-gray-900">
                      {formatNaira(excessAfterPayment)}
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
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Member</span>
                <span className="text-right font-medium text-gray-900">
                  {selectedRecord.memberName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Group</span>
                <span className="text-right font-medium text-gray-900">
                  {selectedRecord.groupName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Contribution period</span>
                <span className="text-right font-medium text-gray-900">
                  {selectedMonthLabel} {manualYear}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Payment method</span>
                <span className="text-right font-medium capitalize text-gray-900">
                  {manualPaymentForm.paymentMethod.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Amount to post</span>
                <span className="text-right font-semibold text-gray-900">
                  {formatNaira(Number.isFinite(manualAmount) ? manualAmount : 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Units / Interest</span>
                <span className="text-right font-medium text-gray-900">
                  {computedUnits.toLocaleString()} units /{" "}
                  {formatNaira(computedInterest)}
                </span>
              </div>
              {manualPaymentForm.paymentReference.trim() && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500">External reference</span>
                  <span className="text-right font-medium text-gray-900">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
