import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Send,
  Bell,
  Filter,
  ChevronRight,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  joinedDate: string;
  totalContributed: number;
  currentMonthStatus: "paid" | "pending" | "overdue";
  currentMonthAmount: number;
  outstandingBalance: number;
  lastPaymentDate?: string;
  contributionStreak: number;
}

interface FinancialSummary {
  totalSavings: number;
  monthlyTarget: number;
  monthlyCollected: number;
  collectionRate: number;
  outstandingLoans: number;
  loanRepaymentsDue: number;
  defaultersCount: number;
  totalDefaultAmount: number;
}

interface MonthlyTrend {
  month: string;
  collected: number;
  target: number;
  rate: number;
}

interface GroupFinancialDashboardProps {
  groupId: string;
  groupName: string;
  members: Member[];
  summary: FinancialSummary;
  monthlyTrends: MonthlyTrend[];
  monthlyContribution: number;
}

export default function GroupFinancialDashboard({
  groupId,
  groupName,
  members,
  summary,
  monthlyTrends,
  monthlyContribution,
}: GroupFinancialDashboardProps) {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState("2025-12");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "pending" | "overdue"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const filteredMembers = members.filter((member) => {
    const matchesStatus =
      statusFilter === "all" || member.currentMonthStatus === statusFilter;
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const paidMembers = members.filter((m) => m.currentMonthStatus === "paid");
  const pendingMembers = members.filter(
    (m) => m.currentMonthStatus === "pending",
  );
  const overdueMembers = members.filter(
    (m) => m.currentMonthStatus === "overdue",
  );

  const handleSendReminders = async (memberIds: string[]) => {
    setIsSendingReminders(true);
    try {
      const targetMembers =
        memberIds.length > 0
          ? members.filter((m) => memberIds.includes(m.id))
          : overdueMembers;

      for (const member of targetMembers) {
        await supabase.functions.invoke("send-sms", {
          body: {
            action: "payment_reminder",
            to: member.phone,
            name: member.name,
            payment_type: "monthly contribution",
            amount: monthlyContribution,
            due_date: "immediately",
          },
        });
      }

      toast({
        title: "Reminders Sent",
        description: `Payment reminders sent to ${targetMembers.length} member(s)`,
      });
      setSelectedMembers([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminders",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Report Generated",
        description:
          "Monthly financial report has been generated and is ready for download",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const selectAllDefaulters = () => {
    setSelectedMembers(overdueMembers.map((m) => m.id));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center mb-3">
            <Wallet className="w-6 h-6 text-emerald-200" />
            <span className="text-emerald-200 text-sm">Total Savings</span>
          </div>
          <p className="font-bold text-2xl">
            ₦{(summary.totalSavings / 1000000).toFixed(1)}M
          </p>
          <p className="flex items-center gap-1 mt-1 text-emerald-200 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            +12% from last month
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center mb-3">
            <TrendingUp className="w-6 h-6 text-blue-200" />
            <span className="text-blue-200 text-sm">Collection Rate</span>
          </div>
          <p className="font-bold text-2xl">{summary.collectionRate}%</p>
          <p className="mt-1 text-blue-200 text-sm">
            ₦{summary.monthlyCollected.toLocaleString()} / ₦
            {summary.monthlyTarget.toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center mb-3">
            <BarChart3 className="w-6 h-6 text-purple-200" />
            <span className="text-purple-200 text-sm">Outstanding Loans</span>
          </div>
          <p className="font-bold text-2xl">
            ₦{(summary.outstandingLoans / 1000000).toFixed(1)}M
          </p>
          <p className="mt-1 text-purple-200 text-sm">
            ₦{summary.loanRepaymentsDue.toLocaleString()} due this month
          </p>
        </div>

        <div
          className={`bg-gradient-to-br rounded-xl p-5 text-white ${
            summary.defaultersCount > 0
              ? "from-red-500 to-red-600"
              : "from-gray-500 to-gray-600"
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <AlertTriangle
              className={`h-6 w-6 ${
                summary.defaultersCount > 0 ? "text-red-200" : "text-gray-200"
              }`}
            />
            <span
              className={`text-sm ${
                summary.defaultersCount > 0 ? "text-red-200" : "text-gray-200"
              }`}
            >
              Defaulters
            </span>
          </div>
          <p className="font-bold text-2xl">{summary.defaultersCount}</p>
          <p
            className={`text-sm mt-1 ${
              summary.defaultersCount > 0 ? "text-red-200" : "text-gray-200"
            }`}
          >
            ₦{summary.totalDefaultAmount.toLocaleString()} outstanding
          </p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white p-6 border rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-gray-900">
            Monthly Collection Trend
          </h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
          >
            <option value="2025-12">December 2025</option>
            <option value="2025-11">November 2025</option>
            <option value="2025-10">October 2025</option>
          </select>
        </div>

        <div className="flex items-end gap-2 h-64">
          {monthlyTrends.map((trend, index) => (
            <div
              key={index}
              className="flex flex-col flex-1 items-center gap-2"
            >
              <div className="flex flex-col items-center gap-1 w-full">
                <div
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-t-lg w-full transition-all"
                  style={{
                    height: `${(trend.collected / trend.target) * 200}px`,
                  }}
                />
                <div
                  className="bg-gray-200 rounded-b-lg w-full"
                  style={{
                    height: `${((trend.target - trend.collected) / trend.target) * 200}px`,
                  }}
                />
              </div>
              <div className="text-center">
                <span className="block text-gray-500 text-xs">
                  {trend.month}
                </span>
                <span className="font-medium text-gray-700 text-xs">
                  {trend.rate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Contribution Status */}
      <div className="bg-white border rounded-xl">
        <div className="p-5 border-b">
          <div className="flex md:flex-row flex-col justify-between md:items-center gap-4">
            <h3 className="font-semibold text-gray-900">
              Member Contribution Status
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="gap-2"
              >
                {isGeneratingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Report
              </Button>
              <Button
                size="sm"
                onClick={() => handleSendReminders(selectedMembers)}
                disabled={
                  isSendingReminders ||
                  (selectedMembers.length === 0 && overdueMembers.length === 0)
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSendingReminders ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Reminders{" "}
                {selectedMembers.length > 0
                  ? `(${selectedMembers.length})`
                  : ""}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="flex md:flex-row flex-col gap-4">
            <div className="relative flex-1">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-2 pr-4 pl-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "paid", "pending", "overdue"] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                      statusFilter === status
                        ? status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : status === "pending"
                            ? "bg-blue-100 text-blue-700"
                            : status === "overdue"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-200 text-gray-700"
                        : "bg-white text-gray-600 border hover:bg-gray-50"
                    }`}
                  >
                    {status} (
                    {status === "all"
                      ? members.length
                      : status === "paid"
                        ? paidMembers.length
                        : status === "pending"
                          ? pendingMembers.length
                          : overdueMembers.length}
                    )
                  </button>
                ),
              )}
            </div>
          </div>
          {overdueMembers.length > 0 && (
            <button
              onClick={selectAllDefaulters}
              className="flex items-center gap-1 mt-3 text-red-600 hover:text-red-700 text-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              Select all defaulters ({overdueMembers.length})
            </button>
          )}
        </div>

        {/* Member List */}
        <div className="divide-y max-h-96 overflow-y-auto">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`p-4 flex items-center gap-4 hover:bg-gray-50 ${
                member.currentMonthStatus === "overdue" ? "bg-red-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMembers.includes(member.id)}
                onChange={() => toggleMemberSelection(member.id)}
                className="border-gray-300 rounded focus:ring-emerald-500 w-4 h-4 text-emerald-600"
              />

              <div className="flex flex-shrink-0 justify-center items-center bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full w-10 h-10 font-medium text-white">
                {member.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {member.name}
                </p>
                <p className="text-gray-500 text-sm truncate">{member.email}</p>
              </div>

              <div className="hidden md:block text-right">
                <p className="text-gray-600 text-sm">Total Contributed</p>
                <p className="font-medium text-gray-900">
                  ₦{member.totalContributed.toLocaleString()}
                </p>
              </div>

              <div className="hidden md:block text-right">
                <p className="text-gray-600 text-sm">Outstanding</p>
                <p
                  className={`font-medium ${
                    member.outstandingBalance > 0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  ₦{member.outstandingBalance.toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-600 text-sm">This Month</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    member.currentMonthStatus === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : member.currentMonthStatus === "pending"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {member.currentMonthStatus === "paid" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : member.currentMonthStatus === "pending" ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {member.currentMonthStatus.charAt(0).toUpperCase() +
                    member.currentMonthStatus.slice(1)}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-4 w-12 h-12 text-gray-300" />
            <p className="text-gray-500">
              No members found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Due Dates */}
      <div className="gap-6 grid md:grid-cols-2">
        <div className="bg-white p-6 border rounded-xl">
          <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Upcoming Payment Due Dates
          </h3>
          <div className="space-y-3">
            {[
              {
                date: "Jan 5, 2026",
                type: "Monthly Contribution",
                amount: monthlyContribution * members.length,
              },
              {
                date: "Jan 10, 2026",
                type: "Loan Repayments",
                amount: summary.loanRepaymentsDue,
              },
              { date: "Jan 15, 2026", type: "Emergency Fund", amount: 50000 },
            ].map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.type}</p>
                  <p className="text-gray-500 text-sm">{item.date}</p>
                </div>
                <p className="font-semibold text-gray-900">
                  ₦{item.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 border rounded-xl">
          <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
            <FileText className="w-5 h-5 text-emerald-600" />
            Quick Reports
          </h3>
          <div className="space-y-3">
            <Button variant="outline" className="justify-start gap-3 w-full">
              <Download className="w-4 h-4" />
              Monthly Financial Statement
            </Button>
            <Button variant="outline" className="justify-start gap-3 w-full">
              <Download className="w-4 h-4" />
              Member Contribution Report
            </Button>
            <Button variant="outline" className="justify-start gap-3 w-full">
              <Download className="w-4 h-4" />
              Loan Status Report
            </Button>
            <Button variant="outline" className="justify-start gap-3 w-full">
              <Download className="w-4 h-4" />
              Defaulters List
            </Button>
          </div>
        </div>
      </div>

      {/* Defaulters Alert */}
      {overdueMembers.length > 0 && (
        <div className="bg-red-50 p-6 border border-red-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="flex justify-center items-center bg-red-100 rounded-full w-12 h-12">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Defaulters Alert</h3>
                <p className="mt-1 text-red-700">
                  {overdueMembers.length} member(s) have overdue contributions
                  totaling ₦{summary.totalDefaultAmount.toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {overdueMembers.slice(0, 5).map((member) => (
                    <span
                      key={member.id}
                      className="bg-red-100 px-3 py-1 rounded-full text-red-700 text-sm"
                    >
                      {member.name}
                    </span>
                  ))}
                  {overdueMembers.length > 5 && (
                    <span className="bg-red-100 px-3 py-1 rounded-full text-red-700 text-sm">
                      +{overdueMembers.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={() =>
                handleSendReminders(overdueMembers.map((m) => m.id))
              }
              disabled={isSendingReminders}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSendingReminders ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Bell className="mr-2 w-4 h-4" />
              )}
              Send Reminders
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
