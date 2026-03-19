import React from 'react';

interface SavingsOverviewProps {
  balance: number;
  totalSaved: number;
  interestEarned: number;
  accountNumber: string;
  onDeposit: () => void;
  onWithdraw: () => void;
}

const SavingsOverview: React.FC<SavingsOverviewProps> = ({
  balance,
  totalSaved,
  interestEarned,
  accountNumber,
  onDeposit,
  onWithdraw,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Total Savings Balance</p>
            <h2 className="text-4xl font-bold mt-1">{formatCurrency(balance)}</h2>
            <p className="text-emerald-200 text-sm mt-1">Account: {accountNumber}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-emerald-100 text-xs font-medium">Total Saved</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalSaved)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-emerald-100 text-xs font-medium">Interest Earned</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(interestEarned)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDeposit}
            className="flex-1 bg-white text-emerald-600 font-semibold py-3 px-4 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Deposit
          </button>
          <button
            onClick={onWithdraw}
            className="flex-1 bg-white/20 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavingsOverview;
