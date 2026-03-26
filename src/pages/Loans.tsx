import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoanRepaymentTracker from '@/components/loans/LoanRepaymentTracker';
import LoanCalculator from '@/components/loans/LoanCalculator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import { useLoanScheduleQuery } from "@/hooks/loans/useLoanScheduleQuery";
import type { BackendLoanApplication, BackendLoanScheduleItem } from "@/lib/loans";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
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
} from 'lucide-react';

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

function mapLoanVm(app: BackendLoanApplication, schedule: BackendLoanScheduleItem[] | null): LoanScheduleVM {
  const principal = Number(app.approvedAmount ?? app.loanAmount ?? 0);
  const totalPayment = Number(app.totalRepayable ?? principal);
  const remainingBalance = Number(app.remainingBalance ?? 0);
  const interestRate = Number(app.approvedInterestRate ?? app.interestRate ?? 0);
  const interestRateType = (app.interestRateType ?? "annual") as
    | "annual"
    | "monthly"
    | "total";
  const termMonths = Number(app.repaymentPeriod ?? 0);
  const monthlyPayment = Number(app.monthlyPayment ?? 0);

  const start = app.disbursedAt || app.repaymentStartDate || app.approvedAt || app.createdAt || null;
  const startDate = toYmd(start);

  const scheduleEnd = schedule && schedule.length ? schedule[schedule.length - 1].dueDate : null;
  const endDate =
    scheduleEnd
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
  
  // Check if coming from quick actions with calculator tab
  const locationState = location.state as { tab?: string } | null;
  const initialTab = locationState?.tab === 'calculator' ? 'calculator' : 'active';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedLoan, setSelectedLoan] = useState<LoanScheduleVM | null>(null);

  const applications = myAppsQuery.data ?? [];
  const activeLoanApps = applications.filter((a) => a.status === "disbursed" || a.status === "defaulted");
  const completedLoanApps = applications.filter((a) => a.status === "completed");
  const pendingApps = applications.filter((a) =>
    ["pending", "under_review", "approved", "rejected", "cancelled"].includes(String(a.status)),
  );

  const scheduleQuery = useLoanScheduleQuery(selectedLoan?.id);
  const paymentSchedule: PaymentScheduleItemVM[] = (scheduleQuery.data ?? []).map((it) => ({
    id: it._id,
    dueDate: toYmd(it.dueDate),
    principalAmount: it.principalAmount,
    interestAmount: it.interestAmount,
    totalAmount: it.totalAmount,
    status: it.status,
    paidDate: it.paidAt ? toYmd(it.paidAt) : undefined,
  }));

  const selectedLoanApp = selectedLoan ? activeLoanApps.find((a) => a._id === selectedLoan.id) : null;
  const selectedLoanVm = selectedLoanApp ? mapLoanVm(selectedLoanApp, scheduleQuery.data ?? null) : null;

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
    navigate('/payments', { state: { loanPayment: { paymentId, amount } } });
  };

  const handleEarlyRepayment = () => {
    toast({
      title: 'Early Repayment',
      description: 'Early repayment request has been submitted',
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
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
              onClick={() => navigate('/credit-score')}
              className="gap-2"
            >
              <Award className="w-4 h-4" />
              Credit Score
            </Button>
            <Button
              onClick={() => navigate('/loan-application')}
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
                <p className="font-bold text-gray-900 text-2xl">{activeLoanApps.length}</p>
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
                  ₦{(activeLoanApps.reduce((sum, l) => sum + Number(l.remainingBalance || 0), 0) / 1000).toFixed(0)}K
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
                  {paymentSchedule.find((p) => p.status === "pending" || p.status === "overdue" || p.status === "upcoming")?.dueDate || "—"}
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
                <p className="font-bold text-gray-900 text-2xl">{completedLoanApps.length}</p>
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
          </TabsList>

          <TabsContent value="active">
            {activeLoanApps.length === 0 ? (
              <div className="bg-white p-12 border rounded-xl text-center">
                <CreditCard className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">No Active Loans</h3>
                <p className="mb-6 text-gray-500">You don't have any active loans at the moment</p>
                <Button
                  onClick={() => navigate('/loan-application')}
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
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{vm.purpose}</p>
                        <p className="text-gray-500 text-sm">₦{vm.loanAmount.toLocaleString()}</p>
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
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">No Completed Loans</h3>
                <p className="text-gray-500">Your completed loans will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedLoanApps.map((app) => {
                  const principal = Number(app.approvedAmount ?? app.loanAmount ?? 0);
                  const totalRepayable = Number(app.totalRepayable ?? principal);
                  const totalPaid = totalRepayable;
                  const rate = Number(app.approvedInterestRate ?? app.interestRate ?? 0);
                  const facility = getLoanFacility(app.loanType ?? "");
                  const rateType = (app.interestRateType ??
                    facility?.interestRateType ??
                    "annual") as "annual" | "monthly" | "total";
                  const interestLabel = formatInterestLabel(
                    rate,
                    rateType,
                    facility?.interestRateRange,
                  );
                  const completedDate = toYmd(app.updatedAt || app.disbursedAt || app.createdAt || "");

                  return (
                  <div key={app._id} className="bg-white p-6 border rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="flex justify-center items-center bg-emerald-100 rounded-full w-14 h-14">
                          <CheckCircle className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{app.loanPurpose}</h3>
                          <p className="text-gray-500 text-sm">{app.groupName || "CRC Connect"}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-100 px-3 py-1 rounded-full font-medium text-emerald-700 text-sm">
                        Completed
                      </span>
                    </div>

                    <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mt-6">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Loan Amount</p>
                        <p className="font-semibold text-gray-900">₦{principal.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Repaid So Far</p>
                        <p className="font-semibold text-emerald-600">₦{totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Interest Rate</p>
                        <p className="font-semibold text-gray-900">{interestLabel}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Completed</p>
                        <p className="font-semibold text-gray-900">{completedDate}</p>
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
                <h3 className="mb-2 font-semibold text-gray-900 text-xl">No Pending Applications</h3>
                <p className="mb-6 text-gray-500">You don't have any pending loan applications</p>
                <Button
                  onClick={() => navigate('/loan-application')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Apply for a Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => {
                  const facility = getLoanFacility(app.loanType ?? "");
                  const rate = Number(app.approvedInterestRate ?? app.interestRate ?? 0);
                  const rateType = (app.interestRateType ??
                    facility?.interestRateType ??
                    "annual") as "annual" | "monthly" | "total";
                  const interestLabel = formatInterestLabel(
                    rate,
                    rateType,
                    facility?.interestRateRange,
                  );

                  return (
                  <div key={app._id} className="bg-white p-6 border rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="flex justify-center items-center bg-blue-100 rounded-full w-14 h-14">
                          <FileText className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{app.loanPurpose}</h3>
                          <p className="text-gray-500 text-sm">{app.groupName || "CRC Connect"}</p>
                        </div>
                      </div>
                      <span className="bg-gray-100 px-3 py-1 rounded-full font-medium text-gray-700 text-sm">
                        {String(app.status).replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mt-6">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Requested Amount</p>
                        <p className="font-semibold text-gray-900">₦{Number(app.loanAmount || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Term</p>
                        <p className="font-semibold text-gray-900">{app.repaymentPeriod} months</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Interest Rate</p>
                        <p className="font-semibold text-gray-900">{interestLabel}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-500 text-xs">Submitted</p>
                        <p className="font-semibold text-gray-900">{toYmd(app.createdAt || "")}</p>
                      </div>
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
              <h3 className="mb-1 font-semibold text-lg">Having Trouble with Repayments?</h3>
              <p className="mb-4 text-blue-100 text-sm">
                If you're facing financial difficulties, contact us early. We can help you restructure your loan or find alternative solutions.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="bg-white hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-blue-600 text-sm transition-colors">
                  Contact Support
                </button>
                <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors">
                  View Loan FAQ
                </button>
              </div>
            </div>
          </div>
        </div>
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
