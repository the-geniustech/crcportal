import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMyTransactionsQuery } from "@/hooks/finance/useMyTransactionsQuery";
import {
  mapBackendTransaction,
  type PaymentTransaction,
} from "@/lib/finance";
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface TransactionHistoryProps {
  onViewReceipt: (transaction: PaymentTransaction) => void;
}

const typeConfig = {
  deposit: {
    label: "Deposit",
    icon: ArrowDownLeft,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  loan_repayment: {
    label: "Loan Repayment",
    icon: CreditCard,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  group_contribution: {
    label: "Group Contribution",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  withdrawal: {
    label: "Withdrawal",
    icon: ArrowUpRight,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  interest: {
    label: "Interest",
    icon: TrendingUp,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
};

const statusConfig = {
  success: { label: "Success", color: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
};

export default function TransactionHistory({
  onViewReceipt,
}: TransactionHistoryProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const transactionsQuery = useMyTransactionsQuery({ limit: 200 });

  const transactions: PaymentTransaction[] = useMemo(() => {
    const list = transactionsQuery.data?.transactions ?? [];
    return list.map((transaction) => mapBackendTransaction(transaction));
  }, [transactionsQuery.data?.transactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.reference
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesType =
        typeFilter === "all" || transaction.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || transaction.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalAmount = filteredTransactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount, 0);

  const csvEscape = (value: unknown) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const handleExport = () => {
    const header = [
      "date",
      "reference",
      "type",
      "status",
      "amount",
      "description",
      "groupName",
      "loanName",
      "channel",
    ];

    const rows = filteredTransactions.map((t) =>
      [
        t.date,
        t.reference,
        t.type,
        t.status,
        t.amount,
        t.description,
        t.groupName ?? "",
        t.loanName ?? "",
        t.channel ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Transaction history has been exported.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Transaction History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={transactionsQuery.isLoading}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex md:flex-row flex-col gap-4">
          <div className="relative flex-1">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
            <Input
              placeholder="Search by reference or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="loan_repayment">Loan Repayments</SelectItem>
              <SelectItem value="group_contribution">
                Group Contributions
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-6 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg">
          <div>
            <p className="text-gray-600 text-sm">Total Transactions</p>
            <p className="font-bold text-gray-900 text-2xl">
              {filteredTransactions.length}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Amount (Success)</p>
            <p className="font-bold text-emerald-600 text-2xl">
              ₦{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {transactionsQuery.isLoading ? (
            <div className="py-12 text-gray-500 text-center">
              <Loader2 className="mx-auto mb-4 w-12 h-12 text-emerald-600 animate-spin" />
              <p>Loading transactions...</p>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="py-12 text-gray-500 text-center">
              <FileText className="opacity-50 mx-auto mb-4 w-12 h-12" />
              <p>
                {transactionsQuery.isError
                  ? "Failed to load transactions"
                  : "No transactions found"}
              </p>
            </div>
          ) : (
            paginatedTransactions.map((transaction) => {
              const typeInfo =
                typeConfig[transaction.type] ?? typeConfig.deposit;
              const statusInfo = statusConfig[transaction.status];
              const Icon = typeInfo.icon;

              return (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center bg-white hover:shadow-md p-4 border rounded-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${typeInfo.bgColor}`}>
                      <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <span>{transaction.reference}</span>
                        {transaction.groupName && (
                          <span className="text-purple-600">
                            • {transaction.groupName}
                          </span>
                        )}
                        {transaction.loanName && (
                          <span className="text-blue-600">
                            • {transaction.loanName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400 text-xs">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                      {transaction.type === "loan_repayment" &&
                        transaction.repaymentBreakdown && (
                          <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                            <span className="bg-blue-50 px-2 py-1 rounded-full font-medium text-blue-700">
                              Interest: NGN{" "}
                              {transaction.repaymentBreakdown.interestPaid.toLocaleString()}
                            </span>
                            <span className="bg-emerald-50 px-2 py-1 rounded-full font-medium text-emerald-700">
                              Principal: NGN{" "}
                              {transaction.repaymentBreakdown.principalPaid.toLocaleString()}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.type === "withdrawal"
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {transaction.type === "withdrawal" ? "-" : "+"}₦
                        {transaction.amount.toLocaleString()}
                      </p>
                      <Badge className={statusInfo.color} variant="secondary">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {transaction.status === "success" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReceipt(transaction)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
            <p className="text-gray-600 text-sm">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(
                currentPage * itemsPerPage,
                filteredTransactions.length,
              )}{" "}
              of {filteredTransactions.length} transactions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "bg-emerald-600" : ""}
                  >
                    {page}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
