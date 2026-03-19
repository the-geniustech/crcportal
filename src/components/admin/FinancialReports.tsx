import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminFinancialReportsQuery } from "@/hooks/admin/useAdminFinancialReportsQuery";

type Period = "3months" | "6months" | "12months";

function formatPct(value: number) {
  const v = Number.isFinite(value) ? value : 0;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

export default function FinancialReports() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("6months");
  const reportsQuery = useAdminFinancialReportsQuery({ period: selectedPeriod });

  const monthlyData = useMemo(
    () => reportsQuery.data?.monthlyData ?? [],
    [reportsQuery.data?.monthlyData],
  );
  const groupPerformance = useMemo(
    () => reportsQuery.data?.groupPerformance ?? [],
    [reportsQuery.data?.groupPerformance],
  );
  const summary = reportsQuery.data?.summary;

  const totals = useMemo(() => {
    return monthlyData.reduce(
      (acc, d) => {
        acc.contributions += d.contributions ?? 0;
        acc.loans += d.loans ?? 0;
        acc.repayments += d.repayments ?? 0;
        acc.interest += d.interest ?? 0;
        return acc;
      },
      { contributions: 0, loans: 0, repayments: 0, interest: 0 },
    );
  }, [monthlyData]);

  const maxValue = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    return Math.max(
      ...monthlyData.map((d) =>
        Math.max(d.contributions ?? 0, d.loans ?? 0, d.repayments ?? 0),
      ),
    );
  }, [monthlyData]);

  const topPerformers = useMemo(() => {
    return [...groupPerformance]
      .sort((a, b) => b.collectionRate - a.collectionRate)
      .slice(0, 5);
  }, [groupPerformance]);

  const needsAttention = useMemo(() => {
    return [...groupPerformance]
      .sort((a, b) => a.collectionRate - b.collectionRate)
      .slice(0, 5);
  }, [groupPerformance]);

  return (
    <div className="space-y-6">
      {reportsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(reportsQuery.error as Error)?.message ||
            "Failed to load financial reports."}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Total Contributions</p>
              <p className="text-2xl font-bold mt-1">
                ₦{(totals.contributions / 1_000_000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-emerald-100">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${formatPct(summary.contributionsChangePct)} from last period`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Loans Disbursed</p>
              <p className="text-2xl font-bold mt-1">
                ₦{(totals.loans / 1_000_000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-blue-100">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${formatPct(summary.loansChangePct)} from last period`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Repayments</p>
              <p className="text-2xl font-bold mt-1">
                ₦{(totals.repayments / 1_000_000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-purple-100">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${summary.repaymentRatePct.toFixed(1)}% repayment rate`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">Interest Earned</p>
              <p className="text-2xl font-bold mt-1">
                ₦{(totals.interest / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-amber-100">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${summary.interestRatePct.toFixed(1)}% average rate`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Financial Overview
            </h3>
            <div className="flex gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="12months">12 Months</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" disabled>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-64 flex items-end gap-2">
            {reportsQuery.isLoading && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                Loading…
              </div>
            )}
            {!reportsQuery.isLoading && monthlyData.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                No data for this period.
              </div>
            )}
            {!reportsQuery.isLoading &&
              monthlyData.length > 0 &&
              monthlyData.map((data, index) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="w-full flex gap-1 items-end h-48">
                    <div
                      className="flex-1 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                      style={{
                        height: `${maxValue > 0 ? (data.contributions / maxValue) * 100 : 0}%`,
                      }}
                      title={`Contributions: ₦${data.contributions.toLocaleString()}`}
                    />
                    <div
                      className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{
                        height: `${maxValue > 0 ? (data.loans / maxValue) * 100 : 0}%`,
                      }}
                      title={`Loans: ₦${data.loans.toLocaleString()}`}
                    />
                    <div
                      className="flex-1 bg-purple-500 rounded-t transition-all hover:bg-purple-600"
                      style={{
                        height: `${maxValue > 0 ? (data.repayments / maxValue) * 100 : 0}%`,
                      }}
                      title={`Repayments: ₦${data.repayments.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{data.month}</span>
                </div>
              ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-sm text-gray-600">Contributions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-sm text-gray-600">Loans</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-sm text-gray-600">Repayments</span>
            </div>
          </div>
        </div>

        {/* Group Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Group Performance
          </h3>

          <div className="space-y-6">
            {!reportsQuery.isLoading && groupPerformance.length === 0 && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                No groups found in scope.
              </div>
            )}

            {/* Top Performers */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {topPerformers.map((group, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {group.groupName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {group.memberCount} members
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        {group.collectionRate}%
                      </p>
                      <p className="text-xs text-gray-500">
                        ₦{(group.totalContributions / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs Attention */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Needs Attention
              </h4>
              <div className="space-y-2">
                {needsAttention.map((group, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {group.groupName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {group.memberCount} members
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        {group.collectionRate}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {group.activeLoans} active loans
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            All Groups Performance
          </h3>
          <Button variant="outline" className="gap-2" disabled>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Group Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Members
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Total Contributions
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Active Loans
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Collection Rate
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupPerformance.map((group, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {group.groupName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {group.memberCount}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    ₦{group.totalContributions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{group.activeLoans}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            group.collectionRate >= 90
                              ? "bg-emerald-500"
                              : group.collectionRate >= 70
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${group.collectionRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {group.collectionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {group.collectionRate >= 90 ? (
                      <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                        Excellent
                      </span>
                    ) : group.collectionRate >= 70 ? (
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        Good
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        Needs Attention
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
