import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Filter,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadGroupContributionReportPdf } from "@/lib/groups";

interface Member {
  id: string;
  name: string;
  avatar: string;
}

interface Contribution {
  memberId: string;
  month: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  paidDate?: string;
}

interface ContributionTrackerProps {
  members: Member[];
  contributions: Contribution[];
  monthlyAmount: number;
  groupName: string;
  groupId?: string;
}

const ContributionTracker: React.FC<ContributionTrackerProps> = ({
  members,
  contributions,
  monthlyAmount,
  groupName,
  groupId,
}) => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "pending" | "overdue"
  >("all");
  const [isExporting, setIsExporting] = useState(false);

  const monthOptions = useMemo(() => {
    const unique = new Set<string>();
    contributions.forEach((c) => {
      if (c.month) unique.add(c.month);
    });

    if (unique.size === 0) {
      const now = new Date();
      for (let i = 0; i < 6; i += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        unique.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        );
      }
    }

    return Array.from(unique)
      .map((value) => {
        const [yearStr, monthStr] = value.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        return { value, label };
      })
      .sort((a, b) => (a.value < b.value ? 1 : -1));
  }, [contributions]);

  useEffect(() => {
    if (!monthOptions.find((m) => m.value === selectedMonth)) {
      setSelectedMonth(monthOptions[0]?.value ?? selectedMonth);
    }
  }, [monthOptions, selectedMonth]);

  const contributionMap = useMemo(() => {
    const map = new Map<string, Contribution>();
    contributions.forEach((c) => {
      map.set(`${c.memberId}-${c.month}`, c);
    });
    return map;
  }, [contributions]);

  const formatCurrency = (value: number) => {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `₦${amount.toLocaleString()}`;
  };

  const getContributionForMember = (memberId: string, month: string) => {
    return contributionMap.get(`${memberId}-${month}`);
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;

    const contribution = getContributionForMember(member.id, selectedMonth);
    return (
      contribution?.status === statusFilter ||
      (!contribution && statusFilter === "pending")
    );
  });

  const stats = useMemo(() => {
    const expected = members.length * Number(monthlyAmount || 0);
    let collected = 0;
    let paidCount = 0;
    let overdueCount = 0;

    for (const member of members) {
      const contribution = getContributionForMember(member.id, selectedMonth);
      const status = contribution?.status ?? "pending";
      if (status === "paid") {
        paidCount += 1;
        collected += Number(contribution?.amount ?? 0);
      } else if (status === "overdue") {
        overdueCount += 1;
      }
    }

    const pendingCount = Math.max(0, members.length - paidCount - overdueCount);

    return {
      totalExpected: expected,
      totalCollected: collected,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }, [members, monthlyAmount, selectedMonth, contributionMap]);

  const collectionRate =
    stats.totalExpected > 0
      ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
      : 0;
  const cappedRate = Math.min(collectionRate, 100);

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full font-medium text-green-700 text-xs">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 px-2 py-1 rounded-full font-medium text-red-700 text-xs">
            <XCircle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full font-medium text-amber-700 text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const exportReport = async () => {
    if (!groupId) return;
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    setIsExporting(true);
    try {
      const blob = await downloadGroupContributionReportPdf(groupId, {
        year,
        month,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contribution-report-${selectedMonth}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unable to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Collected</p>
              <p className="font-bold text-gray-900 text-lg">
                {formatCurrency(stats.totalCollected)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Collection Rate</p>
              <p className="font-bold text-gray-900 text-lg">
                {collectionRate}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-green-100 rounded-lg w-10 h-10">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Paid</p>
              <p className="font-bold text-gray-900 text-lg">
                {stats.paidCount}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Pending</p>
              <p className="font-bold text-gray-900 text-lg">
                {stats.pendingCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-700 text-sm">
            Monthly Collection Progress
          </span>
          <span className="text-gray-500 text-sm">
            {formatCurrency(stats.totalCollected)} /{" "}
            {formatCurrency(stats.totalExpected)}
          </span>
        </div>
        <div className="bg-gray-200 rounded-full w-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full h-full transition-all duration-500"
            style={{ width: `${cappedRate}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-2 pr-4 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "paid" | "pending" | "overdue",
                )
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <button
            onClick={exportReport}
            disabled={isExporting || !groupId}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-gray-200 border-b">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Member
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Expected
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Paid
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Status
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => {
              const contribution = getContributionForMember(
                member.id,
                selectedMonth,
              );
              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="rounded-full w-8 h-8 object-cover"
                      />
                      <span className="font-medium text-gray-900">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {formatCurrency(monthlyAmount)}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">
                    {formatCurrency(contribution?.amount || 0)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(contribution?.status)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {contribution?.paidDate
                      ? new Date(contribution.paidDate).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContributionTracker;
