import { api, getApiErrorMessage } from "@/lib/api/client";

export type CreditFactorStatus = "excellent" | "good" | "fair" | "poor";
export type CreditFactorImpact = "positive" | "neutral" | "negative";

export type CreditScoreFactor = {
  score: number;
  maxScore: number;
  percentage: number;
  status: CreditFactorStatus;
  details: Array<{ name: string; value: string; impact: CreditFactorImpact }>;
};

export type CreditScoreData = {
  totalScore: number;
  maxScore: number;
  minScore: number;
  lastUpdated: string;
  scoreChange: number;
  scoreChangeDirection: "up" | "down";
  factors: {
    contribution: CreditScoreFactor;
    repayment: CreditScoreFactor;
    attendance: CreditScoreFactor;
    participation: CreditScoreFactor;
    tenure: CreditScoreFactor;
  };
  history: Array<{ date: string; score: number }>;
  loanImpact: {
    currentRate: number;
    potentialRate: number;
    maxLoanMultiplier: number;
    potentialMultiplier: number;
  };
};

export async function getMyCreditScore(params: { historyMonths?: number } = {}) {
  try {
    const res = await api.get("/credit-scores/me", { params });
    return res.data?.data as CreditScoreData;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

