import React from "react";
import { useNavigate } from "react-router-dom";

export interface Loan {
  id: string;
  amount: number;
  status:
    | "pending"
    | "approved"
    | "active"
    | "completed"
    | "defaulted"
    | "rejected";
  purpose: string;
  monthlyPayment: number;
  nextPaymentAmount?: number;
  remainingBalance: number;
  principalOutstanding: number;
  accruedInterestBalance: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  nextPaymentDate: string;
  progress: number;
}

interface LoanHistoryProps {
  loans: Loan[];
  onPayLoan: (loanId: string) => void;
  onViewDetails: (loanId: string) => void;
}

const LoanHistory: React.FC<LoanHistoryProps> = ({
  loans,
  onPayLoan,
  onViewDetails,
}) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: Loan["status"]) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      active: "bg-emerald-100 text-emerald-700",
      completed: "bg-gray-100 text-gray-700",
      defaulted: "bg-red-100 text-red-700",
      rejected: "bg-red-100 text-red-700",
    };
    return colors[status];
  };

  const getStatusLabel = (status: Loan["status"]) => {
    const labels = {
      pending: "Pending Review",
      approved: "Approved",
      active: "Active",
      completed: "Completed",
      defaulted: "Defaulted",
      rejected: "Rejected",
    };
    return labels[status];
  };

  if (loans.length === 0) {
    return (
      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <h3 className="mb-4 font-semibold text-gray-900 text-lg">
          Loan History
        </h3>
        <div className="py-8 text-center">
          <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500">No loan history yet</p>
          <p className="mt-1 text-gray-400 text-sm">
            Apply for your first loan to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">Loan History</h3>
        <button
          onClick={() => navigate("/loans")}
          className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
        >
          View All
        </button>
      </div>

      <div className="space-y-4">
        {loans.map((loan) => {
          const nextPaymentAmount = Number.isFinite(
            loan.nextPaymentAmount ?? Number.NaN,
          )
            ? (loan.nextPaymentAmount as number)
            : loan.monthlyPayment;
          return (
            <div
              key={loan.id}
              className="p-4 border border-gray-100 hover:border-gray-200 rounded-xl transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{loan.purpose}</h4>
                  <p className="text-gray-500 text-sm">
                    Loan Amount: {formatCurrency(loan.amount)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}
                >
                  {getStatusLabel(loan.status)}
                </span>
              </div>

            {loan.status === "active" && (
              <>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-gray-500">Repayment Progress</span>
                    <span className="font-medium text-gray-700">
                      {loan.progress}%
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full w-full h-2">
                    <div
                      className="bg-emerald-500 rounded-full h-2 transition-all"
                      style={{ width: `${loan.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="gap-4 grid grid-cols-2 mb-3">
                  <div>
                    <p className="text-gray-500 text-xs">Next Amount Due</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(nextPaymentAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Remaining Balance</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(loan.remainingBalance)}
                    </p>
                  </div>
                </div>

                <div className="gap-3 grid grid-cols-2 lg:grid-cols-4 mb-3">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-gray-500 text-[11px] uppercase tracking-[0.14em]">
                      Principal Due
                    </p>
                    <p className="mt-1 font-semibold text-gray-900 text-sm">
                      {formatCurrency(loan.principalOutstanding)}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl">
                    <p className="text-amber-700 text-[11px] uppercase tracking-[0.14em]">
                      Interest Due
                    </p>
                    <p className="mt-1 font-semibold text-amber-900 text-sm">
                      {formatCurrency(loan.accruedInterestBalance)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <p className="text-emerald-700 text-[11px] uppercase tracking-[0.14em]">
                      Principal Repaid
                    </p>
                    <p className="mt-1 font-semibold text-emerald-900 text-sm">
                      {formatCurrency(loan.totalPrincipalPaid)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-blue-700 text-[11px] uppercase tracking-[0.14em]">
                      Interest Repaid
                    </p>
                    <p className="mt-1 font-semibold text-blue-900 text-sm">
                      {formatCurrency(loan.totalInterestPaid)}
                    </p>
                  </div>
                </div>

                <div
                  className={`mb-3 rounded-xl border px-3 py-2 text-sm ${
                    loan.accruedInterestBalance > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {loan.accruedInterestBalance > 0
                    ? "Your next repayment will clear accrued interest first. Principal starts reducing once the accrued interest balance is fully covered."
                    : "Interest accrues only for elapsed months on the remaining principal until this loan is fully repaid."}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-gray-100 border-t">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Next payment: {loan.nextPaymentDate}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    Amount due: {formatCurrency(nextPaymentAmount)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate("/loans")}
                      className="px-3 py-1.5 font-medium text-gray-600 hover:text-gray-900 text-sm transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => onPayLoan(loan.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-medium text-white text-sm transition-colors"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </>
            )}

            {loan.status === "completed" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Fully repaid
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="bg-emerald-50 px-3 py-1 rounded-full font-medium text-emerald-700">
                    Principal repaid: {formatCurrency(loan.totalPrincipalPaid)}
                  </span>
                  <span className="bg-blue-50 px-3 py-1 rounded-full font-medium text-blue-700">
                    Interest paid: {formatCurrency(loan.totalInterestPaid)}
                  </span>
                </div>
              </div>
            )}

            {loan.status === "pending" && (
              <p className="text-yellow-600 text-sm">
                Your loan application is under review
              </p>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanHistory;
