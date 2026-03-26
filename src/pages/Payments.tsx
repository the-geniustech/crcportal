import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import PaymentModal from "@/components/payments/PaymentModal";
import TransactionHistory from "@/components/payments/TransactionHistory";
import ReceiptModal from "@/components/payments/ReceiptModal";
import PaymentReminders from "@/components/payments/PaymentReminders";
import RecurringPaymentsList from "@/components/payments/RecurringPaymentsList";
import { useSavingsSummaryQuery } from "@/hooks/finance/useSavingsSummaryQuery";
import { useMyTransactionsQuery } from "@/hooks/finance/useMyTransactionsQuery";
import { useVerifyPaystackPaymentMutation } from "@/hooks/payments/useVerifyPaystackPaymentMutation";
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Users,
  TrendingUp,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  Bell,
  Repeat,
  Mail,
  Shield,
} from "lucide-react";
import { BackendLoanApplication } from "@/lib/loans";
import type { BulkPaymentItem } from "@/lib/payments";

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  type:
    | "deposit"
    | "loan_repayment"
    | "group_contribution"
    | "withdrawal"
    | "interest";
  status: "success" | "pending" | "failed";
  description: string;
  date: string;
  channel?: string;
  groupName?: string;
  loanName?: string;
}

interface RawTransaction {
  _id: string;
  reference: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  date: string;
  channel?: string;
  groupName?: string;
  loanName?: string;
}

interface RawLoanApplication {
  status: string;
  remainingBalance: number;
}

interface PaymentVerificationResponse {
  status: string;
  amount: number;
}

interface PaymentReminder {
  type: "loan_repayment" | "group_contribution";
  title: string;
  amount: number;
  dueDate?: string;
  groupId?: string | null;
  groupName?: string | null;
  loanId?: string | null;
  loanName?: string | null;
  contributionType?: string | null;
}

export default function Payments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [preselectedType, setPreselectedType] = useState<
    "loan_repayment" | "group_contribution" | undefined
  >();
  const [preselectedAmount, setPreselectedAmount] = useState<
    number | undefined
  >();
  const [preselectedGroup, setPreselectedGroup] = useState<
    { id: string; name: string } | undefined
  >();
  const [preselectedLoan, setPreselectedLoan] = useState<
    { id: string; name: string } | undefined
  >();
  const [bulkItems, setBulkItems] = useState<BulkPaymentItem[] | undefined>(
    undefined,
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const savingsSummaryQuery = useSavingsSummaryQuery();
  const myTransactionsQuery = useMyTransactionsQuery({ limit: 200 });
  const myLoanApplicationsQuery = useMyLoanApplicationsQuery();
  const myGroupMembershipsQuery = useMyGroupMembershipsQuery();
  const verifyPaystackMutation = useVerifyPaystackPaymentMutation();

  // Check for payment callback
  useEffect(() => {
    const ref = searchParams.get("ref");
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");

    const paymentRef = ref || reference || trxref;

    if (paymentRef) {
      verifyPayment(paymentRef);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setIsVerifying(true);
    try {
      const tx = (await verifyPaystackMutation.mutateAsync(
        reference,
      )) as PaymentVerificationResponse;

      if (tx?.status === "success") {
        toast({
          title: "Payment Successful!",
          description: `Your payment of ₦${Number(tx.amount ?? 0).toLocaleString()} has been confirmed.`,
        });
        // Clear the URL params
        window.history.replaceState({}, "", "/payments");
      } else {
        toast({
          title: "Payment Status",
          description: `Payment status: ${tx?.status || "Unknown"}`,
          variant: tx?.status === "failed" ? "destructive" : undefined,
        });
      }
    } catch (error: unknown) {
      console.error("Payment verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Could not verify payment status.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickAction = (
    type: "loan_repayment" | "group_contribution",
    amount?: number,
  ) => {
    setPreselectedType(type);
    setPreselectedAmount(amount);
    setIsPaymentModalOpen(true);
  };

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsReceiptModalOpen(true);
  };

  const handlePayReminder = (reminder: PaymentReminder) => {
    setPreselectedType(reminder.type);
    setPreselectedAmount(reminder.amount);
    if (reminder.type === "group_contribution" && reminder.groupId) {
      setPreselectedGroup({
        id: reminder.groupId,
        name: reminder.groupName || "Group",
      });
    } else {
      setPreselectedGroup(undefined);
    }
    if (reminder.type === "loan_repayment" && reminder.loanId) {
      setPreselectedLoan({
        id: reminder.loanId,
        name: reminder.loanName || "Loan",
      });
    } else {
      setPreselectedLoan(undefined);
    }
    setBulkItems(undefined);
    setIsPaymentModalOpen(true);
  };

  const handlePayBulk = (reminders: PaymentReminder[]) => {
    if (!reminders.length) return;
    const type = reminders[0].type;
    const mismatch = reminders.some((r) => r.type !== type);
    if (mismatch) {
      toast({
        title: "Multiple Payment Types",
        description: "Bulk payments must be for a single payment type.",
        variant: "destructive",
      });
      return;
    }

    if (type === "loan_repayment") {
      const loanId = reminders[0].loanId;
      const loanMismatch = reminders.some((r) => r.loanId !== loanId);
      if (!loanId || loanMismatch) {
        toast({
          title: "Multiple Loans",
          description: "Bulk loan payments must target a single loan.",
          variant: "destructive",
        });
        return;
      }
    }

    const total = reminders.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const items: BulkPaymentItem[] = reminders.map((reminder) => ({
      type: reminder.type as "loan_repayment" | "group_contribution",
      amount: Number(reminder.amount || 0),
      groupId: reminder.groupId ?? null,
      loanApplicationId: reminder.loanId ?? null,
      contributionType: reminder.contributionType ?? null,
      dueDate: reminder.dueDate ?? null,
      description: reminder.title,
    }));

    const uniqueGroupId =
      type === "group_contribution"
        ? reminders.every((r) => r.groupId === reminders[0].groupId)
          ? reminders[0].groupId
          : null
        : null;
    const uniqueLoanId =
      type === "loan_repayment"
        ? reminders.every((r) => r.loanId === reminders[0].loanId)
          ? reminders[0].loanId
          : null
        : null;

    setBulkItems(items);
    setPreselectedType(type);
    setPreselectedAmount(total);
    setPreselectedGroup(
      uniqueGroupId
        ? {
            id: uniqueGroupId,
            name: reminders[0].groupName || "Group",
          }
        : undefined,
    );
    setPreselectedLoan(
      uniqueLoanId
        ? {
            id: uniqueLoanId,
            name: reminders[0].loanName || "Loan",
          }
        : undefined,
    );
    setIsPaymentModalOpen(true);
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartTs = monthStart.getTime();

  const txList: RawTransaction[] = myTransactionsQuery.data?.transactions ?? [];
  const monthlyDepositCount = txList.filter((t) => {
    const ts = new Date(t.date).getTime();
    return t.type === "deposit" && t.status === "success" && ts >= monthStartTs;
  }).length;

  const monthlyGroupContributions = txList
    .filter((t) => {
      const ts = new Date(t.date).getTime();
      return (
        t.type === "group_contribution" &&
        t.status === "success" &&
        ts >= monthStartTs
      );
    })
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const loanBalance = (myLoanApplicationsQuery.data ?? [])
    .filter((a: BackendLoanApplication) =>
      ["disbursed", "defaulted"].includes(String(a.status)),
    )
    .reduce((sum, a) => sum + Number(a.remainingBalance ?? 0), 0);

  const stats = {
    totalSavings: Number(savingsSummaryQuery.data?.ledgerBalance ?? 0),
    monthlyDeposits: Number(savingsSummaryQuery.data?.monthlyDeposits ?? 0),
    loanBalance,
    groupContributions: monthlyGroupContributions,
    activeGroups: Number(myGroupMembershipsQuery.data?.length ?? 0),
    monthlyDepositCount,
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 min-h-screen">
      {/* Header */}
      <header className="top-0 z-50 sticky bg-white border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="bg-gray-300 w-px h-6" />
              <h1 className="font-bold text-gray-900 text-xl">Payments</h1>
            </div>
            <Button
              onClick={() => setIsPaymentModalOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Make Payment
            </Button>
          </div>
        </div>
      </header>

      {/* Verification Loading */}
      {isVerifying && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
          <Card className="w-80">
            <CardContent className="py-8 text-center">
              <RefreshCw className="mx-auto mb-4 w-12 h-12 text-emerald-600 animate-spin" />
              <h3 className="font-semibold text-lg">Verifying Payment</h3>
              <p className="text-gray-500 text-sm">Please wait...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-emerald-100 text-sm">Total Savings</p>
                  <p className="mt-1 font-bold text-3xl">
                    ₦{stats.totalSavings.toLocaleString()}
                  </p>
                  <p className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    +12.5% this month
                  </p>
                </div>
                <div className="flex justify-center items-center bg-white/20 rounded-full w-14 h-14">
                  <PiggyBank className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Monthly Deposits</p>
                  <p className="mt-1 font-bold text-gray-900 text-3xl">
                    ₦{stats.monthlyDeposits.toLocaleString()}
                  </p>
                  <p className="flex items-center gap-1 mt-2 text-emerald-600 text-xs">
                    <ArrowDownLeft className="w-3 h-3" />
                    {stats.monthlyDepositCount} deposits this month
                  </p>
                </div>
                <div className="flex justify-center items-center bg-emerald-100 rounded-full w-14 h-14">
                  <Wallet className="w-7 h-7 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Loan Balance</p>
                  <p className="mt-1 font-bold text-gray-900 text-3xl">
                    ₦{stats.loanBalance.toLocaleString()}
                  </p>
                  <p className="flex items-center gap-1 mt-2 text-blue-600 text-xs">
                    <Clock className="w-3 h-3" />
                    Next payment: Dec 28
                  </p>
                </div>
                <div className="flex justify-center items-center bg-blue-100 rounded-full w-14 h-14">
                  <CreditCard className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Group Contributions</p>
                  <p className="mt-1 font-bold text-gray-900 text-3xl">
                    ₦{stats.groupContributions.toLocaleString()}
                  </p>
                  <p className="flex items-center gap-1 mt-2 text-purple-600 text-xs">
                    <Users className="w-3 h-3" />
                    {stats.activeGroups} active groups
                  </p>
                </div>
                <div className="flex justify-center items-center bg-purple-100 rounded-full w-14 h-14">
                  <Users className="w-7 h-7 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <button
                onClick={() => handleQuickAction("loan_repayment", 15000)}
                className="group flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md p-4 border border-blue-200 rounded-lg transition-all"
              >
                <div className="flex justify-center items-center bg-blue-500 rounded-full w-12 h-12 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Pay Loan</p>
                  <p className="text-gray-500 text-sm">
                    Repay loan installment
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction("group_contribution", 10000)}
                className="group flex items-center gap-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:shadow-md p-4 border border-purple-200 rounded-lg transition-all"
              >
                <div className="flex justify-center items-center bg-purple-500 rounded-full w-12 h-12 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">
                    Group Contribution
                  </p>
                  <p className="text-gray-500 text-sm">
                    Contribute to your group
                  </p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white border">
            <TabsTrigger value="overview" className="gap-2">
              <Receipt className="w-4 h-4" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger value="recurring" className="gap-2">
              <Repeat className="w-4 h-4" />
              Recurring Payments
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2">
              <Bell className="w-4 h-4" />
              Payment Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TransactionHistory onViewReceipt={handleViewReceipt} />
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringPaymentsList />
          </TabsContent>

          <TabsContent value="reminders">
            <PaymentReminders
              onPayNow={handlePayReminder}
              onPayBulk={handlePayBulk}
            />
          </TabsContent>
        </Tabs>

        {/* Payment Methods Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Accepted Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Debit/Credit Card</p>
                  <p className="text-gray-500 text-xs">
                    Visa, Mastercard, Verve
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Bank Transfer</p>
                  <p className="text-gray-500 text-xs">Direct bank payment</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">USSD</p>
                  <p className="text-gray-500 text-xs">*737#, *919#, etc.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-center items-center bg-orange-100 rounded-lg w-10 h-10">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">QR Code</p>
                  <p className="text-gray-500 text-xs">Scan to pay</p>
                </div>
              </div>
            </div>

            <div className="gap-4 grid md:grid-cols-2 mt-6">
              <div className="flex items-start gap-3 bg-emerald-50 p-4 rounded-lg">
                <CheckCircle className="mt-0.5 w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800">
                    Secure Payments Powered by Paystack
                  </p>
                  <p className="mt-1 text-emerald-600 text-sm">
                    All transactions are encrypted and processed securely. Your
                    financial information is never stored on our servers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                <Mail className="mt-0.5 w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">
                    Automatic Email Receipts
                  </p>
                  <p className="mt-1 text-blue-600 text-sm">
                    Receive beautifully formatted payment receipts via email
                    after every successful transaction.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Payments Info */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex md:flex-row flex-col items-center gap-6">
              <div className="flex flex-shrink-0 justify-center items-center bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl w-20 h-20">
                <Repeat className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="flex-1 md:text-left text-center">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Set Up Recurring Payments
                </h3>
                <p className="mt-1 text-gray-600">
                  Automate your contributions and loan repayments with scheduled
                  payments. Choose weekly, bi-weekly, or monthly frequency and
                  never miss a payment.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab("recurring")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Repeat className="w-4 h-4" />
                Set Up Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPreselectedType(undefined);
          setPreselectedAmount(undefined);
          setPreselectedGroup(undefined);
          setPreselectedLoan(undefined);
          setBulkItems(undefined);
        }}
        preselectedType={preselectedType}
        preselectedAmount={preselectedAmount}
        preselectedGroup={preselectedGroup}
        preselectedLoan={preselectedLoan}
        bulkItems={bulkItems}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
}
