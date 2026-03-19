import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWithdrawalsAdminQuery } from "@/hooks/finance/useWithdrawalsAdminQuery";
import {
  useApproveWithdrawalMutation,
  useCompleteWithdrawalMutation,
  useMarkWithdrawalProcessingMutation,
  useRejectWithdrawalMutation,
} from "@/hooks/finance/useWithdrawalAdminMutations";
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
  Filter,
  MessageSquare,
  Send,
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
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
}

export default function WithdrawalApprovalPanel() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("pending");
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const withdrawalsQuery = useWithdrawalsAdminQuery({
    status: filter === "all" ? undefined : filter,
  });
  const approveMutation = useApproveWithdrawalMutation();
  const rejectMutation = useRejectWithdrawalMutation();
  const markProcessingMutation = useMarkWithdrawalProcessingMutation();
  const completeMutation = useCompleteWithdrawalMutation();

  useEffect(() => {
    const data = (withdrawalsQuery.data ?? []).map((w: unknown) => ({
      id: String(w._id),
      user_id: String(w.userId),
      amount: Number(w.amount || 0),
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
    }));

    setWithdrawals(data);
    setLoading(withdrawalsQuery.isLoading);
  }, [withdrawalsQuery.data, withdrawalsQuery.isLoading]);

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
    setProcessingId(withdrawal.id);
    try {
      await completeMutation.mutateAsync({
        id: withdrawal.id,
        gateway: "manual",
      });

      toast({
        title: "Withdrawal Completed",
        description: `Withdrawal of ₦${withdrawal.amount.toLocaleString()} marked as completed`,
      });

      await withdrawalsQuery.refetch();
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

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesSearch =
      w.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.account_number.includes(searchTerm) ||
      w.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || w.status === filter;
    return matchesSearch && matchesFilter;
  });

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
              {filteredWithdrawals.map((withdrawal) => (
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
                        Review
                      </Button>
                    </div>
                  )}

                  {withdrawal.status === "approved" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleMarkComplete(withdrawal)}
                        disabled={processingId === withdrawal.id}
                      >
                        {processingId === withdrawal.id ? (
                          <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="mr-1 w-4 h-4" />
                        )}
                        Mark as Completed
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
