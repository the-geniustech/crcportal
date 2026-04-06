import { api, getApiErrorMessage } from "./api/client";

export type DashboardSummary = {
  totalContributions: number;
  activeLoanOutstanding: number;
  nextPayment: {
    loanId: string;
    loanCode?: string | null;
    groupName?: string | null;
    dueDate: string;
    amount: number;
    status?: string | null;
  } | null;
};

export type ContributionTrendPoint = {
  year: number;
  month: number;
  label: string;
  amount: number;
};

export type ContributionTrendResponse = {
  trend: ContributionTrendPoint[];
  period?: { months: number; end: { year: number; month: number } };
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await api.get("/dashboard/summary");
    return (res.data?.data ?? {}) as DashboardSummary;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getContributionTrend(params: { months?: number } = {}): Promise<ContributionTrendResponse> {
  try {
    const res = await api.get("/dashboard/contribution-trend", { params });
    return (res.data?.data ?? {}) as ContributionTrendResponse;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
