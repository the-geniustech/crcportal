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

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await api.get("/dashboard/summary");
    return (res.data?.data ?? {}) as DashboardSummary;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
