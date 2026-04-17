import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWithdrawalsAdminQuery } from "@/hooks/finance/useWithdrawalsAdminQuery";
import {
  useApproveWithdrawalMutation,
  useCancelManualWithdrawalPayoutMutation,
  useCompleteWithdrawalMutation,
  useFinalizeManualWithdrawalPayoutMutation,
  useFinalizeWithdrawalOtpMutation,
  useInitiateManualWithdrawalPayoutMutation,
  useMarkWithdrawalProcessingMutation,
  useRejectWithdrawalMutation,
  useResendManualWithdrawalPayoutOtpMutation,
  useResendWithdrawalOtpMutation,
  useVerifyWithdrawalTransferMutation,
} from "@/hooks/finance/useWithdrawalAdminMutations";
import { getContributionTypeLabel } from "@/lib/contributionPolicy";
import {
  ArrowDownRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Send,
  User,
  Wallet,
  XCircle,
} from "lucide-react";

type ManualWithdrawalMethod =
  | "cash"
  | "bank_transfer"
  | "bank_settlement"
  | "cheque"
  | "pos"
  | "other";

type ManualPayoutStatus = "pending_otp" | "completed";

interface ManualPayout {
  status?: ManualPayoutStatus | null;
  method?: ManualWithdrawalMethod | null;
  amount?: number | null;
  externalReference?: string | null;
  occurredAt?: string | null;
  notes?: string | null;
  previousStatus?: string | null;
  initiatedAt?: string | null;
  completedAt?: string | null;
  otpChannel?: "phone" | "email" | null;
  otpRecipient?: string | null;
  otpBackupChannels?: Array<"phone" | "email">;
  otpSentAt?: string | null;
}

interface PayoutEvent {
  eventType: string;
  gateway?: string | null;
  status?: string | null;
  reference?: string | null;
  transferCode?: string | null;
  message?: string | null;
  actorUserId?: string | null;
  actorProfileId?: string | null;
  occurredAt?: string | null;
  metadata?: unknown;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  groupId: string | null;
  groupName: string | null;
  contributionType: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  reason: string | null;
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  adminNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  payoutReference: string | null;
  payoutGateway: string | null;
  payoutTransferCode: string | null;
  payoutStatus: string | null;
  payoutOtpResentAt: string | null;
  payoutEvents: PayoutEvent[];
  manualPayout: ManualPayout | null;
}

interface WithdrawalApprovalPanelProps {
  canCompletePayout?: boolean;
  canFinalizeOtp?: boolean;
}

const pageSize = 6;

const manualPayoutMethodOptions: Array<{
  value: ManualWithdrawalMethod;
  label: string;
  description: string;
}> = [
  {
    value: "bank_transfer",
    label: "Bank Transfer",
    description: "Record a direct transfer completed outside Paystack.",
  },
  {
    value: "bank_settlement",
    label: "Bank Settlement",
    description: "Capture an interbank, teller, or batch settlement.",
  },
  {
    value: "cash",
    label: "Cash",
    description: "Use when the member was paid in cash.",
  },
  {
    value: "cheque",
    label: "Cheque",
    description: "Track cheque-based withdrawal settlement.",
  },
  {
    value: "pos",
    label: "POS",
    description: "Record a POS or agent cash-out settlement.",
  },
  {
    value: "other",
    label: "Other",
    description: "Use another verifiable offline payout channel.",
  },
];

const paystackPendingStatuses = ["pending", "processing", "queued"];

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  if (currentPage > 3) pages.push("ellipsis");
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function getLocalDateTimeInputValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatCurrency(amount: number) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatManualMethodLabel(method?: ManualWithdrawalMethod | null) {
  return (
    manualPayoutMethodOptions.find((option) => option.value === method)?.label ||
    "Manual Payout"
  );
}

function formatOtpChannelLabel(channel?: "phone" | "email" | null) {
  if (channel === "phone") return "SMS";
  if (channel === "email") return "email";
  return "admin contact";
}

function buildOtpDeliveryHint(
  channel?: "phone" | "email" | null,
  recipient?: string | null,
  backupChannels: Array<"phone" | "email"> = [],
) {
  const primaryLabel = formatOtpChannelLabel(channel);
  const uniqueBackupLabels = Array.from(
    new Set(
      backupChannels
        .filter((value) => value !== channel)
        .map((value) => formatOtpChannelLabel(value)),
    ),
  );

  const primaryMessage = recipient
    ? channel === "phone"
      ? `Authorization code sent by SMS to ${recipient}.`
      : channel === "email"
        ? `Authorization code sent by email to ${recipient}.`
        : `Authorization code sent to ${recipient}.`
    : channel === "phone"
      ? "Authorization code sent by SMS to the admin contact."
      : channel === "email"
        ? "Authorization code sent by email to the admin contact."
        : "Authorization code sent to the admin contact.";

  if (uniqueBackupLabels.length === 0) {
    return primaryMessage;
  }

  if (uniqueBackupLabels.length === 1) {
    return `${primaryMessage} ${uniqueBackupLabels[0]} backup attempted.`;
  }

  const lastBackupLabel = uniqueBackupLabels[uniqueBackupLabels.length - 1];
  const leadingBackupLabels = uniqueBackupLabels.slice(0, -1).join(", ");
  return `${primaryMessage} ${leadingBackupLabels} and ${lastBackupLabel} backups attempted.`;
}

function normalizeWithdrawal(raw: any): WithdrawalRequest {
  return {
    id: String(raw?._id || raw?.id || ""),
    userId: String(raw?.userId || raw?.user_id || ""),
    amount: Number(raw?.amount || 0),
    groupId: raw?.groupId ? String(raw.groupId) : null,
    groupName: raw?.groupName ? String(raw.groupName) : null,
    contributionType: raw?.contributionType ? String(raw.contributionType) : null,
    bankName: String(raw?.bankName || ""),
    accountNumber: String(raw?.accountNumber || ""),
    accountName: String(raw?.accountName || ""),
    reason: raw?.reason ? String(raw.reason) : null,
    status: String(raw?.status || "pending") as WithdrawalRequest["status"],
    adminNotes: raw?.adminNotes ? String(raw.adminNotes) : null,
    rejectionReason: raw?.rejectionReason ? String(raw.rejectionReason) : null,
    createdAt: String(raw?.createdAt || ""),
    approvedAt: raw?.approvedAt ? String(raw.approvedAt) : null,
    completedAt: raw?.completedAt ? String(raw.completedAt) : null,
    payoutReference: raw?.payoutReference ? String(raw.payoutReference) : null,
    payoutGateway: raw?.payoutGateway ? String(raw.payoutGateway) : null,
    payoutTransferCode: raw?.payoutTransferCode
      ? String(raw.payoutTransferCode)
      : null,
    payoutStatus: raw?.payoutStatus ? String(raw.payoutStatus) : null,
    payoutOtpResentAt: raw?.payoutOtpResentAt
      ? String(raw.payoutOtpResentAt)
      : null,
    payoutEvents: Array.isArray(raw?.payoutEvents)
      ? raw.payoutEvents.map((event: any) => ({
          eventType: String(event?.eventType || "payout_event"),
          gateway: event?.gateway ? String(event.gateway) : null,
          status: event?.status ? String(event.status) : null,
          reference: event?.reference ? String(event.reference) : null,
          transferCode: event?.transferCode
            ? String(event.transferCode)
            : null,
          message: event?.message ? String(event.message) : null,
          actorUserId: event?.actorUserId ? String(event.actorUserId) : null,
          actorProfileId: event?.actorProfileId
            ? String(event.actorProfileId)
            : null,
          occurredAt: event?.occurredAt ? String(event.occurredAt) : null,
          metadata: event?.metadata ?? null,
        }))
      : [],
    manualPayout: raw?.manualPayout
      ? {
          status: raw.manualPayout.status
            ? (String(raw.manualPayout.status) as ManualPayoutStatus)
            : null,
          method: raw.manualPayout.method
            ? (String(raw.manualPayout.method) as ManualWithdrawalMethod)
            : null,
          amount:
            typeof raw.manualPayout.amount === "number"
              ? raw.manualPayout.amount
              : null,
          externalReference: raw.manualPayout.externalReference
            ? String(raw.manualPayout.externalReference)
            : null,
          occurredAt: raw.manualPayout.occurredAt
            ? String(raw.manualPayout.occurredAt)
            : null,
          notes: raw.manualPayout.notes ? String(raw.manualPayout.notes) : null,
          previousStatus: raw.manualPayout.previousStatus
            ? String(raw.manualPayout.previousStatus)
            : null,
          initiatedAt: raw.manualPayout.initiatedAt
            ? String(raw.manualPayout.initiatedAt)
            : null,
          completedAt: raw.manualPayout.completedAt
            ? String(raw.manualPayout.completedAt)
            : null,
          otpChannel: raw.manualPayout.otpChannel
            ? (String(raw.manualPayout.otpChannel) as "phone" | "email")
            : null,
          otpRecipient: raw.manualPayout.otpRecipient
            ? String(raw.manualPayout.otpRecipient)
            : null,
          otpBackupChannels: Array.isArray(raw.manualPayout.otpBackupChannels)
            ? raw.manualPayout.otpBackupChannels
                .map((value) => String(value))
                .filter(
                  (value): value is "phone" | "email" =>
                    value === "phone" || value === "email",
                )
            : [],
          otpSentAt: raw.manualPayout.otpSentAt
            ? String(raw.manualPayout.otpSentAt)
            : null,
        }
      : null,
  };
}

function isRecoverableFinalizeOtpError(error: unknown) {
  const normalizedMessage = String((error as Error)?.message || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return (
    normalizedMessage.includes("not currently awaiting otp") ||
    normalizedMessage.includes("not awaiting otp") ||
    normalizedMessage.includes("already finalized") ||
    normalizedMessage.includes("already completed") ||
    normalizedMessage.includes("awaiting_otp")
  );
}

function getStatusBadge(status: WithdrawalRequest["status"]) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    case "approved":
      return <Badge className="bg-blue-100 text-blue-700">Approved</Badge>;
    case "processing":
      return <Badge className="bg-purple-100 text-purple-700">Processing</Badge>;
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function formatEventLabel(eventType: string) {
  return eventType
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildPayoutAuditEntries(withdrawal: WithdrawalRequest) {
  const recorded = withdrawal.payoutEvents.map((event, index) => ({
    id: `${event.eventType}-${event.occurredAt || index}-${index}`,
    eventType: event.eventType,
    title: formatEventLabel(event.eventType),
    message: event.message || "Payout activity recorded.",
    occurredAt: event.occurredAt || null,
    gateway: event.gateway || null,
    status: event.status || null,
    reference: event.reference || null,
    transferCode: event.transferCode || null,
    metadata: event.metadata ?? null,
  }));

  if (recorded.length > 0) {
    return recorded.sort((a, b) => {
      const aTime = a.occurredAt ? Date.parse(a.occurredAt) : 0;
      const bTime = b.occurredAt ? Date.parse(b.occurredAt) : 0;
      return bTime - aTime;
    });
  }

  const fallback: Array<{
    id: string;
    eventType: string;
    title: string;
    message: string;
    occurredAt: string | null;
    gateway: string | null;
    status: string | null;
    reference: string | null;
    transferCode: string | null;
    metadata: unknown;
  }> = [];

  fallback.push({
    id: "created",
    eventType: "withdrawal_created",
    title: "Withdrawal Requested",
    message: "Member submitted this withdrawal request.",
    occurredAt: withdrawal.createdAt || null,
    gateway: null,
    status: withdrawal.status,
    reference: null,
    transferCode: null,
    metadata: null,
  });

  if (withdrawal.approvedAt) {
    fallback.push({
      id: "approved",
      eventType: "withdrawal_approved",
      title: "Withdrawal Approved",
      message: "Withdrawal was approved for payout processing.",
      occurredAt: withdrawal.approvedAt,
      gateway: null,
      status: "approved",
      reference: null,
      transferCode: null,
      metadata: null,
    });
  }

  if (withdrawal.manualPayout?.initiatedAt) {
    fallback.push({
      id: "manual-initiated",
      eventType: "manual_payout_initiated",
      title: "Manual Payout Initiated",
      message: withdrawal.manualPayout.method
        ? `Manual payout was initiated via ${formatManualMethodLabel(
            withdrawal.manualPayout.method,
          )}.`
        : "Manual payout was initiated.",
      occurredAt: withdrawal.manualPayout.initiatedAt,
      gateway: "manual",
      status: withdrawal.manualPayout.status || withdrawal.payoutStatus,
      reference: withdrawal.payoutReference,
      transferCode: null,
      metadata: null,
    });
  }

  if (withdrawal.completedAt) {
    fallback.push({
      id: "completed",
      eventType: "payout_completed",
      title: "Payout Completed",
      message: "Withdrawal payout completed successfully.",
      occurredAt: withdrawal.completedAt,
      gateway: withdrawal.payoutGateway,
      status: withdrawal.payoutStatus || "success",
      reference: withdrawal.payoutReference,
      transferCode: withdrawal.payoutTransferCode,
      metadata: null,
    });
  }

  return fallback.sort((a, b) => {
    const aTime = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const bTime = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return bTime - aTime;
  });
}

export default function WithdrawalApprovalPanel({
  canCompletePayout = true,
  canFinalizeOtp = true,
}: WithdrawalApprovalPanelProps) {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [payoutTarget, setPayoutTarget] = useState<WithdrawalRequest | null>(null);
  const [payoutMode, setPayoutMode] = useState<"paystack" | "manual">("paystack");
  const [payoutReference, setPayoutReference] = useState("");
  const [manualMethod, setManualMethod] =
    useState<ManualWithdrawalMethod>("bank_transfer");
  const [manualOccurredAt, setManualOccurredAt] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [otpTarget, setOtpTarget] = useState<WithdrawalRequest | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [otpAction, setOtpAction] = useState<"finalize" | "resend" | null>(null);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [otpResendCooldownSeconds, setOtpResendCooldownSeconds] = useState(0);
  const [verifyTargetId, setVerifyTargetId] = useState<string | null>(null);
  const [manualCancelTarget, setManualCancelTarget] =
    useState<WithdrawalRequest | null>(null);
  const [manualCancelBusyId, setManualCancelBusyId] =
    useState<string | null>(null);
  const [historyTarget, setHistoryTarget] =
    useState<WithdrawalRequest | null>(null);

  const withdrawalsQuery = useWithdrawalsAdminQuery({
    status: filter === "all" ? undefined : filter,
  });
  const approveMutation = useApproveWithdrawalMutation();
  const rejectMutation = useRejectWithdrawalMutation();
  const markProcessingMutation = useMarkWithdrawalProcessingMutation();
  const completeMutation = useCompleteWithdrawalMutation();
  const verifyTransferMutation = useVerifyWithdrawalTransferMutation();
  const initiateManualPayoutMutation =
    useInitiateManualWithdrawalPayoutMutation();
  const finalizeOtpMutation = useFinalizeWithdrawalOtpMutation();
  const finalizeManualPayoutMutation =
    useFinalizeManualWithdrawalPayoutMutation();
  const resendOtpMutation = useResendWithdrawalOtpMutation();
  const resendManualOtpMutation = useResendManualWithdrawalPayoutOtpMutation();
  const cancelManualPayoutMutation =
    useCancelManualWithdrawalPayoutMutation();

  const withdrawals = useMemo(
    () =>
      (withdrawalsQuery.data?.withdrawals ?? []).map((item) =>
        normalizeWithdrawal(item),
      ),
    [withdrawalsQuery.data?.withdrawals],
  );

  useEffect(() => {
    const cooldown = withdrawalsQuery.data?.otpResendCooldownSeconds;
    if (typeof cooldown === "number") {
      setOtpResendCooldownSeconds(Math.max(0, cooldown));
    }
  }, [withdrawalsQuery.data?.otpResendCooldownSeconds]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return undefined;
    const timer = setTimeout(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldownSeconds]);

  useEffect(() => {
    if (!otpTarget) {
      setResendCooldownSeconds(0);
      return;
    }
    if (!otpTarget.payoutOtpResentAt || !otpResendCooldownSeconds) {
      setResendCooldownSeconds(0);
      return;
    }
    const lastResentAt = Date.parse(otpTarget.payoutOtpResentAt);
    if (!Number.isFinite(lastResentAt)) {
      setResendCooldownSeconds(0);
      return;
    }
    const elapsedSeconds = Math.floor((Date.now() - lastResentAt) / 1000);
    const remainingSeconds = Math.max(
      otpResendCooldownSeconds - elapsedSeconds,
      0,
    );
    setResendCooldownSeconds(remainingSeconds);
  }, [otpTarget, otpResendCooldownSeconds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        withdrawal.accountName.toLowerCase().includes(q) ||
        withdrawal.accountNumber.includes(q) ||
        withdrawal.bankName.toLowerCase().includes(q) ||
        (withdrawal.groupName || "").toLowerCase().includes(q);
      const matchesFilter = filter === "all" || withdrawal.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, searchTerm, withdrawals]);

  const total = filteredWithdrawals.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);
  const pagedWithdrawals = filteredWithdrawals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
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

  const stats = useMemo(
    () => ({
      pending: withdrawals.filter((withdrawal) => withdrawal.status === "pending")
        .length,
      approved: withdrawals.filter(
        (withdrawal) => withdrawal.status === "approved",
      ).length,
      processing: withdrawals.filter(
        (withdrawal) => withdrawal.status === "processing",
      ).length,
      pendingAmount: withdrawals
        .filter((withdrawal) => withdrawal.status === "pending")
        .reduce((sum, withdrawal) => sum + withdrawal.amount, 0),
    }),
    [withdrawals],
  );

  const loading = withdrawalsQuery.isLoading && !withdrawalsQuery.data;
  const isManualOtpTarget =
    String(otpTarget?.payoutGateway || "").toLowerCase() === "manual";
  const resendDisabled =
    !otpTarget ||
    otpAction !== null ||
    resendCooldownSeconds > 0 ||
    processingId === otpTarget.id;
  const resendLabel =
    resendCooldownSeconds > 0
      ? `Resend OTP (${resendCooldownSeconds}s)`
      : "Resend OTP";
  const auditEntries = useMemo(
    () => (historyTarget ? buildPayoutAuditEntries(historyTarget) : []),
    [historyTarget],
  );

  function resetReviewDialog() {
    setSelectedWithdrawal(null);
    setAdminNotes("");
    setRejectionReason("");
  }

  function openOtpDialog(withdrawal: WithdrawalRequest) {
    setOtpTarget(withdrawal);
    setTransferCode(withdrawal.payoutTransferCode || "");
    setOtpCode("");
  }

  function resetOtpDialog() {
    setOtpTarget(null);
    setOtpCode("");
    setTransferCode("");
    setResendCooldownSeconds(0);
    setOtpAction(null);
  }

  function resetPayoutDialog() {
    setPayoutTarget(null);
    setPayoutMode("paystack");
    setPayoutReference("");
    setManualMethod("bank_transfer");
    setManualOccurredAt("");
    setManualReference("");
    setManualNotes("");
  }

  function openPayoutDialog(withdrawal: WithdrawalRequest) {
    setPayoutTarget(withdrawal);
    setPayoutMode(
      String(withdrawal.payoutGateway || "").toLowerCase() === "manual"
        ? "manual"
        : "paystack",
    );
    setPayoutReference(
      String(withdrawal.payoutGateway || "").toLowerCase() === "paystack"
        ? withdrawal.payoutReference || ""
        : "",
    );
    setManualMethod(
      (withdrawal.manualPayout?.method as ManualWithdrawalMethod | null) ||
        "bank_transfer",
    );
    setManualOccurredAt(
      withdrawal.manualPayout?.occurredAt
        ? getLocalDateTimeInputValue(new Date(withdrawal.manualPayout.occurredAt))
        : getLocalDateTimeInputValue(new Date()),
    );
    setManualReference(withdrawal.manualPayout?.externalReference || "");
    setManualNotes(withdrawal.manualPayout?.notes || "");
  }

  async function refreshWithdrawals() {
    await withdrawalsQuery.refetch();
  }

  function handleFinalizeOutcome(
    updated: WithdrawalRequest,
    source: "finalize" | "verify" = "finalize",
  ) {
    const payoutStatus = String(updated.payoutStatus || "").toLowerCase();
    const isManual = String(updated.payoutGateway || "").toLowerCase() === "manual";

    if (payoutStatus === "success") {
      toast({
        title: isManual ? "Manual Payout Finalized" : "Transfer Finalized",
        description: isManual
          ? "OTP verified. The manual withdrawal payout has been posted successfully."
          : source === "verify"
            ? "We refreshed the payout state and confirmed the withdrawal has been completed."
            : "OTP verified. The withdrawal payout has been completed successfully.",
      });
      resetOtpDialog();
      return;
    }

    if (payoutStatus === "otp") {
      toast({
        title: "OTP Still Required",
        description: isManual
          ? "Manual payout is still awaiting OTP confirmation. Enter the latest code or resend it."
          : "Paystack still requires OTP confirmation for this payout.",
      });
      setOtpTarget(updated);
      setTransferCode(updated.payoutTransferCode || transferCode.trim());
      return;
    }

    if (["failed", "reversed"].includes(payoutStatus)) {
      toast({
        title: "Payout Not Completed",
        description:
          "The payout is no longer awaiting OTP. Review the latest payout state before trying again.",
        variant: "destructive",
      });
      resetOtpDialog();
      return;
    }

    toast({
      title: isManual ? "Manual Payout Processing" : "Transfer Processing",
      description: isManual
        ? "The manual payout record is still being updated. Refresh shortly if it does not complete right away."
        : "The payout is still processing. You can verify again later if Paystack has not finalized it yet.",
    });
    setOtpTarget(updated);
    setTransferCode(updated.payoutTransferCode || transferCode.trim());
  }

  async function handleApprove(withdrawal: WithdrawalRequest) {
    setProcessingId(withdrawal.id);
    try {
      await approveMutation.mutateAsync({
        id: withdrawal.id,
        adminNotes: adminNotes || null,
      });
      toast({
        title: "Withdrawal Approved",
        description: `${formatCurrency(withdrawal.amount)} is now approved for payout.`,
      });
      await refreshWithdrawals();
      resetReviewDialog();
    } catch (error: unknown) {
      toast({
        title: "Approval Failed",
        description:
          (error as Error).message || "Failed to approve withdrawal.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(withdrawal: WithdrawalRequest) {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason before rejecting this withdrawal.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(withdrawal.id);
    try {
      await rejectMutation.mutateAsync({
        id: withdrawal.id,
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes || null,
      });
      toast({
        title: "Withdrawal Rejected",
        description: "The withdrawal request has been rejected.",
      });
      await refreshWithdrawals();
      resetReviewDialog();
    } catch (error: unknown) {
      toast({
        title: "Reject Failed",
        description:
          (error as Error).message || "Failed to reject withdrawal.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkProcessing(withdrawal: WithdrawalRequest) {
    setProcessingId(withdrawal.id);
    try {
      await markProcessingMutation.mutateAsync(withdrawal.id);
      toast({
        title: "Marked Processing",
        description: "The withdrawal has moved into payout processing.",
      });
      await refreshWithdrawals();
    } catch (error: unknown) {
      toast({
        title: "Update Failed",
        description:
          (error as Error).message || "Failed to mark withdrawal as processing.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleSubmitPayout() {
    if (!payoutTarget || !canCompletePayout) return;

    setProcessingId(payoutTarget.id);
    try {
      if (payoutMode === "manual") {
        if (!manualOccurredAt) {
          toast({
            title: "Settlement Time Required",
            description: "Please provide when the manual payout actually occurred.",
            variant: "destructive",
          });
          return;
        }

        const result = await initiateManualPayoutMutation.mutateAsync({
          id: payoutTarget.id,
          method: manualMethod,
          occurredAt: manualOccurredAt,
          externalReference: manualReference.trim() || null,
          notes: manualNotes.trim() || null,
        });
        const updated = normalizeWithdrawal(result.withdrawal);

        toast({
          title: "Manual OTP Sent",
          description: buildOtpDeliveryHint(
            updated.manualPayout?.otpChannel ?? null,
            updated.manualPayout?.otpRecipient ?? null,
            updated.manualPayout?.otpBackupChannels ?? [],
          ),
        });

        openOtpDialog(updated);
        await refreshWithdrawals();
        resetPayoutDialog();
        return;
      }

      const result = await completeMutation.mutateAsync({
        id: payoutTarget.id,
        reference: payoutReference.trim() || undefined,
        gateway: "paystack",
      });
      const updated = normalizeWithdrawal(result.withdrawal);

      if (String(updated.payoutStatus || "").toLowerCase() === "otp") {
        toast({
          title: "OTP Required",
          description:
            "Paystack requested OTP authorization. Finalize the transfer to complete this payout.",
        });
        openOtpDialog(updated);
      } else if (String(updated.payoutStatus || "").toLowerCase() === "success") {
        toast({
          title: "Withdrawal Completed",
          description: `${formatCurrency(updated.amount)} has been paid out successfully.`,
        });
      } else {
        toast({
          title: "Transfer Initiated",
          description:
            "The Paystack payout has been initiated and is still processing.",
        });
      }

      await refreshWithdrawals();
      resetPayoutDialog();
    } catch (error: unknown) {
      await refreshWithdrawals();
      toast({
        title: "Payout Failed",
        description:
          (error as Error).message || "Unable to start this payout flow.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleVerifyTransfer(withdrawal: WithdrawalRequest) {
    if (!withdrawal.payoutReference) {
      toast({
        title: "Missing Reference",
        description: "No payout reference was found for this transfer.",
        variant: "destructive",
      });
      return;
    }

    setVerifyTargetId(withdrawal.id);
    try {
      const result = await verifyTransferMutation.mutateAsync(withdrawal.id);
      const updated = normalizeWithdrawal(result.withdrawal);

      if (String(updated.payoutStatus || "").toLowerCase() === "success") {
        toast({
          title: "Transfer Verified",
          description: "The withdrawal payout has been completed successfully.",
        });
      } else if (String(updated.payoutStatus || "").toLowerCase() === "otp") {
        toast({
          title: "OTP Required",
          description: "Paystack requires OTP to complete this payout.",
        });
        openOtpDialog(updated);
      } else {
        toast({
          title: "Transfer Pending",
          description:
            "The payout is still processing. You can verify again later.",
        });
      }

      await refreshWithdrawals();
    } catch (error: unknown) {
      toast({
        title: "Verify Failed",
        description:
          (error as Error).message || "Unable to verify transfer status.",
        variant: "destructive",
      });
    } finally {
      setVerifyTargetId(null);
    }
  }

  async function handleFinalizeOtp() {
    if (!otpTarget || !canFinalizeOtp) return;
    if (!otpCode.trim()) {
      toast({
        title: "OTP Required",
        description: isManualOtpTarget
          ? "Enter the OTP sent to the authorized admin."
          : "Enter the OTP sent by Paystack to finalize this payout.",
        variant: "destructive",
      });
      return;
    }

    if (!isManualOtpTarget && !transferCode.trim()) {
      toast({
        title: "Transfer Code Required",
        description: "Enter the transfer code for this payout.",
        variant: "destructive",
      });
      return;
    }

    setOtpAction("finalize");
    try {
      const result = isManualOtpTarget
        ? await finalizeManualPayoutMutation.mutateAsync({
            id: otpTarget.id,
            otp: otpCode.trim(),
          })
        : await finalizeOtpMutation.mutateAsync({
            id: otpTarget.id,
            transferCode: transferCode.trim(),
            otp: otpCode.trim(),
          });
      const updated = normalizeWithdrawal(result.withdrawal);

      handleFinalizeOutcome(updated);
      await refreshWithdrawals();
    } catch (error: unknown) {
      if (
        !isManualOtpTarget &&
        isRecoverableFinalizeOtpError(error) &&
        otpTarget.payoutReference
      ) {
        try {
          const verified = await verifyTransferMutation.mutateAsync(otpTarget.id);
          const updated = normalizeWithdrawal(verified.withdrawal);
          handleFinalizeOutcome(updated, "verify");
          await refreshWithdrawals();
          return;
        } catch (verifyError: unknown) {
          toast({
            title: "Finalize Failed",
            description:
              (verifyError as Error).message ||
              "We could not refresh the payout state after finalization failed.",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Finalize Failed",
        description:
          (error as Error).message ||
          (isManualOtpTarget
            ? "Failed to finalize manual payout."
            : "Failed to finalize transfer."),
        variant: "destructive",
      });
    } finally {
      setOtpAction(null);
    }
  }

  async function handleResendOtp() {
    if (!otpTarget) return;
    if (!isManualOtpTarget && !transferCode.trim()) {
      toast({
        title: "Transfer Code Required",
        description: "Enter the transfer code before resending OTP.",
        variant: "destructive",
      });
      return;
    }

    setOtpAction("resend");
    try {
      const result = isManualOtpTarget
        ? await resendManualOtpMutation.mutateAsync(otpTarget.id)
        : await resendOtpMutation.mutateAsync({
            id: otpTarget.id,
            transferCode: transferCode.trim(),
          });
      const updated = normalizeWithdrawal(result.withdrawal);
      setOtpTarget(updated);
      setTransferCode(updated.payoutTransferCode || transferCode.trim());

      const cooldown =
        typeof result.retryAfter === "number" && result.retryAfter > 0
          ? result.retryAfter
          : otpResendCooldownSeconds;
      if (cooldown > 0) {
        setResendCooldownSeconds(cooldown);
      }

      toast({
        title: "OTP Resent",
        description: isManualOtpTarget
          ? "A fresh authorization code has been sent to the admin contact."
          : "A new OTP has been sent to your Paystack contact.",
      });
      await refreshWithdrawals();
    } catch (error: unknown) {
      const retryAfter = (error as Error & { retryAfter?: number }).retryAfter;
      const cooldown =
        typeof retryAfter === "number" && retryAfter > 0
          ? retryAfter
          : otpResendCooldownSeconds;
      if (cooldown > 0) {
        setResendCooldownSeconds(cooldown);
      }

      toast({
        title: "Resend Failed",
        description:
          (error as Error).message || "Failed to resend OTP.",
        variant: "destructive",
      });
    } finally {
      setOtpAction(null);
    }
  }

  async function handleCancelManualPayout() {
    if (!manualCancelTarget) return;

    setManualCancelBusyId(manualCancelTarget.id);
    try {
      await cancelManualPayoutMutation.mutateAsync(manualCancelTarget.id);
      toast({
        title: "Manual Flow Cancelled",
        description:
          "The pending manual payout authorization has been cancelled.",
      });
      if (otpTarget?.id === manualCancelTarget.id) {
        resetOtpDialog();
      }
      setManualCancelTarget(null);
      await refreshWithdrawals();
    } catch (error: unknown) {
      toast({
        title: "Cancel Failed",
        description:
          (error as Error).message ||
          "Unable to cancel the pending manual payout flow.",
        variant: "destructive",
      });
    } finally {
      setManualCancelBusyId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-gray-500">Loading withdrawal requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-amber-700">Pending</p>
                <p className="text-2xl font-bold text-amber-800">
                  {stats.pending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700">Approved</p>
                <p className="text-2xl font-bold text-blue-800">
                  {stats.approved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700">Processing</p>
                <p className="text-2xl font-bold text-purple-800">
                  {stats.processing}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-emerald-700">Pending Amount</p>
                <p className="text-xl font-bold text-emerald-800">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by member account, bank, or group..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "approved", "processing", "completed", "rejected"].map(
                (status) => (
                  <Button
                    key={status}
                    variant={filter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(status)}
                    className={filter === status ? "bg-emerald-600" : ""}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => withdrawalsQuery.refetch()}
              disabled={withdrawalsQuery.isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${withdrawalsQuery.isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowDownRight className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No withdrawal requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pagedWithdrawals.map((withdrawal) => {
                const payoutGateway = String(withdrawal.payoutGateway || "")
                  .trim()
                  .toLowerCase();
                const payoutStatus = String(withdrawal.payoutStatus || "")
                  .trim()
                  .toLowerCase();
                const awaitingManualOtp =
                  payoutGateway === "manual" && payoutStatus === "otp";
                const awaitingPaystackOtp =
                  payoutGateway === "paystack" && payoutStatus === "otp";
                const canVerifyTransfer =
                  payoutGateway === "paystack" &&
                  Boolean(withdrawal.payoutReference) &&
                  paystackPendingStatuses.includes(payoutStatus);

                return (
                  <div
                    key={withdrawal.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <User className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {withdrawal.accountName}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <Building2 className="h-4 w-4" />
                            <span>
                              {withdrawal.bankName} - {withdrawal.accountNumber}
                            </span>
                          </div>
                          {(withdrawal.contributionType || withdrawal.groupName) && (
                            <p className="mt-1 text-sm text-gray-500">
                              Contribution:{" "}
                              {withdrawal.contributionType
                                ? getContributionTypeLabel(
                                    withdrawal.contributionType,
                                  )
                                : "Contribution"}
                              {withdrawal.groupName
                                ? ` · ${withdrawal.groupName}`
                                : ""}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateTime(withdrawal.createdAt)}</span>
                          </div>
                          {withdrawal.reason && (
                            <p className="mt-2 text-sm italic text-gray-600">
                              "{withdrawal.reason}"
                            </p>
                          )}
                          {withdrawal.manualPayout?.method && (
                            <p className="mt-2 text-xs text-purple-700">
                              Manual Method:{" "}
                              {formatManualMethodLabel(withdrawal.manualPayout.method)}
                            </p>
                          )}
                        </div>
                      </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                        <div className="mt-2">{getStatusBadge(withdrawal.status)}</div>
                        {withdrawal.payoutReference && (
                          <p className="mt-1 text-xs text-gray-500">
                            Payout:{" "}
                            {withdrawal.payoutGateway
                              ? withdrawal.payoutGateway.toUpperCase()
                              : "GATEWAY"}{" "}
                            · {withdrawal.payoutReference}
                          </p>
                        )}
                        {withdrawal.payoutStatus && (
                          <p className="mt-1 text-xs text-amber-700">
                            Payout Status: {withdrawal.payoutStatus.toUpperCase()}
                          </p>
                        )}
                        {withdrawal.payoutTransferCode && (
                          <p className="mt-1 text-xs text-gray-500">
                            Transfer Code: {withdrawal.payoutTransferCode}
                          </p>
                        )}
                        {withdrawal.manualPayout?.externalReference && (
                          <p className="mt-1 text-xs text-gray-500">
                            Manual Ref: {withdrawal.manualPayout.externalReference}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistoryTarget(withdrawal)}
                      >
                        Audit Trail
                      </Button>
                    </div>

                    {withdrawal.status === "pending" && (
                      <div className="mt-4 flex gap-2 border-t pt-4">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Review & Verify
                        </Button>
                      </div>
                    )}

                    {["approved", "processing"].includes(withdrawal.status) && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                        {withdrawal.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkProcessing(withdrawal)}
                            disabled={processingId === withdrawal.id}
                          >
                            {processingId === withdrawal.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Clock className="mr-1 h-4 w-4" />
                            )}
                            Mark Processing
                          </Button>
                        )}

                        {canCompletePayout ? (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => openPayoutDialog(withdrawal)}
                            disabled={processingId === withdrawal.id}
                          >
                            <Wallet className="mr-1 h-4 w-4" />
                            Open Payout
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex cursor-help items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                                tabIndex={0}
                              >
                                Admin action required
                                <Info className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Only admins can initiate payout actions.
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {canVerifyTransfer && canCompletePayout && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyTransfer(withdrawal)}
                            disabled={verifyTargetId === withdrawal.id}
                          >
                            {verifyTargetId === withdrawal.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-4 w-4" />
                            )}
                            Verify Transfer
                          </Button>
                        )}

                        {(awaitingManualOtp || awaitingPaystackOtp) &&
                          (canFinalizeOtp ? (
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700"
                              onClick={() => openOtpDialog(withdrawal)}
                            >
                              <Send className="mr-1 h-4 w-4" />
                              {awaitingManualOtp
                                ? "Finalize Manual OTP"
                                : "Finalize OTP"}
                            </Button>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex cursor-help items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                                  tabIndex={0}
                                >
                                  Admin action required
                                  <Info className="h-3 w-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Only admins can finalize OTP-authorized payouts.
                              </TooltipContent>
                            </Tooltip>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {pageStart}-{pageEnd} of {total} requests
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

      <Sheet
        open={Boolean(historyTarget)}
        onOpenChange={(open) => {
          if (!open) setHistoryTarget(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          {historyTarget && (
            <div className="min-h-full bg-slate-950 text-slate-100">
              <div className="border-b border-slate-800 bg-slate-900 px-6 py-6">
                <SheetHeader className="space-y-3 text-left">
                  <SheetTitle className="text-white">
                    Withdrawal Payout Audit
                  </SheetTitle>
                  <SheetDescription className="text-slate-300">
                    Inspect payout attempts, OTP actions, and settlement trail
                    for this withdrawal without opening raw documents.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {historyTarget.accountName}
                      </p>
                      <p className="text-sm text-slate-300">
                        {historyTarget.bankName} - {historyTarget.accountNumber}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                        Current Status
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {getStatusBadge(historyTarget.status)}
                        {historyTarget.payoutGateway && (
                          <Badge className="bg-slate-800 text-slate-200">
                            {historyTarget.payoutGateway.toUpperCase()}
                          </Badge>
                        )}
                        {historyTarget.payoutStatus && (
                          <Badge className="bg-amber-500/10 text-amber-300">
                            {historyTarget.payoutStatus.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(historyTarget.amount)}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Requested {formatDateTime(historyTarget.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-6 py-6">
                {auditEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-300">
                    No payout events have been recorded for this withdrawal yet.
                  </div>
                ) : (
                  auditEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{entry.title}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {entry.message}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(entry.occurredAt)}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Gateway
                          </p>
                          <p className="mt-1">{entry.gateway || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Status
                          </p>
                          <p className="mt-1">{entry.status || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Reference
                          </p>
                          <p className="mt-1 break-all">{entry.reference || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Transfer Code
                          </p>
                          <p className="mt-1 break-all">
                            {entry.transferCode || "—"}
                          </p>
                        </div>
                      </div>

                      {entry.metadata && (
                        <div className="mt-4 rounded-xl bg-slate-950/70 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Metadata
                          </p>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-300">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(selectedWithdrawal)}
        onOpenChange={(open) => {
          if (!open) resetReviewDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Withdrawal Request</DialogTitle>
            <DialogDescription>
              Confirm the request details, add operational notes, and either
              approve or reject the withdrawal.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{selectedWithdrawal.accountName}</p>
                    <p className="text-sm text-gray-500">
                      {selectedWithdrawal.bankName} -{" "}
                      {selectedWithdrawal.accountNumber}
                    </p>
                    {(selectedWithdrawal.contributionType ||
                      selectedWithdrawal.groupName) && (
                      <p className="text-sm text-gray-500">
                        Contribution:{" "}
                        {selectedWithdrawal.contributionType
                          ? getContributionTypeLabel(
                              selectedWithdrawal.contributionType,
                            )
                          : "Contribution"}
                        {selectedWithdrawal.groupName
                          ? ` · ${selectedWithdrawal.groupName}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <p className="text-xl font-bold">
                    {formatCurrency(selectedWithdrawal.amount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Admin Notes
                </label>
                <Textarea
                  placeholder="Add internal notes for the payout team..."
                  rows={3}
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Rejection Reason
                </label>
                <Textarea
                  placeholder="Explain why this withdrawal should be rejected..."
                  rows={3}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  onClick={resetReviewDialog}
                  disabled={processingId === selectedWithdrawal.id}
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedWithdrawal)}
                    disabled={processingId === selectedWithdrawal.id}
                  >
                    {processingId === selectedWithdrawal.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(selectedWithdrawal)}
                    disabled={processingId === selectedWithdrawal.id}
                  >
                    {processingId === selectedWithdrawal.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-1 h-4 w-4" />
                    )}
                    Verify & Approve
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(payoutTarget)}
        onOpenChange={(open) => {
          if (!open) resetPayoutDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Withdrawal Payout</DialogTitle>
            <DialogDescription>
              Choose how this approved withdrawal should be settled and capture
              the right payout details for audit and follow-up.
            </DialogDescription>
          </DialogHeader>
          {payoutTarget && (
            <>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{payoutTarget.accountName}</p>
                    <p className="text-sm text-gray-500">
                      {payoutTarget.bankName} - {payoutTarget.accountNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      Requested {formatDateTime(payoutTarget.createdAt)}
                    </p>
                  </div>
                  <p className="text-xl font-bold">
                    {formatCurrency(payoutTarget.amount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={payoutMode === "paystack" ? "default" : "outline"}
                  className={payoutMode === "paystack" ? "bg-emerald-600" : ""}
                  onClick={() => setPayoutMode("paystack")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Paystack Transfer
                </Button>
                <Button
                  type="button"
                  variant={payoutMode === "manual" ? "default" : "outline"}
                  className={payoutMode === "manual" ? "bg-slate-700" : ""}
                  onClick={() => setPayoutMode("manual")}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Manual Payout
                </Button>
              </div>

              {payoutMode === "paystack" ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    This will initiate or resume a live payout from the Paystack
                    balance to the bank account supplied by the member.
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Paystack Transfer Reference
                    </label>
                    <Input
                      placeholder="Optional custom reference"
                      value={payoutReference}
                      onChange={(event) => setPayoutReference(event.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Leave blank to let the server generate a safe reference.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    Manual payout is OTP-authorized before finalization so the
                    offline settlement is still auditable and controlled.
                  </div>
                  {String(payoutTarget.payoutGateway || "").toLowerCase() ===
                    "paystack" &&
                    payoutTarget.payoutReference &&
                    String(payoutTarget.payoutStatus || "").toLowerCase() !==
                      "success" && (
                      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        A previous Paystack attempt exists for this withdrawal.
                        Switching to manual payout will supersede that attempt in
                        the audit trail, so only continue after confirming the
                        member has not already been credited.
                      </div>
                    )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Manual Payout Method
                    </label>
                    <Select
                      value={manualMethod}
                      onValueChange={(value) =>
                        setManualMethod(value as ManualWithdrawalMethod)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {manualPayoutMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {
                        manualPayoutMethodOptions.find(
                          (option) => option.value === manualMethod,
                        )?.description
                      }
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Settled At
                      </label>
                      <Input
                        type="datetime-local"
                        value={manualOccurredAt}
                        onChange={(event) =>
                          setManualOccurredAt(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        External Reference
                      </label>
                      <Input
                        placeholder="Teller no., cheque no., or bank ref"
                        value={manualReference}
                        onChange={(event) =>
                          setManualReference(event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <Textarea
                      placeholder="Add evidence or operational notes for this payout..."
                      rows={3}
                      value={manualNotes}
                      onChange={(event) => setManualNotes(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  onClick={resetPayoutDialog}
                  disabled={processingId === payoutTarget.id}
                >
                  Cancel
                </Button>
                <Button
                  className={
                    payoutMode === "manual"
                      ? "bg-slate-700 hover:bg-slate-800"
                      : "bg-purple-600 hover:bg-purple-700"
                  }
                  onClick={handleSubmitPayout}
                  disabled={processingId === payoutTarget.id}
                >
                  {processingId === payoutTarget.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : payoutMode === "manual" ? (
                    <CheckCircle className="mr-1 h-4 w-4" />
                  ) : (
                    <Send className="mr-1 h-4 w-4" />
                  )}
                  {payoutMode === "manual"
                    ? "Request Admin OTP"
                    : "Start Paystack Payout"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(otpTarget)}
        onOpenChange={(open) => {
          if (!open) resetOtpDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isManualOtpTarget
                ? "Finalize Manual Withdrawal Payout"
                : "Finalize Paystack OTP"}
            </DialogTitle>
            <DialogDescription>
              {isManualOtpTarget
                ? "Enter the authorization code sent to the initiating admin before this manual payout can be completed."
                : "Paystack requires OTP authorization to complete this withdrawal transfer."}
            </DialogDescription>
          </DialogHeader>

          {otpTarget && (
            <>
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {isManualOtpTarget
                  ? buildOtpDeliveryHint(
                      otpTarget.manualPayout?.otpChannel ?? null,
                      otpTarget.manualPayout?.otpRecipient ?? null,
                      otpTarget.manualPayout?.otpBackupChannels ?? [],
                    )
                  : "Paystack has requested OTP verification for this payout."}
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{otpTarget.accountName}</p>
                    <p className="text-sm text-gray-500">
                      {otpTarget.bankName} - {otpTarget.accountNumber}
                    </p>
                    {isManualOtpTarget && otpTarget.manualPayout?.method && (
                      <p className="text-sm text-gray-500">
                        Manual Method:{" "}
                        {formatManualMethodLabel(otpTarget.manualPayout.method)}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold">
                    {formatCurrency(otpTarget.amount)}
                  </p>
                </div>
                {isManualOtpTarget && (
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>
                      Settled At: {formatDateTime(otpTarget.manualPayout?.occurredAt)}
                    </p>
                    <p>
                      External Ref:{" "}
                      {otpTarget.manualPayout?.externalReference || "Not provided"}
                    </p>
                    {otpTarget.manualPayout?.notes && (
                      <p>Notes: {otpTarget.manualPayout.notes}</p>
                    )}
                  </div>
                )}
              </div>

              {!isManualOtpTarget && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Transfer Code
                  </label>
                  <Input
                    placeholder="e.g. TRF_ABC123"
                    value={transferCode}
                    onChange={(event) => setTransferCode(event.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">OTP</label>
                <Input
                  placeholder="Enter OTP"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={resetOtpDialog}
                    disabled={otpAction !== null}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResendOtp}
                    disabled={resendDisabled}
                  >
                    {otpAction === "resend" ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-4 w-4" />
                    )}
                    {resendLabel}
                  </Button>
                  {isManualOtpTarget && (
                    <Button
                      variant="destructive"
                      onClick={() => setManualCancelTarget(otpTarget)}
                      disabled={
                        otpAction !== null || manualCancelBusyId === otpTarget.id
                      }
                    >
                      {manualCancelBusyId === otpTarget.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-1 h-4 w-4" />
                      )}
                      Cancel Manual Flow
                    </Button>
                  )}
                </div>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={handleFinalizeOtp}
                  disabled={otpAction !== null}
                >
                  {otpAction === "finalize" ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-4 w-4" />
                  )}
                  Finalize OTP
                </Button>
              </DialogFooter>

              {resendCooldownSeconds > 0 && (
                <p className="text-xs text-amber-700">
                  You can resend a new OTP in {resendCooldownSeconds}s.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(manualCancelTarget)}
        onOpenChange={(open) => {
          if (!open) setManualCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Manual Payout Authorization</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the pending manual payout OTP flow so the team can
              switch back to Paystack or restart the manual settlement cleanly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {manualCancelTarget && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {manualCancelTarget.accountName}
              </p>
              <p>
                {manualCancelTarget.bankName} - {manualCancelTarget.accountNumber}
              </p>
              <p className="mt-2">
                Amount: {formatCurrency(manualCancelTarget.amount)}
              </p>
              {manualCancelTarget.manualPayout?.method && (
                <p>
                  Method:{" "}
                  {formatManualMethodLabel(
                    manualCancelTarget.manualPayout.method,
                  )}
                </p>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={manualCancelBusyId !== null}>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleCancelManualPayout();
              }}
              disabled={manualCancelBusyId !== null}
            >
              {manualCancelBusyId !== null ? "Cancelling..." : "Cancel Flow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
