import React from 'react';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Users, Calendar, Wallet } from 'lucide-react';

interface EligibilityData {
  savingsBalance: number;
  totalContributions: number;
  membershipDuration: number; // in months
  groupsJoined: number;
  attendanceRate: number;
  contributionStreak: number;
  previousLoans: number;
  defaultedLoans: number;
  creditScore: number;
}

interface EligibilityCriteria {
  name: string;
  description: string;
  met: boolean;
  value: string;
  required: string;
}

interface LoanEligibilityCheckProps {
  eligibilityData: EligibilityData;
  selectedGroup: string | null;
  onGroupSelect: (groupId: string) => void;
  onContinue: () => void;
  groups: { id: string; name: string; maxLoanAmount: number; interestRate: number }[];
}

export default function LoanEligibilityCheck({
  eligibilityData,
  selectedGroup,
  onGroupSelect,
  onContinue,
  groups
}: LoanEligibilityCheckProps) {
  const eligibilityCriteria: EligibilityCriteria[] = [
    {
      name: 'Minimum Savings Balance',
      description: 'You must have at least ₦50,000 in savings',
      met: eligibilityData.savingsBalance >= 50000,
      value: `₦${eligibilityData.savingsBalance.toLocaleString()}`,
      required: '₦50,000'
    },
    {
      name: 'Membership Duration',
      description: 'You must be a member for at least 3 months',
      met: eligibilityData.membershipDuration >= 3,
      value: `${eligibilityData.membershipDuration} months`,
      required: '3 months'
    },
    {
      name: 'Group Membership',
      description: 'You must belong to at least one active group',
      met: eligibilityData.groupsJoined >= 1,
      value: `${eligibilityData.groupsJoined} group(s)`,
      required: '1 group'
    },
    {
      name: 'Contribution Streak',
      description: 'You must have made contributions for at least 3 consecutive months',
      met: eligibilityData.contributionStreak >= 3,
      value: `${eligibilityData.contributionStreak} months`,
      required: '3 months'
    },
    {
      name: 'Meeting Attendance',
      description: 'You must have at least 70% meeting attendance',
      met: eligibilityData.attendanceRate >= 70,
      value: `${eligibilityData.attendanceRate}%`,
      required: '70%'
    },
    {
      name: 'No Loan Defaults',
      description: 'You must not have any defaulted loans',
      met: eligibilityData.defaultedLoans === 0,
      value: eligibilityData.defaultedLoans === 0 ? 'No defaults' : `${eligibilityData.defaultedLoans} default(s)`,
      required: 'No defaults'
    }
  ];

  const allCriteriaMet = eligibilityCriteria.every(c => c.met);
  const metCount = eligibilityCriteria.filter(c => c.met).length;

  const maxLoanMultiplier = eligibilityData.creditScore >= 800 ? 3 : eligibilityData.creditScore >= 700 ? 2.5 : 2;
  const maxLoanAmount = eligibilityData.savingsBalance * maxLoanMultiplier;

  return (
    <div className="space-y-6">
      {/* Eligibility Status Banner */}
      <div className={`rounded-2xl p-6 ${allCriteriaMet ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${allCriteriaMet ? 'bg-white/20' : 'bg-white/20'}`}>
            {allCriteriaMet ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex-1 text-white">
            <h3 className="text-xl font-bold mb-1">
              {allCriteriaMet ? 'You Are Eligible for a Loan!' : 'Eligibility Requirements Not Met'}
            </h3>
            <p className="text-white/90">
              {allCriteriaMet 
                ? `You meet all ${metCount} eligibility criteria. You can borrow up to ₦${maxLoanAmount.toLocaleString()}.`
                : `You meet ${metCount} of ${eligibilityCriteria.length} criteria. Please review the requirements below.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Member Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Savings Balance</span>
          </div>
          <p className="text-xl font-bold text-gray-900">₦{eligibilityData.savingsBalance.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Credit Score</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{eligibilityData.creditScore}</p>
          <p className="text-xs text-emerald-600 font-medium">
            {eligibilityData.creditScore >= 800 ? 'Excellent' : eligibilityData.creditScore >= 700 ? 'Good' : 'Fair'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Member Since</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{eligibilityData.membershipDuration} months</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">Groups Joined</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{eligibilityData.groupsJoined}</p>
        </div>
      </div>

      {/* Eligibility Criteria Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Eligibility Criteria</h3>
          <p className="text-sm text-gray-500 mt-1">You must meet all criteria to apply for a loan</p>
        </div>
        <div className="divide-y divide-gray-100">
          {eligibilityCriteria.map((criteria, index) => (
            <div key={index} className={`p-4 flex items-center gap-4 ${criteria.met ? 'bg-white' : 'bg-red-50/50'}`}>
              <div className={`p-2 rounded-full ${criteria.met ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {criteria.met ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{criteria.name}</h4>
                <p className="text-sm text-gray-500">{criteria.description}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${criteria.met ? 'text-emerald-600' : 'text-red-600'}`}>
                  {criteria.value}
                </p>
                <p className="text-xs text-gray-500">Required: {criteria.required}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Select Group for Loan */}
      {allCriteriaMet && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Group for Loan</h3>
          <p className="text-sm text-gray-500 mb-4">Choose which group you want to apply for a loan from</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onGroupSelect(group.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedGroup === group.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  {selectedGroup === group.id && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    Max: <span className="font-medium text-gray-900">₦{group.maxLoanAmount.toLocaleString()}</span>
                  </span>
                  <span className="text-gray-500">
                    Rate: <span className="font-medium text-gray-900">{group.interestRate}%</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Maximum Loan Amount Info */}
      {allCriteriaMet && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Your Maximum Loan Amount</h4>
              <p className="text-3xl font-bold text-blue-600 mb-2">₦{maxLoanAmount.toLocaleString()}</p>
              <p className="text-sm text-gray-600">
                Based on your savings of ₦{eligibilityData.savingsBalance.toLocaleString()} and credit score of {eligibilityData.creditScore}, 
                you can borrow up to {maxLoanMultiplier}x your savings balance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={onContinue}
          disabled={!allCriteriaMet || !selectedGroup}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            allCriteriaMet && selectedGroup
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Loan Amount
        </button>
      </div>
    </div>
  );
}
