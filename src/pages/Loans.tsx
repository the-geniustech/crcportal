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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-emerald-600" />
              My Loans
            </h1>
            <p className="text-gray-600 mt-2">
              Track your loan repayments and manage your borrowing
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={() => navigate('/credit-score')}
              className="gap-2"
            >
              <Award className="h-4 w-4" />
              Credit Score
            </Button>
            <Button
              onClick={() => navigate('/loan-application')}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Apply for New Loan
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeLoanApps.length}</p>
                <p className="text-sm text-gray-500">Active Loans</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{(activeLoanApps.reduce((sum, l) => sum + Number(l.remainingBalance || 0), 0) / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-gray-500">Total Outstanding</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {paymentSchedule.find((p) => p.status === "pending" || p.status === "overdue" || p.status === "upcoming")?.dueDate || "—"}
                </p>
                <p className="text-sm text-gray-500">Next Payment</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedLoanApps.length}</p>
                <p className="text-sm text-gray-500">Completed Loans</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="active" className="gap-2">
              <Clock className="h-4 w-4" />
              Active Loans ({activeLoanApps.length})
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Loan Calculator
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completedLoanApps.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeLoanApps.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Loans</h3>
                <p className="text-gray-500 mb-6">You don't have any active loans at the moment</p>
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
                  <div className="flex gap-3 overflow-x-auto pb-2">
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
                        <p className="text-sm text-gray-500">₦{vm.loanAmount.toLocaleString()}</p>
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
              <div className="bg-white rounded-xl border p-12 text-center">
                <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Loans</h3>
                <p className="text-gray-500">Your completed loans will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedLoanApps.map((app) => {
                  const principal = Number(app.approvedAmount ?? app.loanAmount ?? 0);
                  const totalRepayable = Number(app.totalRepayable ?? principal);
                  const totalPaid = totalRepayable;
                  const rate = Number(app.approvedInterestRate ?? app.interestRate ?? 0);
                  const completedDate = toYmd(app.updatedAt || app.disbursedAt || app.createdAt || "");

                  return (
                  <div key={app._id} className="bg-white rounded-xl border p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-7 w-7 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{app.loanPurpose}</h3>
                          <p className="text-sm text-gray-500">{app.groupName || "CRC Connect"}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                        Completed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Loan Amount</p>
                        <p className="font-semibold text-gray-900">₦{principal.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Total Paid</p>
                        <p className="font-semibold text-emerald-600">₦{totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Interest Rate</p>
                        <p className="font-semibold text-gray-900">{rate}%</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="font-semibold text-gray-900">{completedDate}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
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
              <div className="bg-white rounded-xl border p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Applications</h3>
                <p className="text-gray-500 mb-6">You don't have any pending loan applications</p>
                <Button
                  onClick={() => navigate('/loan-application')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Apply for a Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app._id} className="bg-white rounded-xl border p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{app.loanPurpose}</h3>
                          <p className="text-sm text-gray-500">{app.groupName || "CRC Connect"}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {String(app.status).replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Requested Amount</p>
                        <p className="font-semibold text-gray-900">â‚¦{Number(app.loanAmount || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Term</p>
                        <p className="font-semibold text-gray-900">{app.repaymentPeriod} months</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Interest Rate</p>
                        <p className="font-semibold text-gray-900">{Number(app.interestRate ?? 0)}%</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="font-semibold text-gray-900">{toYmd(app.createdAt || "")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Having Trouble with Repayments?</h3>
              <p className="text-blue-100 text-sm mb-4">
                If you're facing financial difficulties, contact us early. We can help you restructure your loan or find alternative solutions.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm">
                  Contact Support
                </button>
                <button className="px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors text-sm">
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
