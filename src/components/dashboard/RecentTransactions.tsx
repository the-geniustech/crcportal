import React from "react";

export interface Transaction {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "loan_payment"
    | "loan_disbursement"
    | "interest"
    | "fee";
  amount: number;
  description: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  createdAt: string;
  balanceAfter: number;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getTypeIcon = (type: Transaction["type"]) => {
    const icons = {
      deposit: (
        <div className="flex justify-center items-center bg-emerald-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
      ),
      withdrawal: (
        <div className="flex justify-center items-center bg-red-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </div>
      ),
      loan_payment: (
        <div className="flex justify-center items-center bg-blue-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-blue-600"
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
        </div>
      ),
      loan_disbursement: (
        <div className="flex justify-center items-center bg-purple-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      ),
      interest: (
        <div className="flex justify-center items-center bg-amber-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
      ),
      fee: (
        <div className="flex justify-center items-center bg-gray-100 rounded-full w-10 h-10">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
            />
          </svg>
        </div>
      ),
    };
    return icons[type];
  };

  const getAmountColor = (type: Transaction["type"]) => {
    const positiveTypes = ["deposit", "loan_disbursement", "interest"];
    return positiveTypes.includes(type) ? "text-emerald-600" : "text-red-600";
  };

  const getAmountPrefix = (type: Transaction["type"]) => {
    const positiveTypes = ["deposit", "loan_disbursement", "interest"];
    return positiveTypes.includes(type) ? "+" : "-";
  };

  const getStatusBadge = (status: Transaction["status"]) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-700",
    };
    return styles[status];
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <h3 className="mb-4 font-semibold text-gray-900 text-lg">
          Recent Transactions
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-500">No transactions yet</p>
          <p className="mt-1 text-gray-400 text-sm">
            Make your first contribution or loan repayment to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">
          Recent Transactions
        </h3>
        <button
          onClick={onViewAll}
          className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-4 hover:bg-gray-50 p-3 rounded-xl transition-colors cursor-pointer"
          >
            {getTypeIcon(transaction.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">
                  {transaction.description}
                </p>
                {transaction.status !== "completed" && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}
                  >
                    {transaction.status}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">
                {formatDate(transaction.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${getAmountColor(transaction.type)}`}
              >
                {getAmountPrefix(transaction.type)}
                {formatCurrency(transaction.amount)}
              </p>
              <p className="text-gray-400 text-xs">
                Bal: {formatCurrency(transaction.balanceAfter)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;
