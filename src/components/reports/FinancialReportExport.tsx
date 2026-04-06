import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateMyFinancialReport } from "@/lib/reports";
import {
  FileText,
  Download,
  Calendar,
  CreditCard,
  TrendingUp,
  Award,
  Loader2,
  Check,
  X,
} from "lucide-react";

interface FinancialReportExportProps {
  memberId: string;
  memberName: string;
  onClose?: () => void;
}

type ReportType =
  | "contribution_statement"
  | "loan_history"
  | "credit_score_report"
  | "annual_summary";

interface ReportOption {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const reportOptions: ReportOption[] = [
  {
    id: "contribution_statement",
    name: "Contribution Statement",
    description: "Monthly breakdown of all your contributions",
    icon: CreditCard,
    color: "emerald",
  },
  {
    id: "loan_history",
    name: "Loan Repayment History",
    description: "Complete history of loans and repayments",
    icon: TrendingUp,
    color: "blue",
  },
  {
    id: "credit_score_report",
    name: "Credit Score Report",
    description: "Detailed credit score with factor breakdown",
    icon: Award,
    color: "purple",
  },
  {
    id: "annual_summary",
    name: "Annual Financial Summary",
    description: "Comprehensive yearly financial overview",
    icon: Calendar,
    color: "amber",
  },
];

const FinancialReportExport: React.FC<FinancialReportExportProps> = ({
  memberId,
  memberName,
  onClose,
}) => {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "year" | "5years" | "10years" | "custom"
  >("year");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<Set<ReportType>>(
    new Set(),
  );

  const yearOptions = useMemo(() => {
    const startYear = 2024;
    const years = [];
    for (let y = currentYear; y >= startYear; y -= 1) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const handleGenerateReport = async (type: ReportType) => {
    if (selectedPeriod === "custom") {
      if (!customRange.start || !customRange.end) {
        toast({
          title: "Select a date range",
          description: "Please choose both a start and end date.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsGenerating(true);
    setSelectedReport(type);

    try {
      const response = await generateMyFinancialReport({
        type,
        period: {
          type: selectedPeriod,
          year: selectedYear,
          startDate: customRange.start || undefined,
          endDate: customRange.end || undefined,
        },
        memberName,
        memberId,
      });

      const binary = atob(response.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: response.mimeType || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.filename || `${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setGeneratedReports((prev) => new Set(prev).add(type));

      toast({
        title: "Report Generated",
        description: `Your ${reportOptions.find((r) => r.id === type)?.name} has been downloaded.`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setSelectedReport(null);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<
      string,
      { bg: string; text: string; hover: string; icon: string }
    > = {
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        hover: "hover:bg-emerald-100",
        icon: "text-emerald-600",
      },
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        hover: "hover:bg-blue-100",
        icon: "text-blue-600",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        hover: "hover:bg-purple-100",
        icon: "text-purple-600",
      },
      amber: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        hover: "hover:bg-amber-100",
        icon: "text-amber-600",
      },
    };
    return colors[color] || colors.emerald;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-xl">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-xl">
              Export Financial Reports
            </h2>
            <p className="text-gray-600">
              Download your financial documents as PDF
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Period Selection */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4">
        <label className="block font-medium text-gray-700 text-sm">
          Select Report Period
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">
              Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) =>
                setSelectedPeriod(
                  e.target.value as "year" | "5years" | "10years" | "custom",
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            >
              <option value="year">Selected Year</option>
              <option value="5years">Last 5 Years</option>
              <option value="10years">Last 10 Years</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {selectedPeriod === "custom" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600">
                Start Date
              </label>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) =>
                  setCustomRange((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-600">
                End Date
              </label>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) =>
                  setCustomRange((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Options */}
      <div className="gap-4 grid md:grid-cols-2">
        {reportOptions.map((report) => {
          const colors = getColorClasses(report.color);
          const isSelected = selectedReport === report.id;
          const isGenerated = generatedReports.has(report.id);

          return (
            <div
              key={report.id}
              className={`p-6 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                  <report.icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {report.name}
                    </h3>
                    {isGenerated && (
                      <span className="flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full font-medium text-green-700 text-xs">
                        <Check className="w-3 h-3" />
                        Downloaded
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-gray-600 text-sm">
                    {report.description}
                  </p>

                  <Button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={isGenerating}
                    className={`mt-4 gap-2 ${
                      isSelected ? "bg-emerald-600 hover:bg-emerald-700" : ""
                    }`}
                    variant={isSelected ? "default" : "outline"}
                  >
                    {isGenerating && isSelected ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Download All */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-xl text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Download All Reports</h3>
            <p className="mt-1 text-emerald-100 text-sm">
              Get all your financial reports in one click
            </p>
          </div>
          <Button
            onClick={async () => {
              for (const report of reportOptions) {
                await handleGenerateReport(report.id);
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }}
            disabled={isGenerating}
            className="gap-2 bg-white hover:bg-emerald-50 text-emerald-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 p-4 border border-blue-200 rounded-xl">
        <FileText className="mt-0.5 w-5 h-5 text-blue-600" />
        <div className="text-blue-800 text-sm">
          <p className="font-medium">About Your Reports</p>
          <p className="mt-1">
            Reports are generated based on your current data and selected
            period. For official statements, please contact your group
            coordinator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialReportExport;
