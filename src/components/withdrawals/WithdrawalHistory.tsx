import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyWithdrawalsQuery } from "@/hooks/finance/useMyWithdrawalsQuery";
import {
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Building2,
  Calendar,
  Filter,
  ChevronDown,
} from "lucide-react";

interface WithdrawalRequest {
  id: string;
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

export default function WithdrawalHistory() {
  const withdrawalsQuery = useMyWithdrawalsQuery();
  const [filter, setFilter] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const withdrawals: WithdrawalRequest[] = (withdrawalsQuery.data ?? []).map(
    (w: unknown) => ({
      id: String(w._id),
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
    }),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700">
            <Clock className="mr-1 w-3 h-3" />
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700">
            <CheckCircle className="mr-1 w-3 h-3" />
            Approved
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700">
            <Loader2 className="mr-1 w-3 h-3 animate-spin" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-700">
            <CheckCircle className="mr-1 w-3 h-3" />
            Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 hover:bg-red-100 text-red-700">
            <XCircle className="mr-1 w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (filter === "all") return true;
    return w.status === filter;
  });

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter((w) => w.status === "pending").length,
    completed: withdrawals.filter((w) => w.status === "completed").length,
    totalAmount: withdrawals
      .filter((w) => w.status === "completed")
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

  if (withdrawalsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-gray-500">Loading withdrawal history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Total Requests</p>
            <p className="font-bold text-gray-900 text-2xl">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Pending</p>
            <p className="font-bold text-amber-600 text-2xl">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Completed</p>
            <p className="font-bold text-emerald-600 text-2xl">
              {stats.completed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-sm">Total Withdrawn</p>
            <p className="font-bold text-gray-900 text-2xl">
              ₦{stats.totalAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              Withdrawal History
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  {filter === "all"
                    ? "All Status"
                    : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  <ChevronDown className="w-4 h-4" />
                </Button>
                {showFilterDropdown && (
                  <div className="top-full right-0 z-10 absolute bg-white shadow-lg mt-1 py-1 border rounded-lg min-w-[150px]">
                    {[
                      "all",
                      "pending",
                      "approved",
                      "processing",
                      "completed",
                      "rejected",
                    ].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilter(status);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          filter === status
                            ? "bg-emerald-50 text-emerald-700"
                            : ""
                        }`}
                      >
                        {status === "all"
                          ? "All Status"
                          : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => withdrawalsQuery.refetch()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowDownRight className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p className="text-gray-500">No withdrawal requests found</p>
              {filter !== "all" && (
                <Button
                  variant="link"
                  onClick={() => setFilter("all")}
                  className="text-emerald-600"
                >
                  View all withdrawals
                </Button>
              )}
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
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          withdrawal.status === "completed"
                            ? "bg-emerald-100"
                            : withdrawal.status === "rejected"
                              ? "bg-red-100"
                              : "bg-gray-100"
                        }`}
                      >
                        <ArrowDownRight
                          className={`h-6 w-6 ${
                            withdrawal.status === "completed"
                              ? "text-emerald-600"
                              : withdrawal.status === "rejected"
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          ₦{withdrawal.amount.toLocaleString()}
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
                        {withdrawal.rejection_reason && (
                          <p className="bg-red-50 mt-2 p-2 rounded text-red-600 text-sm">
                            Reason: {withdrawal.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(withdrawal.status)}
                      {withdrawal.completed_at && (
                        <p className="mt-2 text-gray-500 text-xs">
                          Completed: {formatDate(withdrawal.completed_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline */}
                  {(withdrawal.status === "approved" ||
                    withdrawal.status === "processing") && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <div className="bg-emerald-500 rounded-full w-2 h-2" />
                          <div className="bg-emerald-500 w-8 h-0.5" />
                        </div>
                        <div className="flex items-center">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              withdrawal.status === "approved" ||
                              withdrawal.status === "processing"
                                ? "bg-emerald-500"
                                : "bg-gray-300"
                            }`}
                          />
                          <div
                            className={`h-0.5 w-8 ${
                              withdrawal.status === "processing"
                                ? "bg-emerald-500"
                                : "bg-gray-300"
                            }`}
                          />
                        </div>
                        <div className="flex items-center">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              withdrawal.status === "processing"
                                ? "bg-purple-500 animate-pulse"
                                : "bg-gray-300"
                            }`}
                          />
                          <div className="bg-gray-300 w-8 h-0.5" />
                        </div>
                        <div className="bg-gray-300 rounded-full w-2 h-2" />
                      </div>
                      <div className="flex justify-between mt-1 text-gray-500 text-xs">
                        <span>Submitted</span>
                        <span>Approved</span>
                        <span>Processing</span>
                        <span>Completed</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
