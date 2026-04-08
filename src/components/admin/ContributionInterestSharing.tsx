import { useMemo, useState } from "react";
import { PieChart, Users } from "lucide-react";
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
import { useAdminContributionInterestSharingQuery } from "@/hooks/admin/useAdminContributionInterestSharingQuery";
import { downloadAdminContributionInterestSharing } from "@/lib/admin";
import type { ContributionTypeCanonical } from "@/lib/contributionPolicy";
import { ContributionTypeOptions } from "@/lib/contributionPolicy";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function ContributionInterestSharing() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedType, setSelectedType] = useState<
    ContributionTypeCanonical | "all"
  >("all");
  const [isExporting, setIsExporting] = useState<null | "csv" | "pdf">(null);
  const sharingQuery = useAdminContributionInterestSharingQuery({
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

  const totalInterest = sharingQuery.data?.totalInterest ?? 0;
  const categories = sharingQuery.data?.categories ?? [];

  const handleExport = async (format: "csv" | "pdf") => {
    setIsExporting(format);
    try {
      const { blob, filename } = await downloadAdminContributionInterestSharing(
        {
          year: selectedYear,
          contributionType:
            selectedType === "all" ? undefined : selectedType,
          format,
        },
      );
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
            Sharing Formula Of Interest
          </h2>
          <p className="text-sm text-gray-500">
            Annual interest allocation across beneficiary categories.
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

      <div className="grid gap-4 md:grid-cols-[1.2fr_2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total Interest
            </p>
            <PieChart className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(totalInterest)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Basis for annual distribution
          </p>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
            Individuals receive 69% of total interest earned.
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Users className="h-4 w-4 text-emerald-600" />
            Category Allocation
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Percentage splits are configurable in policy and applied to total
            interest.
          </p>
          <div className="mt-4 space-y-2">
            {categories.map((category) => (
              <div key={category.key} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {category.label}
                  </span>
                  <span className="text-slate-500">
                    {category.percentage}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, category.percentage)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Amount</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Amount Shared</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(category.amountShared)}
                  </span>
                </div>
              </div>
            ))}
            {categories.length === 0 && !sharingQuery.isLoading && (
              <div className="rounded-lg border border-slate-100 p-4 text-center text-sm text-slate-500">
                No interest allocation available for this year.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Allocation Table
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Percentage</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Amount Shared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((category) => (
                <tr key={category.key} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {category.label}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {category.percentage}%
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatCurrency(category.amount)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {formatCurrency(category.amountShared)}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && !sharingQuery.isLoading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-sm text-slate-500"
                  >
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sharingQuery.isError && (
          <div className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            {(sharingQuery.error as Error)?.message ||
              "Failed to load interest sharing summary."}
          </div>
        )}
      </div>
    </div>
  );
}
