import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Wallet,
} from "lucide-react";

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
  overdueContributions?: number;
  overdueRepayments?: number;
  contributionWindow?: { startDay: number; endDay: number; isOpen: boolean };
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
  groups: {
    id: string;
    name: string;
    maxLoanAmount: number;
    interestRate: number;
  }[];
}

export default function LoanEligibilityCheck({
  eligibilityData,
  selectedGroup,
  onGroupSelect,
  onContinue,
  groups,
}: LoanEligibilityCheckProps) {
  const eligibilityCriteria: EligibilityCriteria[] = [
    {
      name: "Minimum Savings Balance",
      description: "You must have at least ₦50,000 in savings",
      met: eligibilityData.savingsBalance >= 50000,
      value: `₦${eligibilityData.savingsBalance.toLocaleString()}`,
      required: "₦50,000",
    },
    {
      name: "Membership Duration",
      description: "You must be a member for at least 3 months",
      met: eligibilityData.membershipDuration >= 3,
      value: `${eligibilityData.membershipDuration} months`,
      required: "3 months",
    },
    {
      name: "Group Membership",
      description: "You must belong to at least one active group",
      met: eligibilityData.groupsJoined >= 1,
      value: `${eligibilityData.groupsJoined} group(s)`,
      required: "1 group",
    },
    {
      name: "Contribution Streak",
      description:
        "You must have made contributions for at least 3 consecutive months",
      met: eligibilityData.contributionStreak >= 3,
      value: `${eligibilityData.contributionStreak} months`,
      required: "3 months",
    },
    {
      name: "Meeting Attendance",
      description: "You must have at least 70% meeting attendance",
      met: eligibilityData.attendanceRate >= 70,
      value: `${eligibilityData.attendanceRate}%`,
      required: "70%",
    },
    {
      name: "No Loan Defaults",
      description: "You must not have any defaulted loans",
      met: eligibilityData.defaultedLoans === 0,
      value:
        eligibilityData.defaultedLoans === 0
          ? "No defaults"
          : `${eligibilityData.defaultedLoans} default(s)`,
      required: "No defaults",
    },
    {
      name: "No Overdue Contributions",
      description: "Contributions must be paid within the stipulated window",
      met: (eligibilityData.overdueContributions ?? 0) === 0,
      value:
        (eligibilityData.overdueContributions ?? 0) === 0
          ? "Up to date"
          : `${eligibilityData.overdueContributions} overdue`,
      required: "Up to date",
    },
    {
      name: "No Overdue Repayments",
      description: "Active loan repayments must stay current",
      met: (eligibilityData.overdueRepayments ?? 0) === 0,
      value:
        (eligibilityData.overdueRepayments ?? 0) === 0
          ? "Up to date"
          : `${eligibilityData.overdueRepayments} overdue`,
      required: "Up to date",
    },
  ];

  const allCriteriaMet = eligibilityCriteria.every((c) => c.met);
  const metCount = eligibilityCriteria.filter((c) => c.met).length;

  const maxLoanMultiplier =
    eligibilityData.creditScore >= 800
      ? 3
      : eligibilityData.creditScore >= 700
        ? 2.5
        : 2;
  const maxLoanAmount = eligibilityData.savingsBalance * maxLoanMultiplier;

  return (
    <div className="space-y-6">
      {/* Eligibility Status Banner */}
      <div
        className={`rounded-2xl p-6 ${allCriteriaMet ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-amber-500 to-orange-500"}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl ${allCriteriaMet ? "bg-white/20" : "bg-white/20"}`}
          >
            {allCriteriaMet ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex-1 text-white">
            <h3 className="mb-1 font-bold text-xl">
              {allCriteriaMet
                ? "You Are Eligible for a Loan!"
                : "Eligibility Requirements Not Met"}
            </h3>
            <p className="text-white/90">
              {allCriteriaMet
                ? `You meet all ${metCount} eligibility criteria. You can borrow up to ₦${maxLoanAmount.toLocaleString()}.`
                : `You meet ${metCount} of ${eligibilityCriteria.length} criteria. Please review the requirements below.`}
            </p>
          </div>
        </div>
      </div>

      {/* Member Stats Overview */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-500 text-sm">Savings Balance</span>
          </div>
          <p className="font-bold text-gray-900 text-xl">
            ₦{eligibilityData.savingsBalance.toLocaleString()}
          </p>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-500 text-sm">Credit Score</span>
          </div>
          <p className="font-bold text-gray-900 text-xl">
            {eligibilityData.creditScore}
          </p>
          <p className="font-medium text-emerald-600 text-xs">
            {eligibilityData.creditScore >= 800
              ? "Excellent"
              : eligibilityData.creditScore >= 700
                ? "Good"
                : "Fair"}
          </p>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-500 text-sm">Member Since</span>
          </div>
          <p className="font-bold text-gray-900 text-xl">
            {eligibilityData.membershipDuration} months
          </p>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-gray-500 text-sm">Groups Joined</span>
          </div>
          <p className="font-bold text-gray-900 text-xl">
            {eligibilityData.groupsJoined}
          </p>
        </div>
      </div>

      {/* Eligibility Criteria Checklist */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <div className="p-6 border-gray-100 border-b">
          <h3 className="font-semibold text-gray-900 text-lg">
            Eligibility Criteria
          </h3>
          <p className="mt-1 text-gray-500 text-sm">
            You must meet all criteria to apply for a loan
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {eligibilityCriteria.map((criteria, index) => (
            <div
              key={index}
              className={`p-4 flex items-center gap-4 ${criteria.met ? "bg-white" : "bg-red-50/50"}`}
            >
              <div
                className={`p-2 rounded-full ${criteria.met ? "bg-emerald-100" : "bg-red-100"}`}
              >
                {criteria.met ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{criteria.name}</h4>
                <p className="text-gray-500 text-sm">{criteria.description}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${criteria.met ? "text-emerald-600" : "text-red-600"}`}
                >
                  {criteria.value}
                </p>
                <p className="text-gray-500 text-xs">
                  Required: {criteria.required}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Select Group for Loan */}
      {allCriteriaMet && (
        <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
          <h3 className="mb-4 font-semibold text-gray-900 text-lg">
            Select Group for Loan
          </h3>
          <p className="mb-4 text-gray-500 text-sm">
            Choose which group you want to apply for a loan from
          </p>

          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onGroupSelect(group.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedGroup === group.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  {selectedGroup === group.id && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    Max:{" "}
                    <span className="font-medium text-gray-900">
                      ₦{group.maxLoanAmount.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Rates:{" "}
                    <span className="font-medium text-gray-900">
                      Facility based
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Maximum Loan Amount Info */}
      {allCriteriaMet && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-100 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="mb-1 font-semibold text-gray-900">
                Your Maximum Loan Amount
              </h4>
              <p className="mb-2 font-bold text-blue-600 text-3xl">
                ₦{maxLoanAmount.toLocaleString()}
              </p>
              <p className="text-gray-600 text-sm">
                Based on your savings of ₦
                {eligibilityData.savingsBalance.toLocaleString()} and credit
                score of {eligibilityData.creditScore}, you can borrow up to{" "}
                {maxLoanMultiplier}x your savings balance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rules & Regulations */}
      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <h3 className="mb-2 font-semibold text-gray-900 text-lg">
          Rules & Regulations
        </h3>
        <p className="mb-4 text-gray-500 text-sm">
          Please note these Contributions requirements before proceeding.
        </p>
        <div className="space-y-2 text-gray-600 text-sm">
          <p>
            Contributions must be paid between the 27th and 4th of each month.
          </p>
          <p>
            No delay or default is allowed in payments, especially when on loan.
          </p>
          <p>All transactions and forms must go through Group Leaders.</p>
          <p>
            General loans are expected to be repaid by October, bridging loans
            by January.
          </p>
        </div>
        {eligibilityData.contributionWindow && (
          <div className="bg-gray-50 mt-4 p-3 border rounded-lg">
            <p className="text-gray-700 text-sm">
              Contribution window: {eligibilityData.contributionWindow.startDay}
              th to {eligibilityData.contributionWindow.endDay}th.
              <span className="ml-2 font-medium">
                {eligibilityData.contributionWindow.isOpen
                  ? "Window open"
                  : "Window closed"}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={onContinue}
          disabled={!allCriteriaMet || !selectedGroup}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            allCriteriaMet && selectedGroup
              ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue to Loan Amount
        </button>
      </div>
    </div>
  );
}
