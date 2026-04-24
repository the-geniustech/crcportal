import type { LoanInterestRateType } from "./loanPolicy";

export type LoanSummary = {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
};

export type LoanScheduleEntry = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

function roundMoney(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function getMonthlyRate(
  rate: number,
  rateType: LoanInterestRateType,
  months: number,
) {
  const normalizedMonths = Math.max(1, Math.floor(months));
  if (rateType === "monthly") return rate / 100;
  if (rateType === "total") return rate / 100 / normalizedMonths;
  return rate / 100 / 12;
}

export function calculateLoanSummary({
  principal,
  rate,
  rateType,
  months,
}: {
  principal: number;
  rate: number;
  rateType: LoanInterestRateType;
  months: number;
}): LoanSummary {
  const schedule = buildAmortizationSchedule({
    principal,
    rate,
    rateType,
    months,
  });

  const totalPayment = schedule.reduce((sum, s) => sum + s.payment, 0);
  const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);
  const monthlyPayment = schedule[0]?.payment ?? 0;

  return {
    monthlyPayment,
    totalInterest,
    totalPayment,
  };
}

export function buildAmortizationSchedule({
  principal,
  rate,
  rateType,
  months,
}: {
  principal: number;
  rate: number;
  rateType: LoanInterestRateType;
  months: number;
}): LoanScheduleEntry[] {
  const P = Math.max(0, Number(principal) || 0);
  const n = Math.max(1, Math.floor(months));
  const r = Math.max(0, Number(rate) || 0);
  const schedule: LoanScheduleEntry[] = [];

  const monthlyRate = getMonthlyRate(r, rateType, n);
  let balance = P;

  for (let i = 1; i <= n; i += 1) {
    const cyclesRemaining = Math.max(1, n - i + 1);
    const openingBalance = balance;
    const interest = roundMoney(openingBalance * monthlyRate);
    const principalPaid =
      i === n
        ? roundMoney(openingBalance)
        : roundMoney(openingBalance / cyclesRemaining);
    const total = roundMoney(principalPaid + interest);
    balance = Math.max(0, roundMoney(balance - principalPaid));

    schedule.push({
      month: i,
      payment: total,
      principal: principalPaid,
      interest,
      balance: roundMoney(balance),
    });
  }

  return schedule;
}
