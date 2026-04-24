import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Calculator, TrendingDown, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { buildAmortizationSchedule, calculateLoanSummary } from "@/lib/loanMath";
import type { LoanInterestRateType } from "@/lib/loanPolicy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RepaymentOption {
  months: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface LoanRepaymentTermsProps {
  loanAmount: number;
  interestRate: number;
  interestRateType: LoanInterestRateType;
  selectedTerm: number;
  onTermChange: (months: number) => void;
  termOptions?: number[];
  onContinue: () => void;
  onBack: () => void;
}

export default function LoanRepaymentTerms({
  loanAmount,
  interestRate,
  interestRateType,
  selectedTerm,
  onTermChange,
  termOptions,
  onContinue,
  onBack
}: LoanRepaymentTermsProps) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const calculateRepayment = (principal: number, rate: number, months: number): RepaymentOption => {
    const summary = calculateLoanSummary({
      principal,
      rate,
      rateType: interestRateType,
      months,
    });

    return {
      months,
      monthlyPayment: summary.monthlyPayment,
      totalInterest: summary.totalInterest,
      totalPayment: summary.totalPayment,
    };
  };

  const generateAmortizationSchedule = (principal: number, rate: number, months: number): AmortizationEntry[] => {
    return buildAmortizationSchedule({
      principal,
      rate,
      rateType: interestRateType,
      months,
    }).map((entry) => ({
      month: entry.month,
      payment: entry.payment,
      principal: entry.principal,
      interest: entry.interest,
      balance: entry.balance,
    }));
  };

  const availableTerms = useMemo(() => {
    const baseTerms = Array.isArray(termOptions)
      ? termOptions
      : Array.from({ length: 10 }, (_, i) => i + 1);
    return baseTerms
      .filter((term) => term >= 1 && term <= 10)
      .sort((a, b) => a - b);
  }, [termOptions]);

  useEffect(() => {
    if (availableTerms.length === 0) return;
    if (availableTerms.includes(selectedTerm)) return;
    onTermChange(availableTerms[0]);
  }, [availableTerms, onTermChange, selectedTerm]);

  const repaymentOptions = availableTerms.map(months => calculateRepayment(loanAmount, interestRate, months));
  const activeTerm = availableTerms.includes(selectedTerm)
    ? selectedTerm
    : repaymentOptions[0]?.months ?? 1;
  const selectedOption =
    repaymentOptions.find(o => o.months === activeTerm) ||
    repaymentOptions[0];
  const amortizationSchedule = generateAmortizationSchedule(loanAmount, interestRate, activeTerm);
  
  const displayedSchedule = showFullSchedule ? amortizationSchedule : amortizationSchedule.slice(0, 6);

  const getMonthName = (monthOffset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (repaymentOptions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-amber-800 font-medium">No repayment terms available</p>
          <p className="text-amber-700 text-sm mt-1">
            The selected loan facility is not available for the current repayment window.
          </p>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
          <button
            disabled
            className="px-8 py-3 rounded-xl font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
          >
            Continue to Documentation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Repayment Term Selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Repayment Term</h3>
            <p className="text-sm text-gray-500">Choose how long you want to repay the loan</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] items-start">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Repayment Term (Months)
            </label>
            <Select
              value={String(activeTerm)}
              onValueChange={(value) => onTermChange(Number(value))}
            >
              <SelectTrigger className="w-full md:max-w-xs">
                <SelectValue placeholder="Select repayment term" />
              </SelectTrigger>
              <SelectContent>
                {availableTerms.map((months) => (
                  <SelectItem key={months} value={String(months)}>
                    {months} month{months > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Showing terms that fit within the current repayment window.
            </p>
          </div>
          {selectedOption && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Selected Term Summary
              </p>
              <div className="mt-3 space-y-2 text-sm text-blue-900">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Projected Monthly Due</span>
                  <span className="font-semibold">
                    ₦{selectedOption.monthlyPayment.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Total Interest</span>
                  <span className="font-semibold text-amber-600">
                    ₦{selectedOption.totalInterest.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                  <span className="text-blue-700">Total Repayment</span>
                  <span className="font-semibold">
                    ₦{selectedOption.totalPayment.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loan Summary */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Loan Summary</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-emerald-100 text-sm">Loan Amount</p>
            <p className="text-2xl font-bold">₦{loanAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Projected Monthly Due</p>
            <p className="text-2xl font-bold">₦{selectedOption.monthlyPayment.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Total Interest</p>
            <p className="text-2xl font-bold">₦{selectedOption.totalInterest.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Total Repayment</p>
            <p className="text-2xl font-bold">₦{selectedOption.totalPayment.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-200" />
            <p className="text-sm text-emerald-100">
              First payment due: <span className="font-semibold text-white">{getMonthName(1)}</span> | 
              Final payment: <span className="font-semibold text-white">{getMonthName(activeTerm)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Amortization Schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingDown className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Amortization Schedule</h3>
              <p className="text-sm text-gray-500">See how your loan balance decreases over time</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Month</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Payment</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Principal</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Interest</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedSchedule.map((entry) => (
                <tr key={entry.month} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                      {entry.month}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{getMonthName(entry.month)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₦{entry.payment.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">₦{entry.principal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-amber-600">₦{entry.interest.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₦{entry.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {amortizationSchedule.length > 6 && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setShowFullSchedule(!showFullSchedule)}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showFullSchedule ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All {amortizationSchedule.length} Months
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Visual Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Payment Breakdown</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Principal (Loan Amount)</span>
              <span className="font-medium text-gray-900">₦{loanAmount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div 
                className="bg-emerald-500 h-3 rounded-full"
                style={{ width: `${(loanAmount / selectedOption.totalPayment) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Total Interest</span>
              <span className="font-medium text-amber-600">₦{selectedOption.totalInterest.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div 
                className="bg-amber-500 h-3 rounded-full"
                style={{ width: `${(selectedOption.totalInterest / selectedOption.totalPayment) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
          <span className="font-medium text-gray-900">Total Amount to Repay</span>
          <span className="text-xl font-bold text-gray-900">₦{selectedOption.totalPayment.toLocaleString()}</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-8 py-3 rounded-xl font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all"
        >
          Continue to Documentation
        </button>
      </div>
    </div>
  );
}
