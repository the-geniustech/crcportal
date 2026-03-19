import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSavingsSummaryQuery } from "@/hooks/finance/useSavingsSummaryQuery";
import { useMyTransactionsQuery } from "@/hooks/finance/useMyTransactionsQuery";
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useMarkNotificationReadMutation } from "@/hooks/notifications/useMarkNotificationReadMutation";
import { useMarkAllNotificationsReadMutation } from "@/hooks/notifications/useMarkAllNotificationsReadMutation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SavingsOverview from "@/components/dashboard/SavingsOverview";
import SavingsChart from "@/components/dashboard/SavingsChart";
import QuickActions from "@/components/dashboard/QuickActions";
import LoanHistory, { Loan } from "@/components/dashboard/LoanHistory";
import GroupMemberships, {
  Group,
} from "@/components/dashboard/GroupMemberships";
import RecentTransactions, {
  Transaction,
} from "@/components/dashboard/RecentTransactions";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import { BackendGroupMembership } from "@/lib/groups";
import { BackendNotification } from "@/lib/notifications";
import { BackendLoanApplication } from "@/lib/loans";

interface RawTransaction {
  _id: string;
  date: string;
  amount: number;
  status: string;
  type: string;
  description: string;
}

interface RawLoanApplication {
  _id: string;
  totalRepayable: number;
  remainingBalance: number;
  status: string;
  approvedAmount: number;
  loanAmount: number;
  loanPurpose: string;
  loanCode: string;
  monthlyPayment: number;
  repaymentStartDate: string;
  disbursedAt: string;
  approvedAt: string;
  createdAt: string;
}

interface RawMembership {
  groupId:
    | string
    | {
        _id: string;
        groupName: string;
        location?: string;
        memberCount?: number;
        monthlyContribution: number;
        imageUrl: string;
      };
  role: string;
  status: string;
  totalContributed: number;
}

interface RawNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata?: { actionUrl?: string };
}

const notificationTypes = new Set([
  /*
  {
    type: "payment_reminder" as const,
    title: "Loan Payment Due Soon",
    message:
      "Your monthly loan payment of ₦45,000 is due in 3 days. Ensure sufficient balance.",
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "2",
    type: "deposit_confirmed" as const,
    title: "Deposit Successful",
    message: "₦50,000 has been successfully added to your savings account.",
    isRead: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    type: "group_activity" as const,
    title: "Upcoming Group Meeting",
    message:
      "Lagos Professionals Circle meeting scheduled for Saturday, Jan 11 at 2:00 PM.",
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    type: "loan_approved" as const,
    title: "Loan Application Update",
    message:
      "Congratulations! Your loan application for ₦500,000 has been approved.",
    isRead: true,
    createdAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: "5",
    type: "promotion" as const,
    title: "Special Offer",
    message:
      "Refer a friend and earn ₦5,000 bonus when they make their first deposit!",
    isRead: true,
    createdAt: new Date(Date.now() - 1209600000).toISOString(),
  },
  */
  "payment_reminder",
  "loan_approved",
  "deposit_confirmed",
  "group_activity",
  "system",
  "promotion",
]);

const normalizeNotificationType = (type?: string) => {
  const value = String(type || "").trim();
  return notificationTypes.has(value) ? value : "system";
};

const DashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const savingsSummaryQuery = useSavingsSummaryQuery();
  const myTransactionsQuery = useMyTransactionsQuery({ limit: 200 });
  const myLoanApplicationsQuery = useMyLoanApplicationsQuery();
  const myGroupsQuery = useMyGroupMembershipsQuery();
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const savingsBalance = Number(savingsSummaryQuery.data?.ledgerBalance ?? 0);
  const interestEarned = Number(savingsSummaryQuery.data?.interestEarned ?? 0);

  const savingsChartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-NG", { month: "short" }),
      };
    });

    const txs: RawTransaction[] = myTransactionsQuery.data?.transactions ?? [];
    const netByMonth = new Map<string, number>();

    for (const t of txs) {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const amount = Number(t.amount ?? 0);
      if (t.status !== "success") continue;

      if (t.type === "deposit" || t.type === "interest") {
        netByMonth.set(key, (netByMonth.get(key) ?? 0) + amount);
      } else if (t.type === "withdrawal") {
        netByMonth.set(key, (netByMonth.get(key) ?? 0) - amount);
      }
    }

    const netChanges = months.map(
      (m) => netByMonth.get(`${m.year}-${m.month}`) ?? 0,
    );
    const totalNet = netChanges.reduce((sum, n) => sum + n, 0);
    const startingBalance = Math.max(0, savingsBalance - totalNet);

    let running = startingBalance;
    return months.map((m, i) => {
      running += netChanges[i];
      return { month: m.label, amount: Math.round(running) };
    });
  }, [myTransactionsQuery.data?.transactions, savingsBalance]);

  const loans: Loan[] = useMemo(() => {
    const apps: BackendLoanApplication[] = myLoanApplicationsQuery.data ?? [];
    return apps.map((a) => {
      const total = Number(a.totalRepayable ?? 0);
      const remaining = Number(a.remainingBalance ?? 0);
      const progress =
        total > 0
          ? Math.round((1 - remaining / total) * 100)
          : remaining === 0
            ? 100
            : 0;

      const rawStatus = String(a.status);
      const status =
        rawStatus === "disbursed"
          ? "active"
          : rawStatus === "completed"
            ? "completed"
            : rawStatus === "defaulted"
              ? "defaulted"
              : rawStatus === "approved"
                ? "approved"
                : rawStatus === "rejected"
                  ? "rejected"
                  : "pending";

      const nextPaymentSource =
        a.repaymentStartDate ||
        a.disbursedAt ||
        a.approvedAt ||
        a.createdAt ||
        null;
      const nextPaymentDate = nextPaymentSource
        ? new Date(nextPaymentSource).toLocaleDateString("en-NG", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";

      return {
        id: a._id,
        amount: Number(a.approvedAmount ?? a.loanAmount ?? 0),
        status,
        purpose: a.loanPurpose || a.loanCode || "Loan",
        monthlyPayment: Number(a.monthlyPayment ?? 0),
        remainingBalance: remaining,
        nextPaymentDate,
        progress: Math.min(100, Math.max(0, progress)),
      };
    });
  }, [myLoanApplicationsQuery.data]);

  const groups = useMemo(() => {
    const memberships: BackendGroupMembership[] = myGroupsQuery.data ?? [];
    return memberships
      .map((m) => {
        const g = typeof m.groupId === "object" ? m.groupId : null;
        if (!g?._id) return null;

        const rawRole = String(m.role || "member");
        const role = ["member", "treasurer", "secretary", "chairman"].includes(
          rawRole,
        )
          ? rawRole
          : "member";

        const rawStatus = String(m.status || "active");
        const contributionStatus =
          rawStatus === "paused"
            ? "paused"
            : rawStatus === "defaulted"
              ? "defaulted"
              : "active";

        return {
          id: String(g._id),
          name: String(g.groupName ?? "Group"),
          location: String(g.location ?? ""),
          memberCount: Number(g.memberCount ?? 0),
          role,
          contributionStatus,
          totalContributed: Number(m.totalContributed ?? 0),
          monthlyContribution: Number(g.monthlyContribution ?? 0),
          nextMeeting: "",
          imageUrl: g.imageUrl ?? undefined,
        };
      })
      .filter(Boolean) as {
      id: string;
      name: string;
      location: string;
      memberCount: number;
      role: string;
      contributionStatus: string;
      totalContributed: number;
      monthlyContribution: number;
      nextMeeting: string;
      imageUrl?: string;
    }[];
  }, [myGroupsQuery.data]);

  const recentTransactions = useMemo(() => {
    const txs: RawTransaction[] = (myTransactionsQuery.data?.transactions ?? [])
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return txs.map((t) => {
      const mapType = (type: string) => {
        if (type === "deposit") return "deposit";
        if (type === "withdrawal") return "withdrawal";
        if (type === "interest") return "interest";
        if (type === "loan_repayment") return "loan_payment";
        if (type === "group_contribution") return "fee";
        return "fee";
      };

      const mapStatus = (status: string) => {
        if (status === "success") return "completed";
        if (status === "pending") return "pending";
        if (status === "failed") return "failed";
        return "pending";
      };

      return {
        id: t._id,
        type: mapType(t.type),
        amount: Number(t.amount ?? 0),
        description: t.description,
        status: mapStatus(t.status),
        createdAt: t.date,
        balanceAfter: savingsBalance,
      };
    });
  }, [myTransactionsQuery.data?.transactions, savingsBalance]);

  const notifications = useMemo(() => {
    const items: BackendNotification[] =
      notificationsQuery.data?.notifications ?? [];
    return items.map((n) => ({
      id: n._id,
      type: normalizeNotificationType(n.type),
      title: n.title || "Notification",
      message: n.message || "",
      isRead: n.status === "read",
      createdAt: n.createdAt || n.updatedAt || new Date().toISOString(),
      actionUrl:
        typeof n.metadata?.actionUrl === "string"
          ? n.metadata?.actionUrl
          : undefined,
    }));
  }, [notificationsQuery.data?.notifications]);

  const notificationError =
    notificationsQuery.error instanceof Error
      ? notificationsQuery.error.message
      : null;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  const handleDeposit = () => {
    navigate("/payments");
  };

  const handleWithdraw = () => {
    setShowWithdrawModal(true);
  };

  const handleApplyLoan = () => {
    navigate("/loan-application");
  };

  const handlePayLoan = (loanId?: string) => {
    navigate("/payments");
  };

  const handleTransfer = () => {
    toast({
      title: "Transfer",
      description: "Transfer feature coming soon!",
    });
  };

  const handleViewStatement = () => {
    toast({
      title: "Statement",
      description: "Statement download feature coming soon!",
    });
  };

  const handleViewGroup = (groupId: string) => {
    toast({
      title: "Group Details",
      description: `Viewing group ${groupId}`,
    });
  };

  const handleContribute = (groupId: string) => {
    navigate("/payments");
  };

  const handleViewAllTransactions = () => {
    navigate("/payments");
  };

  const handleMarkNotificationAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllNotificationsAsRead = () => {
    markAllMutation.mutate();
  };

  const handleViewAllNotifications = () => {
    toast({
      title: "Notifications",
      description: "Full notifications page coming soon!",
    });
  };

  const processDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Deposit Initiated",
      description: `Your deposit of ₦${amount.toLocaleString()} is being processed.`,
    });
    setShowDepositModal(false);
    setDepositAmount("");
  };

  const processWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }
    if (amount > 385000) {
      toast({
        title: "Insufficient Balance",
        description: "You do not have enough balance for this withdrawal.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Withdrawal Initiated",
      description: `Your withdrawal of ₦${amount.toLocaleString()} is being processed.`,
    });
    setShowWithdrawModal(false);
    setWithdrawAmount("");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-bold text-gray-900 text-2xl">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Member"}!
          </h1>
          <p className="mt-1 text-gray-600">
            Here's an overview of your financial activities
          </p>
        </div>

        {/* Main Grid */}
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Savings Overview */}
            <SavingsOverview
              balance={savingsBalance}
              totalSaved={savingsBalance}
              interestEarned={interestEarned}
              accountNumber="CRC1234567"
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
            />

            {/* Quick Actions */}
            <QuickActions
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onApplyLoan={handleApplyLoan}
              onPayLoan={() => handlePayLoan()}
              onTransfer={handleTransfer}
              onViewStatement={handleViewStatement}
            />

            {/* Savings Chart */}
            <SavingsChart data={savingsChartData} />

            {/* Loan History */}
            <LoanHistory
              loans={loans}
              onPayLoan={handlePayLoan}
              onViewDetails={(id) =>
                toast({
                  title: "Loan Details",
                  description: `Viewing loan ${id}`,
                })
              }
            />

            {/* Group Memberships */}
            <GroupMemberships
              groups={groups as unknown as Group[]}
              onViewGroup={handleViewGroup}
              onContribute={handleContribute}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <NotificationsPanel
              notifications={notifications}
              isLoading={notificationsQuery.isLoading}
              error={notificationError}
              onMarkAsRead={handleMarkNotificationAsRead}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onViewAll={handleViewAllNotifications}
            />

            {/* Recent Transactions */}
            <RecentTransactions
              transactions={recentTransactions as unknown as Transaction[]}
              onViewAll={handleViewAllTransactions}
            />

            {/* Quick Stats */}
            <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
              <h3 className="mb-4 font-semibold text-gray-900 text-lg">
                Account Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-medium text-gray-900">Jan 2024</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Membership Status</span>
                  <span className="bg-emerald-100 px-2 py-1 rounded-full font-medium text-emerald-700 text-sm">
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Credit Score</span>
                  <span className="font-medium text-emerald-600">
                    Excellent (850)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Groups</span>
                  <span className="font-medium text-gray-900">
                    {groups.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Loans</span>
                  <span className="font-medium text-gray-900">
                    {loans.filter((l) => l.status === "active").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white">
              <h3 className="mb-2 font-semibold">Need Help?</h3>
              <p className="mb-4 text-emerald-100 text-sm">
                Our support team is available 24/7 to assist you with any
                questions.
              </p>
              <button className="bg-white hover:bg-emerald-50 py-2 rounded-lg w-full font-medium text-emerald-600 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-900 text-xl">
                Make a Deposit
              </h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="px-4 py-3 border border-gray-300 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                />
              </div>

              <div className="flex gap-2">
                {[10000, 25000, 50000, 100000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setDepositAmount(amount.toString())}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-lg font-medium text-emerald-600 text-sm transition-colors"
                  >
                    ₦{amount / 1000}K
                  </button>
                ))}
              </div>

              <button
                onClick={processDeposit}
                className="bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl w-full font-semibold text-white transition-colors"
              >
                Proceed to Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-900 text-xl">
                Withdraw Funds
              </h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 mb-4 p-4 rounded-xl">
              <p className="text-gray-600 text-sm">Available Balance</p>
              <p className="font-bold text-gray-900 text-2xl">₦385,000</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="px-4 py-3 border border-gray-300 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                />
              </div>

              <div className="flex gap-2">
                {[10000, 25000, 50000, 100000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setWithdrawAmount(amount.toString())}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg font-medium text-blue-600 text-sm transition-colors"
                  >
                    ₦{amount / 1000}K
                  </button>
                ))}
              </div>

              <button
                onClick={processWithdraw}
                className="bg-blue-500 hover:bg-blue-600 py-3 rounded-xl w-full font-semibold text-white transition-colors"
              >
                Proceed to Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  return <DashboardContent />;
  // <AuthProvider>
  // </AuthProvider>
};

export default Dashboard;
