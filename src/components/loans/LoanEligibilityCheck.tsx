import React from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

interface EligibilityData {
  savingsBalance: number;
  contributionBalance?: number;
  totalContributions: number;
  membershipDuration: number;
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
  requestedLoanAmount: number;
  onGroupSelect: (groupId: string) => void;
  onContinue: () => void;
  groups: {
    id: string;
    name: string;
    maxLoanAmount: number;
    interestRate: number;
  }[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

export default function LoanEligibilityCheck({
  eligibilityData,
  selectedGroup,
  requestedLoanAmount,
  onGroupSelect,
  onContinue,
  groups,
}: LoanEligibilityCheckProps) {
  const contributionBalance = Number(
    eligibilityData.contributionBalance ??
      eligibilityData.totalContributions ??
      eligibilityData.savingsBalance ??
      0,
  );
  const requiredContributionBalance = Math.max(
    0,
    Number(requestedLoanAmount || 0) * 0.1,
  );
  const maxLoanAmount = contributionBalance * 10;

  const eligibilityCriteria: EligibilityCriteria[] = [
    {
      name: "Contribution Balance Coverage",
      description:
        "Member must have a contribution balance that is at least 10% of the amount requested. Pending withdrawals do not count.",
      met:
        requiredContributionBalance > 0
          ? contributionBalance >= requiredContributionBalance
          : contributionBalance > 0,
      value: formatCurrency(contributionBalance),
      required:
        requiredContributionBalance > 0
          ? formatCurrency(requiredContributionBalance)
          : "10% of request",
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

  const allCriteriaMet = eligibilityCriteria.every((criteria) => criteria.met);
  const metCount = eligibilityCriteria.filter((criteria) => criteria.met).length;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl p-6 ${
          allCriteriaMet
            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
            : "bg-gradient-to-r from-amber-500 to-orange-500"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/20 p-3">
            {allCriteriaMet ? (
              <CheckCircle className="h-8 w-8 text-white" />
            ) : (
              <AlertCircle className="h-8 w-8 text-white" />
            )}
          </div>
          <div className="flex-1 text-white">
            <h3 className="mb-1 text-xl font-bold">
              {allCriteriaMet
                ? "You Are Eligible for a Loan!"
                : "Eligibility Requirements Not Met"}
            </h3>
            <p className="text-white/90">
              {allCriteriaMet
                ? `You meet all ${metCount} eligibility criteria. Based on your contribution balance, you can request up to ${formatCurrency(maxLoanAmount)}.`
                : `You meet ${metCount} of ${eligibilityCriteria.length} criteria. Please review the requirements below.`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Contribution Balance</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(contributionBalance)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Credit Score</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {eligibilityData.creditScore}
          </p>
          <p className="text-xs font-medium text-emerald-600">
            {eligibilityData.creditScore >= 800
              ? "Excellent"
              : eligibilityData.creditScore >= 700
                ? "Good"
                : "Fair"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Member Since</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {eligibilityData.membershipDuration} months
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">Groups Joined</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {eligibilityData.groupsJoined}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Eligibility Criteria
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You must meet all criteria to apply for a loan
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {eligibilityCriteria.map((criteria) => (
            <div
              key={criteria.name}
              className={`flex items-center gap-4 p-4 ${
                criteria.met ? "bg-white" : "bg-red-50/50"
              }`}
            >
              <div
                className={`rounded-full p-2 ${
                  criteria.met ? "bg-emerald-100" : "bg-red-100"
                }`}
              >
                {criteria.met ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{criteria.name}</h4>
                <p className="text-sm text-gray-500">{criteria.description}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    criteria.met ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {criteria.value}
                </p>
                <p className="text-xs text-gray-500">
                  Required: {criteria.required}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {allCriteriaMet && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Select Group for Loan
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Choose which group you want to apply for a loan from.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => onGroupSelect(group.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedGroup === group.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  {selectedGroup === group.id && (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    Max:{" "}
                    <span className="font-medium text-gray-900">
                      {formatCurrency(group.maxLoanAmount)}
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

      {allCriteriaMet && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="mb-1 font-semibold text-gray-900">
                Contribution-Based Loan Capacity
              </h4>
              <p className="mb-2 text-3xl font-bold text-blue-600">
                {formatCurrency(maxLoanAmount)}
              </p>
              <p className="text-sm text-gray-600">
                With an available contribution balance of{" "}
                {formatCurrency(contributionBalance)}, you can request up to
                10x that balance. Pending withdrawals are excluded from this
                computation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Rules & Regulations
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Please note these contribution requirements before proceeding.
        </p>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Contribution balance used for loan eligibility excludes any pending,
            approved, or processing withdrawals.
          </p>
          <p>
            No delay or default is allowed in contributions or loan repayments.
          </p>
          <p>All transactions and forms must go through Group Leaders.</p>
          <p>
            General loans are expected to be repaid by October, bridging loans
            by January.
          </p>
        </div>
        {eligibilityData.contributionWindow && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-3">
            <p className="text-sm text-gray-700">
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!allCriteriaMet || !selectedGroup}
          className={`rounded-xl px-8 py-3 font-semibold transition-all ${
            allCriteriaMet && selectedGroup
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
              : "cursor-not-allowed bg-gray-200 text-gray-500"
          }`}
        >
          Continue to Loan Amount
        </button>
      </div>
    </div>
  );
}
