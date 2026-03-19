import React, { useState } from 'react';
import { DollarSign, Target, Briefcase, Home, GraduationCap, Heart, Car, ShoppingBag, Wrench, Sparkles } from 'lucide-react';

interface LoanAmountSelectorProps {
  maxAmount: number;
  minAmount: number;
  selectedAmount: number;
  purpose: string;
  purposeDescription: string;
  onAmountChange: (amount: number) => void;
  onPurposeChange: (purpose: string) => void;
  onPurposeDescriptionChange: (description: string) => void;
  onContinue: () => void;
  onBack: () => void;
  interestRate: number;
}

const loanPurposes = [
  { id: 'business', name: 'Business Expansion', icon: Briefcase, description: 'Grow or start your business' },
  { id: 'education', name: 'Education', icon: GraduationCap, description: 'School fees, training, courses' },
  { id: 'medical', name: 'Medical Emergency', icon: Heart, description: 'Healthcare and medical bills' },
  { id: 'home', name: 'Home Improvement', icon: Home, description: 'Renovations and repairs' },
  { id: 'vehicle', name: 'Vehicle Purchase', icon: Car, description: 'Buy or repair a vehicle' },
  { id: 'equipment', name: 'Equipment/Tools', icon: Wrench, description: 'Work equipment and tools' },
  { id: 'personal', name: 'Personal Needs', icon: ShoppingBag, description: 'Personal expenses' },
  { id: 'other', name: 'Other', icon: Sparkles, description: 'Other purposes' },
];

export default function LoanAmountSelector({
  maxAmount,
  minAmount,
  selectedAmount,
  purpose,
  purposeDescription,
  onAmountChange,
  onPurposeChange,
  onPurposeDescriptionChange,
  onContinue,
  onBack,
  interestRate
}: LoanAmountSelectorProps) {
  const [customAmount, setCustomAmount] = useState(selectedAmount.toString());

  const quickAmounts = [
    minAmount,
    Math.round(maxAmount * 0.25 / 10000) * 10000,
    Math.round(maxAmount * 0.5 / 10000) * 10000,
    Math.round(maxAmount * 0.75 / 10000) * 10000,
    maxAmount
  ].filter((v, i, a) => a.indexOf(v) === i && v >= minAmount && v <= maxAmount);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    onAmountChange(value);
    setCustomAmount(value.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    const numValue = parseInt(value) || 0;
    if (numValue >= minAmount && numValue <= maxAmount) {
      onAmountChange(numValue);
    }
  };

  const handleQuickAmountClick = (amount: number) => {
    onAmountChange(amount);
    setCustomAmount(amount.toString());
  };

  const estimatedMonthlyPayment = (amount: number, rate: number, months: number = 12) => {
    const monthlyRate = rate / 100 / 12;
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment);
  };

  const isValidAmount = selectedAmount >= minAmount && selectedAmount <= maxAmount;
  const canContinue = isValidAmount && purpose && purposeDescription.length >= 20;

  return (
    <div className="space-y-6">
      {/* Amount Selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Loan Amount</h3>
            <p className="text-sm text-gray-500">Choose how much you want to borrow</p>
          </div>
        </div>

        {/* Amount Display */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gray-50 rounded-2xl px-6 py-4">
            <span className="text-2xl text-gray-500">₦</span>
            <input
              type="text"
              value={customAmount}
              onChange={handleCustomAmountChange}
              className="text-4xl font-bold text-gray-900 bg-transparent border-none outline-none w-48 text-center"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Min: ₦{minAmount.toLocaleString()} | Max: ₦{maxAmount.toLocaleString()}
          </p>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            step={10000}
            value={selectedAmount}
            onChange={handleSliderChange}
            className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${((selectedAmount - minAmount) / (maxAmount - minAmount)) * 100}%, #e5e7eb ${((selectedAmount - minAmount) / (maxAmount - minAmount)) * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>₦{minAmount.toLocaleString()}</span>
            <span>₦{maxAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuickAmountClick(amount)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedAmount === amount
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ₦{(amount / 1000).toLocaleString()}K
            </button>
          ))}
        </div>

        {/* Estimated Payment Preview */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Estimated Monthly Payment (12 months)</p>
              <p className="text-2xl font-bold text-blue-900">
                ₦{estimatedMonthlyPayment(selectedAmount, interestRate, 12).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700">Interest Rate</p>
              <p className="text-xl font-bold text-blue-900">{interestRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Purpose Selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loan Purpose</h3>
            <p className="text-sm text-gray-500">What will you use this loan for?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {loanPurposes.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => onPurposeChange(p.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  purpose === p.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${purpose === p.id ? 'text-purple-600' : 'text-gray-400'}`} />
                <h4 className={`font-medium text-sm ${purpose === p.id ? 'text-purple-900' : 'text-gray-900'}`}>
                  {p.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">{p.description}</p>
              </button>
            );
          })}
        </div>

        {/* Purpose Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe how you will use this loan <span className="text-red-500">*</span>
          </label>
          <textarea
            value={purposeDescription}
            onChange={(e) => onPurposeDescriptionChange(e.target.value)}
            placeholder="Please provide details about how you plan to use this loan. Be specific about your business plans, purchases, or expenses..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
          />
          <div className="flex justify-between mt-2">
            <p className="text-xs text-gray-500">Minimum 20 characters required</p>
            <p className={`text-xs ${purposeDescription.length >= 20 ? 'text-emerald-600' : 'text-gray-500'}`}>
              {purposeDescription.length} / 500
            </p>
          </div>
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
          disabled={!canContinue}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            canContinue
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Repayment Terms
        </button>
      </div>
    </div>
  );
}
