import { useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAdminFinancialReportsQuery } from "@/hooks/admin/useAdminFinancialReportsQuery";

type Period = "3months" | "6months" | "12months";

const PERIOD_LABELS: Record<Period, string> = {
  "3months": "3 Months",
  "6months": "6 Months",
  "12months": "12 Months",
};

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

function csvEscape(value: string | number) {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function sanitizeFilenameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCollectionStatus(rate: number) {
  if (rate >= 90) {
    return {
      label: "Excellent",
      badgeClassName:
        "bg-emerald-100 px-2 py-1 rounded-full font-medium text-emerald-700 text-xs",
      progressClassName: "bg-emerald-500",
    };
  }

  if (rate >= 70) {
    return {
      label: "Good",
      badgeClassName:
        "bg-amber-100 px-2 py-1 rounded-full font-medium text-amber-700 text-xs",
      progressClassName: "bg-amber-500",
    };
  }

  return {
    label: "Needs Attention",
    badgeClassName:
      "bg-red-100 px-2 py-1 rounded-full font-medium text-red-700 text-xs",
    progressClassName: "bg-red-500",
  };
}

export default function FinancialReports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("6months");
  const [isDownloadingChart, setIsDownloadingChart] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [currentPage, setCurrentPage] = useState(1);
  const chartCardRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 8;
  const reportEndMonth = selectedYear === currentYear ? currentMonth : 12;
  const reportsQuery = useAdminFinancialReportsQuery({
    period: selectedPeriod,
    year: selectedYear,
    month: reportEndMonth,
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

  const total = groupPerformance.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);
  const pagedGroups = groupPerformance.slice(
    (currentPage - 1) * pageSize,
    pageEnd,
  );
  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriod, selectedYear]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_v, i) => currentYear - i);
  }, [currentYear]);

  const selectedPeriodLabel = PERIOD_LABELS[selectedPeriod];
  const ytdLabel = useMemo(() => {
    const monthLabel = new Date(
      Date.UTC(2020, reportEndMonth - 1, 1),
    ).toLocaleDateString("en-US", { month: "short" });
    if (selectedYear === currentYear) {
      return `YTD ${selectedYear} (Jan-${monthLabel})`;
    }
    return `YTD ${selectedYear}`;
  }, [selectedYear, currentYear, reportEndMonth]);

  const reportMonthSlug = useMemo(() => {
    return new Date(Date.UTC(2020, reportEndMonth - 1, 1))
      .toLocaleDateString("en-US", { month: "short" })
      .toLowerCase();
  }, [reportEndMonth]);

  const isRefreshingReports = reportsQuery.isFetching && !reportsQuery.isLoading;
  const hasChartData = monthlyData.length > 0;
  const hasTableData = groupPerformance.length > 0;

  const handleDownloadChart = async () => {
    if (reportsQuery.isLoading || isRefreshingReports) {
      toast({
        title: "Report still loading",
        description:
          "Please wait for the financial overview to finish loading before downloading.",
        variant: "destructive",
      });
      return;
    }

    if (!hasChartData) {
      toast({
        title: "Nothing to download",
        description: "No chart data is available for the selected report view.",
        variant: "destructive",
      });
      return;
    }

    if (!chartCardRef.current) {
      toast({
        title: "Chart unavailable",
        description:
          "The financial overview could not be prepared for download. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloadingChart(true);

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(chartCardRef.current, {
        backgroundColor: "#ffffff",
        scale: Math.min(window.devicePixelRatio || 1, 2),
        logging: false,
        useCORS: true,
        ignoreElements: (element) =>
          element instanceof HTMLElement &&
          element.dataset.exportIgnore === "true",
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) {
            resolve(value);
            return;
          }
          reject(new Error("Unable to generate the chart image."));
        }, "image/png");
      });

      triggerDownload(
        blob,
        `financial-overview-${selectedYear}-${sanitizeFilenameSegment(
          selectedPeriodLabel,
        )}-to-${reportMonthSlug}.png`,
      );

      toast({
        title: "Download ready",
        description: "Financial overview chart downloaded as PNG.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to download the financial overview chart.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingChart(false);
    }
  };

  const handleExportReport = async () => {
    if (reportsQuery.isLoading || isRefreshingReports) {
      toast({
        title: "Report still loading",
        description:
          "Please wait for the group performance report to finish loading before exporting.",
        variant: "destructive",
      });
      return;
    }

    if (!hasTableData) {
      toast({
        title: "Nothing to export",
        description:
          "No group performance rows are available for the selected report view.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExportingReport(true);

      const headers = [
        "Group Name",
        "Members",
        "Collected",
        "Expected",
        "Active Loans",
        "Collection Rate",
        "Status",
      ];

      const rows = groupPerformance.map((group) => {
        const collectionRate = Number.isFinite(group.collectionRate)
          ? group.collectionRate
          : 0;
        return [
          group.groupName,
          group.memberCount ?? 0,
          formatCurrency(group.collectedTotal ?? group.totalContributions ?? 0),
          formatCurrency(group.expectedTotal ?? 0),
          group.activeLoans ?? 0,
          `${collectionRate}%`,
          getCollectionStatus(collectionRate).label,
        ];
      });

      const csvBody = [headers, ...rows]
        .map((row) => row.map((value) => csvEscape(value)).join(","))
        .join("\n");
      const csv = `\uFEFF${csvBody}`;

      triggerDownload(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        `group-performance-${selectedYear}-to-${reportMonthSlug}.csv`,
      );

      toast({
        title: "Export complete",
        description: "Group performance report exported as CSV.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to export the group performance report.",
        variant: "destructive",
      });
    } finally {
      setIsExportingReport(false);
    }
  };

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
        <div
          ref={chartCardRef}
          className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Financial Overview
              </h3>
              <p className="text-gray-500 text-xs">
                {selectedPeriodLabel} view - {ytdLabel}
              </p>
            </div>
            <div className="flex gap-2" data-export-ignore="true">
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownloadChart}
                disabled={
                  isDownloadingChart ||
                  reportsQuery.isLoading ||
                  isRefreshingReports ||
                  !hasChartData
                }
              >
                <Download className="w-4 h-4" />
                {isDownloadingChart
                  ? "Downloading..."
                  : isRefreshingReports
                    ? "Refreshing..."
                    : "Download PNG"}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Group Performance
            </h3>
            <span className="text-gray-500 text-xs">{ytdLabel}</span>
          </div>

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
                    All groups are on track year-to-date.
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
                        {formatCompactCurrency(group.collectionGap ?? 0, 0)}{" "}
                        shortfall
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
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              All Groups Performance
            </h3>
            <p className="text-gray-500 text-xs">{ytdLabel}</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportReport}
            disabled={
              isExportingReport ||
              reportsQuery.isLoading ||
              isRefreshingReports ||
              !hasTableData
            }
          >
            <Download className="w-4 h-4" />
            {isExportingReport
              ? "Exporting..."
              : isRefreshingReports
                ? "Refreshing..."
                : "Export Report"}
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
                  Collected (YTD)
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Expected (YTD)
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
              {reportsQuery.isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500 text-sm"
                  >
                    Loading group performance report...
                  </td>
                </tr>
              )}
              {!reportsQuery.isLoading && pagedGroups.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500 text-sm"
                  >
                    No group performance data is available for the selected
                    filters.
                  </td>
                </tr>
              )}
              {pagedGroups.map((group, index) => {
                const collectionRate = group.collectionRate ?? 0;
                const status = getCollectionStatus(collectionRate);

                return (
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
                            className={`h-full rounded-full ${status.progressClassName}`}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, collectionRate),
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="font-medium text-sm">
                          {collectionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={status.badgeClassName}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 0 && totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-gray-100 border-t">
            <p className="text-gray-500 text-sm">
              Showing {pageStart}-{pageEnd} of {total} groups
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
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
