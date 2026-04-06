import React from "react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onApplyLoan: () => void;
  onPayLoan: () => void;
  onTransfer: () => void;
  onViewStatement: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onDeposit,
  onWithdraw,
  onApplyLoan,
  onPayLoan,
  onTransfer,
  onViewStatement,
}) => {
  const navigate = useNavigate();

  const actions = [
    // {
    //   label: 'Deposit',
    //   icon: (
    //     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    //     </svg>
    //   ),
    //   onClick: onDeposit,
    //   color: 'bg-emerald-500 hover:bg-emerald-600',
    // },
    {
      label: "Withdraw",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 12H4m0 0l4-4m-4 4l4 4"
          />
        </svg>
      ),
      onClick: onWithdraw,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      label: "Apply Loan",
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      onClick: onApplyLoan,
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      label: "Calculator",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      onClick: () => navigate("/loans", { state: { tab: "calculator" } }),
      color: "bg-orange-500 hover:bg-orange-600",
    },
    {
      label: "Credit Score",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
      onClick: () => navigate("/credit-score"),
      color: "bg-amber-500 hover:bg-amber-600",
    },
    {
      label: "Guarantor",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      onClick: () => navigate("/guarantor"),
      color: "bg-teal-500 hover:bg-teal-600",
    },
    {
      label: "Calendar",
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
      onClick: () => navigate("/calendar"),
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
  ];

  return (
    <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
      <h3 className="mb-4 font-semibold text-gray-900 text-lg">
        Quick Actions
      </h3>
      <div className="gap-4 grid grid-cols-4 sm:grid-cols-7">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="group flex flex-col items-center gap-2"
          >
            <div
              className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white transition-all transform group-hover:scale-110 shadow-lg`}
            >
              {action.icon}
            </div>
            <span className="font-medium text-gray-600 group-hover:text-gray-900 text-xs transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
