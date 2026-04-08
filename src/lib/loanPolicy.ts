export type LoanFacilityKey = "revolving" | "special" | "bridging" | "soft";
export type LoanInterestRateType = "annual" | "monthly" | "total";

export type LoanFacility = {
  key: LoanFacilityKey;
  name: string;
  description: string;
  interestRateType: LoanInterestRateType;
  interestRate?: number;
  interestRateRange?: { min: number; max: number };
  availabilityMonths?: number[];
  availabilityLabel?: string;
  termMonths?: number;
  maxAmountRule?: "contributions";
  qualificationNote?: string;
};

export const LOAN_POLICY = {
  contributionWindow: { startDay: 1, endDay: 31 },
  repaymentDeadlines: { generalMonth: 10, bridgingMonth: 1 },
  transactionsViaGroupLeaders: true,
};

export const LOAN_FACILITIES: LoanFacility[] = [
  {
    key: "revolving",
    name: "Revolving Loan",
    description: "Up to your total contribution balance",
    interestRate: 3.5,
    interestRateType: "monthly",
    maxAmountRule: "contributions",
  },
  {
    key: "special",
    name: "Special Loan",
    description: "Available for qualified members",
    interestRate: 3.5,
    interestRateType: "monthly",
    qualificationNote: "Subject to management discretion",
  },
  {
    key: "bridging",
    name: "Bridging Loan",
    description: "Short term support for year-end needs",
    interestRateType: "monthly",
    interestRateRange: { min: 4, max: 10 },
    availabilityMonths: [10, 11, 12],
    availabilityLabel: "Oct-Dec",
  },
  {
    key: "soft",
    name: "Soft Loan",
    description: "Fixed total interest, repayable over 10 months",
    interestRate: 25,
    interestRateType: "total",
    availabilityMonths: [11, 12],
    availabilityLabel: "Nov-Dec",
    termMonths: 10,
  },
];

export const DEFAULT_TERMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const BRIDGING_TERMS = [1, 2, 3];
export const SOFT_TERMS = [10];

export function getLoanFacility(key: LoanFacilityKey | string | null | undefined) {
  const match = LOAN_FACILITIES.find((f) => f.key === key);
  return match || null;
}

export function isLoanFacilityAvailable(
  key: LoanFacilityKey | string | null | undefined,
  date = new Date(),
) {
  const facility = getLoanFacility(key || "");
  if (!facility) return false;
  if (!facility.availabilityMonths || facility.availabilityMonths.length === 0) {
    return true;
  }
  const month = date.getMonth() + 1;
  return facility.availabilityMonths.includes(month);
}

export function formatInterestLabel(
  rate: number | null | undefined,
  rateType: LoanInterestRateType,
  range?: { min: number; max: number },
) {
  if (range) {
    const label = rateType === "monthly" ? "monthly" : rateType;
    return `${range.min}-${range.max}% ${label}`;
  }

  const safeRate = Number(rate || 0);
  if (rateType === "total") return `${safeRate}% total`;
  if (rateType === "monthly") return `${safeRate}% monthly`;
  return `${safeRate}% annual`;
}

export function getRepaymentDeadline(
  loanType: LoanFacilityKey,
  startDate: Date,
) {
  if (loanType === "bridging") {
    return new Date(startDate.getFullYear() + 1, 0, 31, 23, 59, 59, 999);
  }
  return new Date(startDate.getFullYear(), 9, 31, 23, 59, 59, 999);
}

function monthsBetweenInclusive(startDate: Date, endDate: Date) {
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1
  );
}

export function getLoanTermOptions(
  loanType: LoanFacilityKey,
  startDate: Date,
) {
  if (loanType === "soft") return [...SOFT_TERMS];

  const baseTerms = loanType === "bridging" ? BRIDGING_TERMS : DEFAULT_TERMS;
  const deadline = getRepaymentDeadline(loanType, startDate);
  const maxTerm = monthsBetweenInclusive(startDate, deadline);

  if (maxTerm <= 0) return [];
  return baseTerms.filter((term) => term <= maxTerm);
}
