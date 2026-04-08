import { useMemo, useState } from "react";
import { FileText, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminContributionIncomeSummaryQuery } from "@/hooks/admin/useAdminContributionIncomeSummaryQuery";
import { downloadAdminContributionIncomeSummary } from "@/lib/admin";
import type { ContributionTypeCanonical } from "@/lib/contributionPolicy";
import { ContributionTypeOptions } from "@/lib/contributionPolicy";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export default function ContributionIncomeSummary() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedType, setSelectedType] = useState<
    ContributionTypeCanonical | "all"
  >("all");
  const [isExporting, setIsExporting] = useState<null | "csv" | "pdf">(null);
  const summaryQuery = useAdminContributionIncomeSummaryQuery({
    year: selectedYear,
    contributionType: selectedType === "all" ? undefined : selectedType,
  });

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_v, i) => currentYear - i);
  }, [currentYear]);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "All Types" },
      ...ContributionTypeOptions.map((option) => ({
        value: option.value,
        label: option.label.replace(" Contribution", ""),
      })),
    ],
    [],
  );

  const months = summaryQuery.data?.months ?? [];
  const totals = summaryQuery.data?.totals ?? {
    contributions: 0,
    interest: 0,
    total: 0,
  };

  const handleExport = async (format: "csv" | "pdf") => {
    setIsExporting(format);
    try {
      const { blob, filename } = await downloadAdminContributionIncomeSummary({
        year: selectedYear,
        contributionType:
          selectedType === "all" ? undefined : selectedType,
        format,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unable to export report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Summary Of Income
          </h2>
          <p className="text-sm text-gray-500">
            Annual income rollup based on contribution inflows and accrued
            interest.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Select
            value={selectedType}
            onValueChange={(value) =>
              setSelectedType(value as ContributionTypeCanonical | "all")
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={Boolean(isExporting)}
              >
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExport("pdf")}
                disabled={isExporting === "pdf"}
              >
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("csv")}
                disabled={isExporting === "csv"}
              >
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total Contributions
            </p>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(totals.contributions)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total Interest
            </p>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(totals.interest)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Cumulative Total
            </p>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(totals.total)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Monthly Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-5 py-3 text-left">Monthly Contributions</th>
                <th className="px-5 py-3 text-left">Interest</th>
                <th className="px-5 py-3 text-left">Total</th>
                <th className="px-5 py-3 text-left">Cum. Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {row.label}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatCurrency(row.contributions)}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.interest > 0 ? formatCurrency(row.interest) : "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    {formatCurrency(row.cumulativeTotal)}
                  </td>
                </tr>
              ))}
              {months.length === 0 && !summaryQuery.isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-sm text-slate-500"
                  >
                    No contribution data available for this year.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {summaryQuery.isError && (
          <div className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            {(summaryQuery.error as Error)?.message ||
              "Failed to load summary of income."}
          </div>
        )}
      </div>
    </div>
  );
}
