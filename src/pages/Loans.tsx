import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LoanRepaymentTracker from "@/components/loans/LoanRepaymentTracker";
import LoanCalculator from "@/components/loans/LoanCalculator";
import LoanFaqModal from "@/components/loans/LoanFaqModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import { useLoanScheduleQuery } from "@/hooks/loans/useLoanScheduleQuery";
import type {
  BackendLoanApplication,
  BackendLoanScheduleItem,
} from "@/lib/loans";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
import { goToContactSupport } from "@/lib/support";
import {
  ArrowLeft,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  FileText,
  TrendingUp,
  Calendar,
  Calculator,
  Award,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDeleteLoanDraftMutation } from "@/hooks/loans/useDeleteLoanDraftMutation";

type LoanScheduleVM = {
  id: string;
  loanAmount: number;
  interestRate: number;
  interestRateType?: "annual" | "monthly" | "total";
  loanType?: string;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  startDate: string;
  endDate: string;
  remainingBalance: number;
  status: "active" | "completed" | "defaulted";
  groupName: string;
  purpose: string;
};

type PaymentScheduleItemVM = {
  id: string;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: "paid" | "pending" | "overdue" | "upcoming";
  paidDate?: string;
  lateFee?: number;
};

const EDIT_REQUEST_BLOCKED_STATUSES = new Set([
  "draft",
  "disbursed",
  "completed",
  "defaulted",
  "cancelled",
]);

function toYmd(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapLoanVm(
  app: BackendLoanApplication,
  schedule: BackendLoanScheduleItem[] | null,
): LoanScheduleVM {
  const principal = Number(app.approvedAmount ?? app.loanAmount ?? 0);
  const totalPayment = Number(app.totalRepayable ?? principal);
  const remainingBalance = Number(app.remainingBalance ?? 0);
  const interestRate = Number(
    app.approvedInterestRate ?? app.interestRate ?? 0,
  );
  const interestRateType = (app.interestRateType ?? "annual") as
    | "annual"
    | "monthly"
    | "total";
  const termMonths = Number(app.repaymentPeriod ?? 0);
  const monthlyPayment = Number(app.monthlyPayment ?? 0);

  const start =
    app.disbursedAt ||
    app.repaymentStartDate ||
    app.approvedAt ||
    app.createdAt ||
    null;
  const startDate = toYmd(start);

  const scheduleEnd =
    schedule && schedule.length ? schedule[schedule.length - 1].dueDate : null;
  const endDate = scheduleEnd
    ? toYmd(scheduleEnd)
    : start
      ? toYmd(addMonths(new Date(start), Math.max(0, termMonths - 1)))
      : "";

  const totalInterest = Math.max(0, totalPayment - principal);
  const status =
    app.status === "completed"
      ? "completed"
      : app.status === "defaulted"
        ? "defaulted"
        : "active";

  return {
    id: app._id,
    loanAmount: principal,
    interestRate,
    interestRateType,
    loanType: app.loanType ?? undefined,
    termMonths,
    monthlyPayment,
    totalInterest,
    totalPayment,
    startDate,
    endDate,
    remainingBalance,
    status,
    groupName: app.groupName || "CRC Connect",
    purpose: app.loanPurpose || "Loan",
  };
}

function LoansContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const myAppsQuery = useMyLoanApplicationsQuery();
  const deleteDraftMutation = useDeleteLoanDraftMutation();

  // Check if coming from quick actions with calculator tab
  const locationState = location.state as { tab?: string } | null;
  const initialTab =
    locationState?.tab === "calculator" ? "calculator" : "active";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedLoan, setSelectedLoan] = useState<LoanScheduleVM | null>(null);
  const [showLoanFaq, setShowLoanFaq] = useState(false);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewItems, setDocPreviewItems] = useState<
    BackendLoanApplication["documents"]
  >([]);
  const [docPreviewIndex, setDocPreviewIndex] = useState(0);

  const applications = myAppsQuery.data ?? [];
  const activeLoanApps = applications.filter(
    (a) => a.status === "disbursed" || a.status === "defaulted",
  );
  const completedLoanApps = applications.filter(
    (a) => a.status === "completed",
  );
  const draftApps = applications.filter((a) => String(a.status) === "draft");
  const pendingApps = applications.filter((a) =>
    ["pending", "under_review", "approved", "rejected", "cancelled"].includes(
      String(a.status),
    ),
  );

  const scheduleQuery = useLoanScheduleQuery(selectedLoan?.id);
  const paymentSchedule: PaymentScheduleItemVM[] = (
    scheduleQuery.data ?? []
  ).map((it) => ({
    id: it._id,
    dueDate: toYmd(it.dueDate),
    principalAmount: it.principalAmount,
    interestAmount: it.interestAmount,
    totalAmount: it.totalAmount,
    status: it.status,
    paidDate: it.paidAt ? toYmd(it.paidAt) : undefined,
  }));

  const selectedLoanApp = selectedLoan
    ? activeLoanApps.find((a) => a._id === selectedLoan.id)
    : null;
  const selectedLoanVm = selectedLoanApp
    ? mapLoanVm(selectedLoanApp, scheduleQuery.data ?? null)
    : null;

  // Update tab if navigated with state
  useEffect(() => {
    if (locationState?.tab) {
      setActiveTab(locationState.tab);
    }
  }, [locationState]);

  useEffect(() => {
    if (!selectedLoan && activeLoanApps.length > 0) {
      setSelectedLoan(mapLoanVm(activeLoanApps[0], null));
    }
  }, [activeLoanApps, selectedLoan]);

  const handleMakePayment = (paymentId: string, amount: number) => {
    navigate("/payments", { state: { loanPayment: { paymentId, amount } } });
  };

  const handleEarlyRepayment = () => {
    toast({
      title: "Early Repayment",
      description: "Early repayment request has been submitted",
    });
  };

  const handleResumeDraft = (draftId: string) => {
    navigate(`/loan-application?draft=${draftId}`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    const confirmDelete = window.confirm(
      "Delete this draft? This action cannot be undone.",
    );
    if (!confirmDelete) return;
    try {
      await deleteDraftMutation.mutateAsync(draftId);
      toast({
        title: "Draft deleted",
        description: "Your saved draft has been removed.",
      });
    } catch (error) {
      toast({
        title: "Unable to delete draft",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const formatEditValue = (field: string, value: string | number | null) => {
    if (value === null || value === undefined || value === "") return "-";
    if (field === "loanAmount") {
      const amount = Number(value);
      return Number.isFinite(amount)
        ? `NGN ${amount.toLocaleString()}`
        : String(value);
    }
    if (field === "repaymentPeriod") {
      return `${value} months`;
    }
    return String(value);
  };

  const openDocPreview = (
    docs: BackendLoanApplication["documents"] = [],
    index = 0,
  ) => {
    const safeDocs = Array.isArray(docs) ? docs : [];
    const safeIndex = safeDocs.length
      ? Math.min(Math.max(0, index), safeDocs.length - 1)
      : 0;
    setDocPreviewItems(safeDocs);
    setDocPreviewIndex(safeIndex);
    setDocPreviewOpen(true);
  };

  const closeDocPreview = () => {
    setDocPreviewOpen(false);
    setDocPreviewItems([]);
    setDocPreviewIndex(0);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="flex md:flex-row flex-col justify-between md:items-center mb-8">
          <div>
            <h1 className="flex items-center gap-3 font-bold text-gray-900 text-3xl">
              <CreditCard className="w-8 h-8 text-emerald-600" />
              My Loans
            </h1>
            <p className="mt-2 text-gray-600">
              Track your loan repayments and manage your borrowing
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={() => navigate("/credit-score")}
              className="gap-2"
            >
              <Award className="w-4 h-4" />
              Credit Score
            </Button>
            <Button
              onClick={() => navigate("/loan-application")}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Apply for New Loan
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mb-8">
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-emerald-100 rounded-xl w-12 h-12">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {activeLoanApps.length}
                </p>
                <p className="text-gray-500 text-sm">Active Loans</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-xl w-12 h-12">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  ₦
                  {(
                    activeLoanApps.reduce(
                      (sum, l) => sum + Number(l.remainingBalance || 0),
                      0,
                    ) / 1000
                  ).toFixed(0)}
                  K
                </p>
                <p className="text-gray-500 text-sm">Total Outstanding</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-purple-100 rounded-xl w-12 h-12">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {paymentSchedule.find(
                    (p) =>
                      p.status === "pending" ||
                      p.status === "overdue" ||
                      p.status === "upcoming",
                  )?.dueDate || "No upcoming payment"}
                </p>
                <p className="text-gray-500 text-sm">Next Payment</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-amber-100 rounded-xl w-12 h-12">
                <CheckCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {completedLoanApps.length}
                </p>
                <p className="text-gray-500 text-sm">Completed Loans</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white mb-6 border">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="w-4 h-4" />
              Active Loans ({activeLoanApps.length})
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="w-4 h-4" />
              Loan Calculator
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedLoanApps.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <FileText className="w-4 h-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="drafts" className="gap-2">
              <Edit2 className="w-4 h-4" />
              Drafts ({draftApps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeLoanApps.length === 0 ? (
              <div className="bg-white p-12 border rounded-xl text-center">
                <CreditCard className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                  No Active Loans
                </h3>
                <p className="mb-6 text-gray-500">
                  You don't have any active loans at the moment
                </p>
                <Button
                  onClick={() => navigate("/loan-application")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Apply for a Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Loan Selector if multiple loans */}
                {activeLoanApps.length > 1 && (
                  <div className="flex gap-3 pb-2 overflow-x-auto">
                    {activeLoanApps.map((app) => {
                      const vm = mapLoanVm(app, null);
                      return (
                        <button
                          key={vm.id}
                          onClick={() => setSelectedLoan(vm)}
                          className={`px-4 py-3 rounded-xl border-2 transition-all whitespace-nowrap ${
                            (selectedLoanVm?.id || selectedLoan?.id) === vm.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className="font-medium text-gray-900">
                            {vm.purpose}
                          </p>
                          <p className="text-gray-500 text-sm">
                            ₦{vm.loanAmount.toLocaleString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Loan Repayment Tracker */}
                {(selectedLoanVm || selectedLoan) && (
                  <LoanRepaymentTracker
                    loan={(selectedLoanVm || selectedLoan)!}
                    paymentSchedule={paymentSchedule}
                    onMakePayment={handleMakePayment}
                    onEarlyRepayment={handleEarlyRepayment}
                    onOpenFaq={() => setShowLoanFaq(true)}
                  />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calculator">
            <LoanCalculator />
          </TabsContent>

          <TabsContent value="completed">
            {completedLoanApps.length === 0 ? (
              <div className="bg-white p-12 border rounded-xl text-center">
                <CheckCircle className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                  No Completed Loans
                </h3>
                <p className="text-gray-500">
                  Your completed loans will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedLoanApps.map((app) => {
                  const principal = Number(
                    app.approvedAmount ?? app.loanAmount ?? 0,
                  );
                  const totalRepayable = Number(
                    app.totalRepayable ?? principal,
                  );
                  const totalPaid = totalRepayable;
                  const rate = Number(
                    app.approvedInterestRate ?? app.interestRate ?? 0,
                  );
                  const facility = getLoanFacility(app.loanType ?? "");
                  const rateType = (app.interestRateType ??
                    facility?.interestRateType ??
                    "annual") as "annual" | "monthly" | "total";
                  const interestLabel = formatInterestLabel(
                    rate,
                    rateType,
                    facility?.interestRateRange,
                  );
                  const completedDate = toYmd(
                    app.updatedAt || app.disbursedAt || app.createdAt || "",
                  );

                  return (
                    <div
                      key={app._id}
                      className="bg-white p-6 border rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="flex justify-center items-center bg-emerald-100 rounded-full w-14 h-14">
                            <CheckCircle className="w-7 h-7 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {app.loanPurpose}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              {app.groupName || "CRC Connect"}
                            </p>
                          </div>
                        </div>
                        <span className="bg-emerald-100 px-3 py-1 rounded-full font-medium text-emerald-700 text-sm">
                          Completed
                        </span>
                      </div>

                      <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mt-6">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Loan Amount</p>
                          <p className="font-semibold text-gray-900">
                            ₦{principal.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Repaid So Far</p>
                          <p className="font-semibold text-emerald-600">
                            ₦{totalPaid.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Interest Rate</p>
                          <p className="font-semibold text-gray-900">
                            {interestLabel}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Completed</p>
                          <p className="font-semibold text-gray-900">
                            {completedDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="gap-2">
                          <FileText className="w-4 h-4" />
                          Download Statement
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications">
            {pendingApps.length === 0 ? (
              <div className="bg-white p-12 border rounded-xl text-center">
                <FileText className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                  No Pending Applications
                </h3>
                <p className="mb-6 text-gray-500">
                  You don't have any pending loan applications
                </p>
                <Button
                  onClick={() => navigate("/loan-application")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Apply for a Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => {
                  const facility = getLoanFacility(app.loanType ?? "");
                  const rate = Number(
                    app.approvedInterestRate ?? app.interestRate ?? 0,
                  );
                  const rateType = (app.interestRateType ??
                    facility?.interestRateType ??
                    "annual") as "annual" | "monthly" | "total";
                  const interestLabel = formatInterestLabel(
                    rate,
                    rateType,
                    facility?.interestRateRange,
                  );
                  const editRequest = app.latestEditRequest;
                  const canRequestEdit =
                    !EDIT_REQUEST_BLOCKED_STATUSES.has(String(app.status)) &&
                    editRequest?.status !== "pending";
                  const editStatusTone =
                    editRequest?.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : editRequest?.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700";

                  return (
                    <div
                      key={app._id}
                      className="bg-white p-6 border rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="flex justify-center items-center bg-blue-100 rounded-full w-14 h-14">
                            <FileText className="w-7 h-7 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {app.loanPurpose}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              {app.groupName || "CRC Connect"}
                            </p>
                          </div>
                        </div>
                        <span className="bg-gray-100 px-3 py-1 rounded-full font-medium text-gray-700 text-sm">
                          {String(app.status).replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mt-6">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">
                            Requested Amount
                          </p>
                          <p className="font-semibold text-gray-900">
                            ₦{Number(app.loanAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Term</p>
                          <p className="font-semibold text-gray-900">
                            {app.repaymentPeriod} months
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Interest Rate</p>
                          <p className="font-semibold text-gray-900">
                            {interestLabel}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Submitted</p>
                          <p className="font-semibold text-gray-900">
                            {toYmd(app.createdAt || "")}
                          </p>
                        </div>
                      </div>

                      {editRequest && (
                        <div className="bg-slate-50 mt-4 p-4 border border-slate-100 rounded-xl">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">
                              Edit Request
                            </p>
                            <Badge className={editStatusTone}>
                              {editRequest.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="mt-1 text-slate-500 text-xs">
                            Requested {toYmd(editRequest.requestedAt || "")}
                          </p>
                          <div className="space-y-2 mt-3 text-sm">
                            {(editRequest.changes ?? []).map(
                              (change, index) => (
                                <div
                                  key={`${change.field}-${index}`}
                                  className="flex flex-wrap justify-between gap-2 bg-white px-3 py-2 border border-white rounded-lg"
                                >
                                  <span className="font-medium text-slate-600">
                                    {change.label}
                                  </span>
                                  <span className="text-slate-500">
                                    <span className="text-slate-400 line-through">
                                      {formatEditValue(
                                        change.field,
                                        change.from ?? "-",
                                      )}
                                    </span>{" "}
                                    →{" "}
                                    <span className="font-semibold text-slate-900">
                                      {formatEditValue(
                                        change.field,
                                        change.to ?? "-",
                                      )}
                                    </span>
                                  </span>
                                </div>
                              ),
                            )}
                            {(editRequest.changes ?? []).length === 0 && (
                              <p className="text-slate-500 text-sm">
                                No change details were provided.
                              </p>
                            )}
                          </div>
                          {(editRequest.documents ?? []).length > 0 && (
                            <div className="flex flex-wrap justify-between items-center gap-2 bg-white mt-4 px-3 py-2 border border-slate-100 rounded-lg text-slate-500 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-600">
                                  {editRequest.documents?.length} document
                                  {editRequest.documents &&
                                  editRequest.documents.length > 1
                                    ? "s"
                                    : ""}
                                </span>
                                <span className="text-slate-400">
                                  ready to review
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-3 h-7 text-xs"
                                onClick={() =>
                                  openDocPreview(editRequest.documents, 0)
                                }
                              >
                                View Documents
                              </Button>
                            </div>
                          )}
                          {editRequest.reviewNotes && (
                            <p className="mt-3 text-slate-500 text-xs">
                              Admin note: {editRequest.reviewNotes}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        {canRequestEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-emerald-200 text-emerald-700"
                            onClick={() =>
                              navigate(`/loan-application?edit=${app._id}`)
                            }
                          >
                            <Edit2 className="w-4 h-4" />
                            Request Edit
                          </Button>
                        )}
                        {editRequest?.status === "pending" && (
                          <span className="text-amber-600 text-xs">
                            Edit request awaiting approval
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts">
            {draftApps.length === 0 ? (
              <div className="bg-white p-12 border rounded-xl text-center">
                <Edit2 className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                  No Saved Drafts
                </h3>
                <p className="mb-6 text-gray-500">
                  Saved loan applications will appear here
                </p>
                <Button
                  onClick={() => navigate("/loan-application")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Start a New Application
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {draftApps.map((app) => {
                  const facility = getLoanFacility(app.loanType ?? "");
                  const rate = Number(app.interestRate ?? 0);
                  const rateType = (app.interestRateType ??
                    facility?.interestRateType ??
                    "annual") as "annual" | "monthly" | "total";
                  const interestLabel = formatInterestLabel(
                    rate,
                    rateType,
                    facility?.interestRateRange,
                  );
                  const draftStep = Number(app.draftStep ?? 0) + 1;
                  const savedAt =
                    app.draftLastSavedAt || app.updatedAt || app.createdAt;

                  return (
                    <div
                      key={app._id}
                      className="bg-white p-6 border rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="flex justify-center items-center bg-amber-100 rounded-full w-14 h-14">
                            <Edit2 className="w-7 h-7 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {app.loanPurpose || "Untitled Draft"}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              {app.groupName || "Select a group"}
                            </p>
                          </div>
                        </div>
                        <span className="bg-amber-100 px-3 py-1 rounded-full font-medium text-amber-700 text-sm">
                          Draft
                        </span>
                      </div>

                      <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mt-6">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Amount</p>
                          <p className="font-semibold text-gray-900">
                            ₦{Number(app.loanAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Step</p>
                          <p className="font-semibold text-gray-900">
                            {draftStep} of 6
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Interest</p>
                          <p className="font-semibold text-gray-900">
                            {interestLabel}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Last Saved</p>
                          <p className="font-semibold text-gray-900">
                            {savedAt ? toYmd(savedAt) : "â€”"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <Button
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleResumeDraft(app._id)}
                        >
                          <Edit2 className="w-4 h-4" />
                          Continue Draft
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 border-red-200 text-red-600"
                          onClick={() => handleDeleteDraft(app._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Draft
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 mt-8 p-6 rounded-2xl text-white">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-lg">
                Need Help with Repayments?
              </h3>
              <p className="mb-4 text-blue-100 text-sm leading-relaxed">
                If you are facing difficulties, reach out early so we can help
                you restructure your loan or find alternative solutions.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={goToContactSupport}
                  className="bg-white hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-blue-600 text-sm transition-colors"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => setShowLoanFaq(true)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                >
                  View Loan FAQ
                </button>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={docPreviewOpen}
          onOpenChange={(open) =>
            open ? setDocPreviewOpen(true) : closeDocPreview()
          }
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Supporting Documents</DialogTitle>
            </DialogHeader>
            {docPreviewItems.length === 0 ? (
              <div className="py-10 text-slate-500 text-sm text-center">
                No documents attached to this edit request.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 text-slate-500 text-xs">
                  <span>
                    Document {docPreviewIndex + 1} of {docPreviewItems.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDocPreviewIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={docPreviewIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDocPreviewIndex((prev) =>
                          Math.min(docPreviewItems.length - 1, prev + 1),
                        )
                      }
                      disabled={docPreviewIndex >= docPreviewItems.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 text-slate-500 text-xs">
                  <span className="font-medium text-slate-600">
                    {docPreviewItems[docPreviewIndex]?.name || "Document"}
                  </span>
                  {docPreviewItems[docPreviewIndex]?.url && (
                    <a
                      href={docPreviewItems[docPreviewIndex]?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open in new tab
                    </a>
                  )}
                </div>

                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  {docPreviewItems[docPreviewIndex]?.url ? (
                    docPreviewItems[docPreviewIndex]?.type?.startsWith(
                      "image/",
                    ) ? (
                      <img
                        src={docPreviewItems[docPreviewIndex]?.url}
                        alt={
                          docPreviewItems[docPreviewIndex]?.name || "Preview"
                        }
                        className="rounded-lg w-full max-h-[420px] object-contain"
                      />
                    ) : (
                      <iframe
                        title="Document preview"
                        src={docPreviewItems[docPreviewIndex]?.url}
                        className="bg-white border-0 rounded-lg w-full h-[420px]"
                      />
                    )
                  ) : (
                    <div className="flex justify-center items-center h-[320px] text-slate-400 text-sm">
                      Preview unavailable. Download the document to view.
                    </div>
                  )}
                </div>

                <div className="gap-2 grid sm:grid-cols-2 lg:grid-cols-3">
                  {docPreviewItems.map((doc, idx) => (
                    <button
                      key={`${doc?.name}-${idx}`}
                      type="button"
                      onClick={() => setDocPreviewIndex(idx)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs ${
                        idx === docPreviewIndex
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-100 bg-white text-slate-600 hover:border-emerald-200"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {doc?.name || "Document"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {doc?.type || "file"} •{" "}
                          {formatFileSize(doc?.size || 0)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <LoanFaqModal open={showLoanFaq} onOpenChange={setShowLoanFaq} />
      </main>
    </div>
  );
}

export default function Loans() {
  return (
    <AuthProvider>
      <LoansContent />
    </AuthProvider>
  );
}
