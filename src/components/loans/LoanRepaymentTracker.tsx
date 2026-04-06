import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Wallet,
  ChevronRight,
  Calculator,
  Loader2,
  Download,
  Bell,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface LoanSchedule {
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
}

interface PaymentScheduleItem {
  id: string;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: "paid" | "pending" | "overdue" | "upcoming";
  paidDate?: string;
  lateFee?: number;
}

interface LoanRepaymentTrackerProps {
  loan: LoanSchedule;
  paymentSchedule: PaymentScheduleItem[];
  onMakePayment: (paymentId: string, amount: number) => void;
  onEarlyRepayment: () => void;
  onOpenFaq?: () => void;
}

export default function LoanRepaymentTracker({
  loan,
  paymentSchedule,
  onMakePayment,
  onEarlyRepayment,
  onOpenFaq,
}: LoanRepaymentTrackerProps) {
  const { toast } = useToast();
  const [showEarlyRepaymentModal, setShowEarlyRepaymentModal] = useState(false);
  const [earlyRepaymentAmount, setEarlyRepaymentAmount] = useState(
    loan.remainingBalance,
  );
  const [isCalculating, setIsCalculating] = useState(false);

  const paidPayments = paymentSchedule.filter((p) => p.status === "paid");
  const overduePayments = paymentSchedule.filter((p) => p.status === "overdue");
  const upcomingPayments = paymentSchedule.filter(
    (p) => p.status === "pending" || p.status === "upcoming",
  );
  const nextPayment = upcomingPayments[0];

  const totalPaid = paidPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const progressPercentage = Math.round((totalPaid / loan.totalPayment) * 100);
  const facility = getLoanFacility(loan.loanType || "");
  const interestLabel = formatInterestLabel(
    loan.interestRate,
    loan.interestRateType || facility?.interestRateType || "annual",
    facility?.interestRateRange,
  );

  // Calculate early repayment savings
  const calculateEarlyRepaymentSavings = (amount: number) => {
    const remainingInterest = paymentSchedule
      .filter((p) => p.status !== "paid")
      .reduce((sum, p) => sum + p.interestAmount, 0);

    // Simplified calculation - actual would be more complex
    const interestSaved = Math.round(remainingInterest * 0.7);
    return interestSaved;
  };

  const interestSaved = calculateEarlyRepaymentSavings(earlyRepaymentAmount);

  const handleEarlyRepayment = async () => {
    setIsCalculating(true);
    try {
      // Process early repayment
      await supabase.functions.invoke("send-sms", {
        body: {
          action: "early_repayment_confirmation",
          to: "08012345678", // Would be actual user phone
          name: "Member",
          amount: earlyRepaymentAmount,
          interest_saved: interestSaved,
        },
      });

      toast({
        title: "Early Repayment Initiated",
        description: `Your early repayment of ₦${earlyRepaymentAmount.toLocaleString()} is being processed`,
      });

      setShowEarlyRepaymentModal(false);
      onEarlyRepayment();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process early repayment",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-100 text-emerald-700";
      case "pending":
        return "bg-blue-100 text-blue-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      case "upcoming":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Loan Overview Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-emerald-100 text-sm">Active Loan</p>
            <h2 className="mt-1 font-bold text-3xl">
              ₦{loan.loanAmount.toLocaleString()}
            </h2>
            <p className="mt-1 text-emerald-100 text-sm">
              {loan.groupName} • {loan.purpose}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              loan.status === "active" ? "bg-white/20" : "bg-emerald-700"
            }`}
          >
            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="text-emerald-100">Repayment Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white rounded-full h-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="gap-4 grid grid-cols-3">
          <div>
            <p className="text-emerald-100 text-xs">Repaid So Far</p>
            <p className="font-semibold">₦{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-xs">Remaining</p>
            <p className="font-semibold">
              ₦{loan.remainingBalance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-emerald-100 text-xs">Monthly Payment</p>
            <p className="font-semibold">
              ₦{loan.monthlyPayment.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <div className="bg-white p-4 border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">
                {paidPayments.length}
              </p>
              <p className="text-gray-500 text-xs">Payments Made</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">
                {upcomingPayments.length}
              </p>
              <p className="text-gray-500 text-xs">Remaining</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">
                {interestLabel}
              </p>
              <p className="text-gray-500 text-xs">Interest Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 border rounded-xl">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center ${
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
              <p className="font-bold text-gray-900 text-xl">
                {overduePayments.length}
              </p>
              <p className="text-gray-500 text-xs">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {onOpenFaq && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Loan FAQ</p>
                <p className="text-sm text-gray-500">
                  Need clarity on repayment rules or loan terms? Review the
                  FAQ.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenFaq}
              className="whitespace-nowrap"
            >
              View FAQ
            </Button>
          </div>
        </div>
      )}

      {/* Next Payment Alert */}
      {nextPayment && (
        <div
          className={`rounded-xl p-5 ${
            nextPayment.status === "overdue"
              ? "bg-red-50 border border-red-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  nextPayment.status === "overdue"
                    ? "bg-red-100"
                    : "bg-blue-100"
                }`}
              >
                {nextPayment.status === "overdue" ? (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                ) : (
                  <Calendar className="w-6 h-6 text-blue-600" />
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
                    ? "Payment Overdue"
                    : "Next Payment Due"}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    nextPayment.status === "overdue"
                      ? "text-red-900"
                      : "text-blue-900"
                  }`}
                >
                  ₦{nextPayment.totalAmount.toLocaleString()}
                  {nextPayment.lateFee && nextPayment.lateFee > 0 && (
                    <span className="ml-2 font-normal text-sm">
                      (+₦{nextPayment.lateFee.toLocaleString()} late fee)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`text-sm ${
                  nextPayment.status === "overdue"
                    ? "text-red-700"
                    : "text-blue-700"
                }`}
              >
                Due: {nextPayment.dueDate}
              </p>
              <Button
                onClick={() =>
                  onMakePayment(nextPayment.id, nextPayment.totalAmount)
                }
                className={`mt-2 ${
                  nextPayment.status === "overdue"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <CreditCard className="mr-2 w-4 h-4" />
                Pay Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Early Repayment Option */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 border border-purple-200 rounded-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex justify-center items-center bg-purple-100 rounded-full w-12 h-12">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-purple-800">
                Early Repayment Option
              </p>
              <p className="text-purple-600 text-sm">
                Pay off your loan early and save on interest
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowEarlyRepaymentModal(true)}
            variant="outline"
            className="hover:bg-purple-100 border-purple-300 text-purple-700"
          >
            Calculate Savings
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="bg-white border rounded-xl">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="font-semibold text-gray-900">Payment Schedule</h3>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Download Schedule
          </Button>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {paymentSchedule.map((payment, index) => (
            <div
              key={payment.id}
              className={`p-4 flex items-center justify-between hover:bg-gray-50 ${
                payment.status === "overdue" ? "bg-red-50" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex justify-center items-center bg-gray-100 rounded-full w-10 h-10 font-medium text-gray-600">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    ₦{payment.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Principal: ₦{payment.principalAmount.toLocaleString()} •
                    Interest: ₦{payment.interestAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-gray-600 text-sm">{payment.dueDate}</p>
                  {payment.paidDate && (
                    <p className="text-emerald-600 text-xs">
                      Paid: {payment.paidDate}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(payment.status)}`}
                >
                  {getStatusIcon(payment.status)}
                  {payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)}
                </span>
                {(payment.status === "pending" ||
                  payment.status === "overdue") && (
                  <Button
                    size="sm"
                    onClick={() =>
                      onMakePayment(payment.id, payment.totalAmount)
                    }
                    className={
                      payment.status === "overdue"
                        ? "bg-red-600 hover:bg-red-700"
                        : ""
                    }
                  >
                    Pay
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loan Details */}
      <div className="bg-white p-5 border rounded-xl">
        <h3 className="mb-4 font-semibold text-gray-900">Loan Details</h3>
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-gray-500 text-sm">Start Date</p>
            <p className="font-medium text-gray-900">{loan.startDate}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">End Date</p>
            <p className="font-medium text-gray-900">{loan.endDate}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Term</p>
            <p className="font-medium text-gray-900">
              {loan.termMonths} months
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Interest</p>
            <p className="font-medium text-gray-900">
              ₦{loan.totalInterest.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Early Repayment Modal */}
      {showEarlyRepaymentModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="font-bold text-gray-900 text-xl">
                Early Repayment Calculator
              </h2>
              <p className="mt-1 text-gray-500 text-sm">
                See how much you can save by paying early
              </p>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Repayment Amount
                </label>
                <div className="relative">
                  <span className="top-1/2 left-4 absolute text-gray-500 -translate-y-1/2">
                    ₦
                  </span>
                  <input
                    type="number"
                    value={earlyRepaymentAmount}
                    onChange={(e) =>
                      setEarlyRepaymentAmount(Number(e.target.value))
                    }
                    className="py-3 pr-4 pl-8 border focus:border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                    min={loan.monthlyPayment}
                    max={loan.remainingBalance}
                  />
                </div>
                <p className="mt-1 text-gray-500 text-sm">
                  Remaining balance: ₦{loan.remainingBalance.toLocaleString()}
                </p>
              </div>

              <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-emerald-700">Interest Saved</span>
                  <span className="font-bold text-emerald-700 text-xl">
                    ₦{interestSaved.toLocaleString()}
                  </span>
                </div>
                <p className="text-emerald-600 text-sm">
                  By paying ₦{earlyRepaymentAmount.toLocaleString()} now, you'll
                  save on future interest payments
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">New Remaining Balance</span>
                  <span className="font-medium text-gray-900">
                    ₦
                    {Math.max(
                      0,
                      loan.remainingBalance - earlyRepaymentAmount,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 bg-gray-50 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowEarlyRepaymentModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEarlyRepayment}
                disabled={
                  isCalculating || earlyRepaymentAmount < loan.monthlyPayment
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isCalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Wallet className="mr-2 w-4 h-4" />
                    Make Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
