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

function formatCurrency(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(safe);
}

function formatCompactCurrency(value: number, maximumFractionDigits = 1) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits,
  }).format(safe);
}

export default function FinancialReports() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("6months");
  const reportsQuery = useAdminFinancialReportsQuery({
    period: selectedPeriod,
  });

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
      .filter((group) => (group.expectedTotal ?? 0) > 0)
      .sort((a, b) => {
        const rateDiff = (b.collectionRate ?? 0) - (a.collectionRate ?? 0);
        if (rateDiff !== 0) return rateDiff;
        return (b.collectedTotal ?? 0) - (a.collectedTotal ?? 0);
      })
      .slice(0, 5);
  }, [groupPerformance]);

  const needsAttention = useMemo(() => {
    return [...groupPerformance]
      .filter(
        (group) =>
          (group.expectedTotal ?? 0) > 0 && (group.collectionGap ?? 0) > 0,
      )
      .sort((a, b) => {
        const gapDiff = (b.collectionGap ?? 0) - (a.collectionGap ?? 0);
        if (gapDiff !== 0) return gapDiff;
        return (a.collectionRate ?? 0) - (b.collectionRate ?? 0);
      })
      .slice(0, 5);
  }, [groupPerformance]);

  return (
    <div className="space-y-6">
      {reportsQuery.isError && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
          {(reportsQuery.error as Error)?.message ||
            "Failed to load financial reports."}
        </div>
      )}

      {/* Summary Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-emerald-100 text-sm">Total Contributions</p>
              <p className="mt-1 font-bold text-2xl">
                {formatCompactCurrency(totals.contributions)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-emerald-100 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${formatPct(summary.contributionsChangePct)} from last period`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm">Total Loans Disbursed</p>
              <p className="mt-1 font-bold text-2xl">
                {formatCompactCurrency(totals.loans)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-blue-100 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${formatPct(summary.loansChangePct)} from last period`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-purple-100 text-sm">Total Repayments</p>
              <p className="mt-1 font-bold text-2xl">
                {formatCompactCurrency(totals.repayments)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-purple-100 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>
              {summary
                ? `${summary.repaymentRatePct.toFixed(1)}% repayment rate`
                : "—"}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-amber-100 text-sm">Interest Earned</p>
              <p className="mt-1 font-bold text-2xl">
                {formatCompactCurrency(totals.interest, 0)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-amber-100 text-sm">
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
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
        {/* Main Chart */}
        <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900 text-lg">
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
          <div className="flex items-end gap-2 h-64">
            {reportsQuery.isLoading && (
              <div className="flex justify-center items-center w-full h-full text-gray-500 text-sm">
                Loading...
              </div>
            )}
            {!reportsQuery.isLoading && monthlyData.length === 0 && (
              <div className="flex justify-center items-center w-full h-full text-gray-500 text-sm">
                No data for this period.
              </div>
            )}
            {!reportsQuery.isLoading &&
              monthlyData.length > 0 &&
              monthlyData.map((data, index) => (
                <div
                  key={index}
                  className="flex flex-col flex-1 items-center gap-1"
                >
                  <div className="flex items-end gap-1 w-full h-48">
                    <div
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all"
                      style={{
                        height: `${maxValue > 0 ? (data.contributions / maxValue) * 100 : 0}%`,
                      }}
                      title={`Contributions: ${formatCurrency(data.contributions)}`}
                    />
                    <div
                      className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                      style={{
                        height: `${maxValue > 0 ? (data.loans / maxValue) * 100 : 0}%`,
                      }}
                      title={`Loans: ${formatCurrency(data.loans)}`}
                    />
                    <div
                      className="flex-1 bg-purple-500 hover:bg-purple-600 rounded-t transition-all"
                      style={{
                        height: `${maxValue > 0 ? (data.repayments / maxValue) * 100 : 0}%`,
                      }}
                      title={`Repayments: ${formatCurrency(data.repayments)}`}
                    />
                  </div>
                  <span className="text-gray-500 text-xs">{data.month}</span>
                </div>
              ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 rounded w-3 h-3" />
              <span className="text-gray-600 text-sm">Contributions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 rounded w-3 h-3" />
              <span className="text-gray-600 text-sm">Loans</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-purple-500 rounded w-3 h-3" />
              <span className="text-gray-600 text-sm">Repayments</span>
            </div>
          </div>
        </div>

        {/* Group Performance */}
        <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
          <h3 className="mb-4 font-semibold text-gray-900 text-lg">
            Group Performance
          </h3>

          <div className="space-y-6">
            {!reportsQuery.isLoading && groupPerformance.length === 0 && (
              <div className="bg-gray-50 p-4 border border-gray-100 rounded-lg text-gray-600 text-sm">
                No groups found in scope.
              </div>
            )}

            {/* Top Performers */}
            <div>
              <h4 className="flex items-center gap-2 mb-3 font-medium text-gray-600 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {topPerformers.map((group, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex justify-center items-center bg-emerald-500 rounded-full w-6 h-6 font-medium text-white text-xs">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {group.groupName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {group.memberCount} members
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">
                        {group.collectionRate}%
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatCompactCurrency(
                          group.collectedTotal ?? group.totalContributions,
                          0,
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs Attention */}
            <div>
              <h4 className="flex items-center gap-2 mb-3 font-medium text-gray-600 text-sm">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Needs Attention
              </h4>
              <div className="space-y-2">
                {groupPerformance.length > 0 && needsAttention.length === 0 && (
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-700 text-xs">
                    All groups are on track for this period.
                  </div>
                )}
                {needsAttention.map((group, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-red-50 p-2 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {group.groupName}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {group.memberCount} members
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-sm">
                        {group.collectionRate}%
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatCompactCurrency(group.collectionGap ?? 0, 0)} shortfall
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
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-gray-100 border-b">
          <h3 className="font-semibold text-gray-900 text-lg">
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
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Group Name
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Members
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Collected (Period)
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Expected (Period)
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Active Loans
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Collection Rate
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
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
                    {formatCurrency(
                      group.collectedTotal ?? group.totalContributions,
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {formatCurrency(group.expectedTotal ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {group.activeLoans}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-200 rounded-full w-16 h-2 overflow-hidden">
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
                      <span className="font-medium text-sm">
                        {group.collectionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {group.collectionRate >= 90 ? (
                      <span className="bg-emerald-100 px-2 py-1 rounded-full font-medium text-emerald-700 text-xs">
                        Excellent
                      </span>
                    ) : group.collectionRate >= 70 ? (
                      <span className="bg-amber-100 px-2 py-1 rounded-full font-medium text-amber-700 text-xs">
                        Good
                      </span>
                    ) : (
                      <span className="bg-red-100 px-2 py-1 rounded-full font-medium text-red-700 text-xs">
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



