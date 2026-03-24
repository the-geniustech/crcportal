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
  const P = Number(principal);
  const n = Math.max(1, Math.floor(months));
  const r = Math.max(0, Number(rate) || 0);
  const schedule: LoanScheduleEntry[] = [];

  if (rateType === "total") {
    const totalInterest = roundMoney(P * (r / 100));
    const basePayment = (P + totalInterest) / n;
    let remainingPrincipal = P;
    let remainingInterest = totalInterest;

    for (let i = 1; i <= n; i += 1) {
      const interest =
        i === n ? remainingInterest : roundMoney(totalInterest / n);
      const principalPaid =
        i === n ? remainingPrincipal : roundMoney(basePayment - interest);
      const payment = principalPaid + interest;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalPaid);
      remainingInterest = Math.max(0, remainingInterest - interest);

      schedule.push({
        month: i,
        payment: roundMoney(payment),
        principal: roundMoney(principalPaid),
        interest: roundMoney(interest),
        balance: roundMoney(remainingPrincipal),
      });
    }

    return schedule;
  }

  const monthlyRate = rateType === "monthly" ? r / 100 : r / 100 / 12;
  const payment =
    monthlyRate === 0
      ? P / n
      : (P * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1);

  let balance = P;

  for (let i = 1; i <= n; i += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    let principalPaid = payment - interest;
    if (i === n) principalPaid = balance;
    const total = principalPaid + interest;
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month: i,
      payment: roundMoney(total),
      principal: roundMoney(principalPaid),
      interest: roundMoney(interest),
      balance: roundMoney(balance),
    });
  }

  return schedule;
}
