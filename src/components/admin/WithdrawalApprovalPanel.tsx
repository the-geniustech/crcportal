import { useState, useEffect, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useWithdrawalsAdminQuery } from "@/hooks/finance/useWithdrawalsAdminQuery";
import {
  useApproveWithdrawalMutation,
  useCompleteWithdrawalMutation,
  useFinalizeWithdrawalOtpMutation,
  useMarkWithdrawalProcessingMutation,
  useRejectWithdrawalMutation,
  useResendWithdrawalOtpMutation,
} from "@/hooks/finance/useWithdrawalAdminMutations";
import { getContributionTypeLabel } from "@/lib/contributionPolicy";
import {
  ArrowDownRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Building2,
  User,
  Calendar,
  Search,
  Send,
  Info,
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  group_id: string | null;
  group_name: string | null;
  contribution_type: string | null;
  bank_name: string;
  account_number: string;
  account_name: string;
  reason: string | null;
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  payout_reference: string | null;
  payout_gateway: string | null;
  payout_transfer_code: string | null;
  payout_status: string | null;
  payout_otp_resent_at: string | null;
}

interface WithdrawalApprovalPanelProps {
  canCompletePayout?: boolean;
  canFinalizeOtp?: boolean;
}

const buildPageItems = (currentPage: number, totalPages: number) => {
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
};

export default function WithdrawalApprovalPanel({
  canCompletePayout = true,
  canFinalizeOtp = true,
}: WithdrawalApprovalPanelProps) {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [completionTarget, setCompletionTarget] =
    useState<WithdrawalRequest | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [otpTarget, setOtpTarget] = useState<WithdrawalRequest | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [otpResendCooldownSeconds, setOtpResendCooldownSeconds] = useState(0);

  const withdrawalsQuery = useWithdrawalsAdminQuery({
    status: filter === "all" ? undefined : filter,
  });
  const approveMutation = useApproveWithdrawalMutation();
  const rejectMutation = useRejectWithdrawalMutation();
  const markProcessingMutation = useMarkWithdrawalProcessingMutation();
  const completeMutation = useCompleteWithdrawalMutation();
  const finalizeOtpMutation = useFinalizeWithdrawalOtpMutation();
  const resendOtpMutation = useResendWithdrawalOtpMutation();

  useEffect(() => {
    const data = (withdrawalsQuery.data?.withdrawals ?? []).map((w: unknown) => ({
      id: String(w._id),
      user_id: String(w.userId),
      amount: Number(w.amount || 0),
      group_id: w.groupId ? String(w.groupId) : null,
      group_name: w.groupName ? String(w.groupName) : null,
      contribution_type: w.contributionType ? String(w.contributionType) : null,
      bank_name: String(w.bankName),
      account_number: String(w.accountNumber),
      account_name: String(w.accountName),
      reason: w.reason ?? null,
      status: w.status,
      admin_notes: w.adminNotes ?? null,
      rejection_reason: w.rejectionReason ?? null,
      created_at: String(w.createdAt || ""),
      approved_at: w.approvedAt ? String(w.approvedAt) : null,
      completed_at: w.completedAt ? String(w.completedAt) : null,
      payout_reference: w.payoutReference ? String(w.payoutReference) : null,
      payout_gateway: w.payoutGateway ? String(w.payoutGateway) : null,
      payout_transfer_code: w.payoutTransferCode ? String(w.payoutTransferCode) : null,
      payout_status: w.payoutStatus ? String(w.payoutStatus) : null,
      payout_otp_resent_at: w.payoutOtpResentAt ? String(w.payoutOtpResentAt) : null,
    }));

    setWithdrawals(data);
    setLoading(withdrawalsQuery.isLoading);
  }, [withdrawalsQuery.data?.withdrawals, withdrawalsQuery.isLoading]);

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
    if (!otpTarget.payout_otp_resent_at || !otpResendCooldownSeconds) {
      setResendCooldownSeconds(0);
      return;
    }
    const lastResentAt = Date.parse(otpTarget.payout_otp_resent_at);
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

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    setProcessingId(withdrawal.id);
    try {
      await approveMutation.mutateAsync({
        id: withdrawal.id,
        adminNotes: adminNotes || null,
      });

      toast({
        title: "Withdrawal Approved",
        description: `Withdrawal of ₦${withdrawal.amount.toLocaleString()} has been approved`,
      });

      await withdrawalsQuery.refetch();
      setSelectedWithdrawal(null);
      setAdminNotes("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to approve withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(withdrawal.id);
    try {
      await rejectMutation.mutateAsync({
        id: withdrawal.id,
        rejectionReason,
        adminNotes: adminNotes || null,
      });

      toast({
        title: "Withdrawal Rejected",
        description: "The withdrawal request has been rejected",
      });

      await withdrawalsQuery.refetch();
      setSelectedWithdrawal(null);
      setAdminNotes("");
      setRejectionReason("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to reject withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkComplete = async (withdrawal: WithdrawalRequest) => {
    if (!canCompletePayout) return;
    setProcessingId(withdrawal.id);
    try {
      const result = await completeMutation.mutateAsync({
        id: withdrawal.id,
        reference: payoutReference || undefined,
        gateway: "paystack",
      });

      const payoutStatus = result?.withdrawal?.payoutStatus;
      if (payoutStatus === "otp") {
        toast({
          title: "OTP Required",
          description:
            "Paystack requested OTP authorization. Finalize the transfer to complete this payout.",
        });
        const updatedWithdrawal = {
          ...withdrawal,
          status: "processing",
          payout_reference:
            result?.withdrawal?.payoutReference ?? withdrawal.payout_reference,
          payout_gateway:
            result?.withdrawal?.payoutGateway ?? withdrawal.payout_gateway,
          payout_transfer_code:
            result?.withdrawal?.payoutTransferCode ??
            withdrawal.payout_transfer_code,
          payout_status: "otp",
        };
        setOtpTarget(updatedWithdrawal);
        setTransferCode(updatedWithdrawal.payout_transfer_code || "");
        setOtpCode("");
      } else {
        toast({
          title: "Withdrawal Completed",
          description: `Withdrawal of ₦${withdrawal.amount.toLocaleString()} marked as completed`,
        });
      }

      await withdrawalsQuery.refetch();
      setCompletionTarget(null);
      setPayoutReference("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "Failed to complete withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFinalizeOtp = async (withdrawal: WithdrawalRequest) => {
    if (!canFinalizeOtp) return;
    if (!otpCode.trim()) {
      toast({
        title: "OTP Required",
        description: "Enter the OTP sent by Paystack to finalize this transfer.",
        variant: "destructive",
      });
      return;
    }

    if (!transferCode.trim()) {
      toast({
        title: "Transfer Code Required",
        description: "Enter the transfer code for this payout.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(withdrawal.id);
    try {
      await finalizeOtpMutation.mutateAsync({
        id: withdrawal.id,
        transferCode: transferCode.trim(),
        otp: otpCode.trim(),
      });

      toast({
        title: "Transfer Finalized",
        description: "OTP verified. The payout is now processing.",
      });

      await withdrawalsQuery.refetch();
      setOtpTarget(null);
      setOtpCode("");
      setTransferCode("");
    } catch (error: unknown) {
      toast({
        title: "Finalize Failed",
        description:
          (error as Error).message || "Failed to finalize transfer",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };


  const handleResendOtp = async (withdrawal: WithdrawalRequest) => {
    if (!canFinalizeOtp) return;
    if (!transferCode.trim()) {
      toast({
        title: "Transfer Code Required",
        description: "Enter the transfer code to resend OTP.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(withdrawal.id);
    try {
      const result = await resendOtpMutation.mutateAsync({
        id: withdrawal.id,
        transferCode: transferCode.trim(),
      });

      toast({
        title: "OTP Resent",
        description: "A new OTP has been sent to your Paystack contact.",
      });

      const retryAfter = result?.retryAfter;
      const cooldown =
        typeof retryAfter === "number" && retryAfter > 0
          ? retryAfter
          : otpResendCooldownSeconds;
      if (cooldown > 0) {
        setResendCooldownSeconds(cooldown);
        setOtpResendCooldownSeconds(cooldown);
      }

      await withdrawalsQuery.refetch();
    } catch (error: unknown) {
      const retryAfter = (error as Error & { retryAfter?: number }).retryAfter;
      const cooldown =
        typeof retryAfter === "number" && retryAfter > 0
          ? retryAfter
          : otpResendCooldownSeconds;
      if (cooldown > 0) {
        setResendCooldownSeconds(cooldown);
        setOtpResendCooldownSeconds(cooldown);
      }
      toast({
        title: "Resend Failed",
        description:
          (error as Error).message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleMarkProcessing = async (withdrawal: WithdrawalRequest) => {
    setProcessingId(withdrawal.id);
    try {
      await markProcessingMutation.mutateAsync(withdrawal.id);
      toast({
        title: "Marked as Processing",
        description: "Withdrawal status updated to processing.",
      });
      await withdrawalsQuery.refetch();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "Failed to mark withdrawal as processing",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const resendDisabled =
    !otpTarget ||
    processingId === otpTarget.id ||
    resendCooldownSeconds > 0;

  const resendLabel =
    resendCooldownSeconds > 0
      ? `Resend OTP (${resendCooldownSeconds}s)`
      : "Resend OTP";

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesSearch =
      w.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.account_number.includes(searchTerm) ||
      w.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || w.status === filter;
    return matchesSearch && matchesFilter;
  });

  const total = filteredWithdrawals.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);
  const pagedWithdrawals = filteredWithdrawals.slice(
    (currentPage - 1) * pageSize,
    pageEnd,
  );
  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const stats = {
    pending: withdrawals.filter((w) => w.status === "pending").length,
    approved: withdrawals.filter((w) => w.status === "approved").length,
    processing: withdrawals.filter((w) => w.status === "processing").length,
    pendingAmount: withdrawals
      .filter((w) => w.status === "pending")
      .reduce((sum, w) => sum + w.amount, 0),
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-700">Approved</Badge>;
      case "processing":
        return (
          <Badge className="bg-purple-100 text-purple-700">Processing</Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
        );
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Loading withdrawal requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-amber-700 text-sm">Pending</p>
                <p className="font-bold text-amber-800 text-2xl">
                  {stats.pending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-blue-700 text-sm">Approved</p>
                <p className="font-bold text-blue-800 text-2xl">
                  {stats.approved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-purple-700 text-sm">Processing</p>
                <p className="font-bold text-purple-800 text-2xl">
                  {stats.processing}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-emerald-700 text-sm">Pending Amount</p>
                <p className="font-bold text-emerald-800 text-xl">
                  ₦{stats.pendingAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex md:flex-row flex-col gap-4">
            <div className="relative flex-1">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
              <Input
                placeholder="Search by name, account number, or bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {[
                "all",
                "pending",
                "approved",
                "processing",
                "completed",
                "rejected",
              ].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className={filter === status ? "bg-emerald-600" : ""}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => withdrawalsQuery.refetch()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal List */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowDownRight className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p className="text-gray-500">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pagedWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="hover:bg-gray-50 p-4 border rounded-lg transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex justify-center items-center bg-gray-100 rounded-full w-12 h-12">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {withdrawal.account_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
                          <Building2 className="w-4 h-4" />
                          <span>
                            {withdrawal.bank_name} - {withdrawal.account_number}
                          </span>
                        </div>
                        {(withdrawal.contribution_type ||
                          withdrawal.group_name) && (
                          <p className="mt-1 text-gray-500 text-sm">
                            Contribution:{" "}
                            {withdrawal.contribution_type
                              ? getContributionTypeLabel(
                                  withdrawal.contribution_type,
                                )
                              : "Contribution"}{" "}
                            {withdrawal.group_name
                              ? `· ${withdrawal.group_name}`
                              : ""}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(withdrawal.created_at)}</span>
                        </div>
                        {withdrawal.reason && (
                          <p className="mt-2 text-gray-600 text-sm italic">
                            "{withdrawal.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-xl">
                        ₦{withdrawal.amount.toLocaleString()}
                      </p>
                      <div className="mt-2">
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      {withdrawal.payout_reference && (
                        <p className="mt-1 text-gray-500 text-xs">
                          Payout:{" "}
                          {withdrawal.payout_gateway
                            ? withdrawal.payout_gateway.toUpperCase()
                            : "Gateway"}{" "}
                          · {withdrawal.payout_reference}
                        </p>
                      )}                      {withdrawal.payout_status && (
                        <p className="mt-1 text-amber-600 text-xs">
                          Payout Status: {withdrawal.payout_status.toUpperCase()}
                        </p>
                      )}
                      {withdrawal.payout_transfer_code && (
                        <p className="mt-1 text-gray-500 text-xs">
                          Transfer Code: {withdrawal.payout_transfer_code}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {withdrawal.status === "pending" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                      >
                        <CheckCircle className="mr-1 w-4 h-4" />
                        Review & Verify
                      </Button>
                    </div>
                  )}

                  {withdrawal.status === "approved" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkProcessing(withdrawal)}
                        disabled={processingId === withdrawal.id}
                      >
                        {processingId === withdrawal.id ? (
                          <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                        ) : (
                          <Clock className="mr-1 w-4 h-4" />
                        )}
                        Mark Processing
                      </Button>
                      {canCompletePayout && (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            setCompletionTarget(withdrawal);
                            setPayoutReference("");
                          }}
                          disabled={processingId === withdrawal.id}
                        >
                          <Send className="mr-1 w-4 h-4" />
                          Complete Payout
                        </Button>
                      )}
                      {!canCompletePayout && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 cursor-help"
                              tabIndex={0}
                            >
                              Admin action required
                              <Info className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Only admins can complete payouts.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}

                  {withdrawal.status === "processing" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {withdrawal.payout_status === "otp" ? (
                        canFinalizeOtp ? (
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => {
                              setOtpTarget(withdrawal);
                              setTransferCode(
                                withdrawal.payout_transfer_code || "",
                              );
                              setOtpCode("");
                            }}
                            disabled={processingId === withdrawal.id}
                          >
                            <Send className="mr-1 w-4 h-4" />
                            Finalize OTP
                          </Button>
                        ) : null
                      ) : canCompletePayout ? (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            setCompletionTarget(withdrawal);
                            setPayoutReference("");
                          }}
                          disabled={processingId === withdrawal.id}
                        >
                          <Send className="mr-1 w-4 h-4" />
                          Complete Payout
                        </Button>
                      ) : null}
                      {!canFinalizeOtp &&
                        withdrawal.payout_status === "otp" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 cursor-help"
                                tabIndex={0}
                              >
                                Admin action required
                                <Info className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Only admins can finalize OTP transfers.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      {!canCompletePayout &&
                        withdrawal.payout_status !== "otp" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 cursor-help"
                                tabIndex={0}
                              >
                                Admin action required
                                <Info className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Only admins can complete payouts.
                            </TooltipContent>
                          </Tooltip>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 rounded-xl">
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
                    setCurrentPage((prev) =>
                      Math.min(totalPages, prev + 1),
                    );
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Review Modal */}
      {selectedWithdrawal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Review Withdrawal Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {selectedWithdrawal.account_name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {selectedWithdrawal.bank_name} -{" "}
                      {selectedWithdrawal.account_number}
                    </p>
                    {(selectedWithdrawal.contribution_type ||
                      selectedWithdrawal.group_name) && (
                      <p className="text-gray-500 text-sm">
                        Contribution:{" "}
                        {selectedWithdrawal.contribution_type
                          ? getContributionTypeLabel(
                              selectedWithdrawal.contribution_type,
                            )
                          : "Contribution"}{" "}
                        {selectedWithdrawal.group_name
                          ? `· ${selectedWithdrawal.group_name}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-xl">
                    ₦{selectedWithdrawal.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes about this withdrawal..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">
                  Rejection Reason (Required if rejecting)
                </label>
                <Textarea
                  placeholder="Provide reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedWithdrawal(null);
                    setAdminNotes("");
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReject(selectedWithdrawal)}
                  disabled={processingId === selectedWithdrawal.id}
                >
                  {processingId === selectedWithdrawal.id ? (
                    <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-1 w-4 h-4" />
                  )}
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleApprove(selectedWithdrawal)}
                  disabled={processingId === selectedWithdrawal.id}
                >
                  {processingId === selectedWithdrawal.id ? (
                    <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1 w-4 h-4" />
                  )}
                  Verify & Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Payout Modal */}
      {canCompletePayout && completionTarget && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Complete Withdrawal Payout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {completionTarget.account_name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {completionTarget.bank_name} -{" "}
                      {completionTarget.account_number}
                    </p>
                  </div>
                  <p className="font-bold text-xl">
                    ₦{completionTarget.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-blue-700 text-sm">
                This payout will be sent from the Paystack balance to the bank
                account provided by the member.
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">
                  Paystack Transfer Reference (Optional)
                </label>
                <Input
                  placeholder="e.g., PTSK_TRF_123456"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCompletionTarget(null);
                    setPayoutReference("");
                  }}
                  disabled={processingId === completionTarget.id}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleMarkComplete(completionTarget)}
                  disabled={processingId === completionTarget.id}
                >
                  {processingId === completionTarget.id ? (
                    <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="mr-1 w-4 h-4" />
                  )}
                  Complete Payout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    
      {/* Finalize OTP Modal */}
      {canFinalizeOtp && otpTarget && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Finalize Paystack OTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg text-amber-800 text-sm">
                Paystack requires OTP authorization to complete this transfer.
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">
                  Transfer Code
                </label>
                <Input
                  placeholder="e.g., TRF_ABC123"
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">
                  OTP
                </label>
                <Input
                  placeholder="Enter OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOtpTarget(null);
                    setOtpCode("");
                    setTransferCode("");
                  }}
                  disabled={processingId === otpTarget.id}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleResendOtp(otpTarget)}
                  disabled={resendDisabled}
                >
                  {processingId === otpTarget.id ? (
                    <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 w-4 h-4" />
                  )}
                  {resendLabel}
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleFinalizeOtp(otpTarget)}
                  disabled={processingId === otpTarget.id}
                >
                  {processingId === otpTarget.id ? (
                    <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="mr-1 w-4 h-4" />
                  )}
                  Finalize OTP
                </Button>
              </div>
              {resendCooldownSeconds > 0 && (
                <p className="text-amber-700 text-xs">
                  You can resend a new OTP in {resendCooldownSeconds}s.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}








