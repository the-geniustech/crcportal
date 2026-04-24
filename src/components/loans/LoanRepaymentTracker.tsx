import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  HelpCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface LoanSchedule {
  id: string;
  loanAmount: number;
  interestRate: number;
  interestRateType?: "annual" | "monthly" | "total";
  loanType?: string;
  termMonths: number;
  projectedMonthlyDue: number;
  nextPaymentAmount: number;
  nextPaymentDate: string;
  totalInterest: number;
  totalPayment: number;
  startDate: string;
  endDate: string;
  remainingBalance: number;
  principalOutstanding: number;
  accruedInterestBalance: number;
  repaidSoFar: number;
  status: "active" | "completed" | "defaulted";
  groupName: string;
  purpose: string;
}

interface PaymentScheduleItem {
  id: string;
  dueDate: string;
  openingPrincipalBalance: number;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidPrincipalAmount: number;
  paidInterestAmount: number;
  isProjected: boolean;
  status: "paid" | "pending" | "overdue" | "upcoming";
  paidDate?: string;
}

interface LoanRepaymentTrackerProps {
  loan: LoanSchedule;
  paymentSchedule: PaymentScheduleItem[];
  onMakePayment: (loanId: string, amount: number) => void;
  onEarlyRepayment: () => void;
  onOpenFaq?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getOutstandingAmount(item: PaymentScheduleItem) {
  return Math.max(
    0,
    Number(item.totalAmount || 0) -
      Number(item.paidPrincipalAmount || 0) -
      Number(item.paidInterestAmount || 0),
  );
}

function getStatusColor(status: PaymentScheduleItem["status"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-blue-100 text-blue-700";
    case "overdue":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function LoanRepaymentTracker({
  loan,
  paymentSchedule,
  onMakePayment,
  onEarlyRepayment,
  onOpenFaq,
}: LoanRepaymentTrackerProps) {
  const [showCustomRepaymentModal, setShowCustomRepaymentModal] = useState(false);
  const [customRepaymentAmount, setCustomRepaymentAmount] = useState(
    loan.nextPaymentAmount > 0 ? loan.nextPaymentAmount : loan.remainingBalance,
  );

  useEffect(() => {
    setCustomRepaymentAmount(
      loan.nextPaymentAmount > 0 ? loan.nextPaymentAmount : loan.remainingBalance,
    );
  }, [loan.id, loan.nextPaymentAmount, loan.remainingBalance]);

  const scheduleItems = useMemo(
    () =>
      [...paymentSchedule].sort((left, right) =>
        left.dueDate.localeCompare(right.dueDate),
      ),
    [paymentSchedule],
  );

  const paidPayments = scheduleItems.filter((item) => getOutstandingAmount(item) <= 0);
  const overduePayments = scheduleItems.filter((item) => item.status === "overdue");
  const openPayments = scheduleItems.filter((item) => getOutstandingAmount(item) > 0);
  const nextPayment = openPayments[0] ?? null;
  const progressBase = Math.max(loan.repaidSoFar + loan.remainingBalance, 0);
  const progressPercentage =
    progressBase > 0
      ? Math.min(100, Math.round((loan.repaidSoFar / progressBase) * 100))
      : 100;
  const facility = getLoanFacility(loan.loanType || "");
  const interestLabel = formatInterestLabel(
    loan.interestRate,
    loan.interestRateType || facility?.interestRateType || "annual",
    facility?.interestRateRange,
  );
  const customRepaymentError =
    customRepaymentAmount <= 0
      ? "Enter an amount greater than 0."
      : customRepaymentAmount > loan.remainingBalance
        ? `Amount cannot exceed ${formatCurrency(loan.remainingBalance)}.`
        : "";

  const handleProceedToPayment = (amount: number) => {
    onMakePayment(loan.id, amount);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 p-6 text-white">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-emerald-100">Loan Repayment Dashboard</p>
            <h2 className="mt-1 text-3xl font-bold">
              {formatCurrency(loan.loanAmount)}
            </h2>
            <p className="mt-1 text-sm text-emerald-100">
              {loan.groupName} • {loan.purpose}
            </p>
          </div>
          <div className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
            {loan.status === "completed" ? "Completed" : "Active"}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-emerald-100">Repayment Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-emerald-100">Repaid So Far</p>
            <p className="font-semibold">{formatCurrency(loan.repaidSoFar)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">Total Remaining</p>
            <p className="font-semibold">
              {formatCurrency(loan.remainingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">Principal Outstanding</p>
            <p className="font-semibold">
              {formatCurrency(loan.principalOutstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">Accrued Interest Due</p>
            <p className="font-semibold">
              {formatCurrency(loan.accruedInterestBalance)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {paidPayments.length}
              </p>
              <p className="text-xs text-gray-500">Settled Cycles</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(loan.nextPaymentAmount || loan.projectedMonthlyDue)}
              </p>
              <p className="text-xs text-gray-500">Recommended Next Due</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{interestLabel}</p>
              <p className="text-xs text-gray-500">Interest on Remaining Principal</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                overduePayments.length > 0 ? "bg-red-100" : "bg-gray-100"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${
                  overduePayments.length > 0 ? "text-red-600" : "text-gray-600"
                }`}
              />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {overduePayments.length}
              </p>
              <p className="text-xs text-gray-500">Overdue Cycles</p>
            </div>
          </div>
        </div>
      </div>

      {onOpenFaq && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Repayment FAQ</p>
                <p className="text-sm text-gray-500">
                  Repayments first clear accrued interest, then reduce your principal.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenFaq}>
              View FAQ
            </Button>
          </div>
        </div>
      )}

      {nextPayment && (
        <div
          className={`rounded-xl border p-5 ${
            nextPayment.status === "overdue"
              ? "border-red-200 bg-red-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  nextPayment.status === "overdue" ? "bg-red-100" : "bg-blue-100"
                }`}
              >
                {nextPayment.status === "overdue" ? (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                ) : (
                  <Calendar className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div>
                <p
                  className={`font-medium ${
                    nextPayment.status === "overdue"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  {nextPayment.status === "overdue"
                    ? "Repayment Overdue"
                    : "Next Repayment Cycle"}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    nextPayment.status === "overdue"
                      ? "text-red-900"
                      : "text-blue-900"
                  }`}
                >
                  {formatCurrency(getOutstandingAmount(nextPayment))}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Due on {nextPayment.dueDate || loan.nextPaymentDate || "next cycle"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="border-blue-200 bg-white"
                onClick={() => setShowCustomRepaymentModal(true)}
              >
                Custom Amount
              </Button>
              <Button
                onClick={() =>
                  handleProceedToPayment(
                    Math.min(getOutstandingAmount(nextPayment), loan.remainingBalance),
                  )
                }
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Repay Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-purple-800">Flexible Repayment</p>
              <p className="text-sm text-purple-600">
                Make any repayment above zero up to your total remaining balance.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-purple-300 bg-white text-purple-700 hover:bg-purple-100"
            onClick={() => setShowCustomRepaymentModal(true)}
          >
            Custom Repayment
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="font-semibold text-gray-900">Repayment Cycles</h3>
            <p className="text-sm text-gray-500">
              Interest accrues monthly on the remaining principal until the loan is fully cleared.
            </p>
          </div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {scheduleItems.map((payment, index) => {
            const outstandingAmount = getOutstandingAmount(payment);
            const isPayable = outstandingAmount > 0 && loan.remainingBalance > 0;
            return (
              <div
                key={payment.id}
                className={`border-b p-4 last:border-b-0 ${
                  payment.status === "overdue" ? "bg-red-50/70" : "bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-700">
                      {index + 1}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {payment.isProjected ? "Projected Cycle" : "Repayment Cycle"}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {payment.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
                        <p>Due Date: {payment.dueDate}</p>
                        <p>Opening Principal: {formatCurrency(payment.openingPrincipalBalance)}</p>
                        <p>Principal Due: {formatCurrency(payment.principalAmount)}</p>
                        <p>Interest Due: {formatCurrency(payment.interestAmount)}</p>
                        <p>Principal Paid: {formatCurrency(payment.paidPrincipalAmount)}</p>
                        <p>Interest Paid: {formatCurrency(payment.paidInterestAmount)}</p>
                        <p>Total Cycle Due: {formatCurrency(payment.totalAmount)}</p>
                        <p>Outstanding: {formatCurrency(outstandingAmount)}</p>
                      </div>
                      {payment.paidDate && (
                        <p className="text-xs text-emerald-600">
                          Settled on {payment.paidDate}
                        </p>
                      )}
                    </div>
                  </div>
                  {isPayable && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleProceedToPayment(
                          Math.min(outstandingAmount, loan.remainingBalance),
                        )
                      }
                    >
                      Pay {formatCurrency(Math.min(outstandingAmount, loan.remainingBalance))}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="mb-4 font-semibold text-gray-900">Loan Details</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-medium text-gray-900">{loan.startDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End of Original Term</p>
            <p className="font-medium text-gray-900">{loan.endDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Original Term</p>
            <p className="font-medium text-gray-900">{loan.termMonths} months</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Projected Monthly Due</p>
            <p className="font-medium text-gray-900">
              {formatCurrency(loan.projectedMonthlyDue)}
            </p>
          </div>
        </div>
      </div>

      {showCustomRepaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white">
            <div className="border-b p-6">
              <h2 className="text-xl font-bold text-gray-900">
                Make Custom Repayment
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter any amount greater than 0 and up to your remaining balance.
              </p>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Repayment Amount
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customRepaymentAmount}
                  onChange={(event) =>
                    setCustomRepaymentAmount(Number(event.target.value))
                  }
                />
                <p className="mt-2 text-sm text-gray-500">
                  Remaining balance: {formatCurrency(loan.remainingBalance)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Interest due now: {formatCurrency(loan.accruedInterestBalance)} •
                  Principal outstanding: {formatCurrency(loan.principalOutstanding)}
                </p>
                {customRepaymentError && (
                  <p className="mt-2 text-sm text-red-600">
                    {customRepaymentError}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                Your payment will be applied to accrued interest first, then the
                remaining principal.
              </div>
            </div>
            <div className="flex gap-3 border-t bg-gray-50 p-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCustomRepaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={Boolean(customRepaymentError)}
                onClick={() => {
                  handleProceedToPayment(customRepaymentAmount);
                  setShowCustomRepaymentModal(false);
                  onEarlyRepayment();
                }}
              >
                Continue to Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
