import { api, getApiErrorMessage } from "@/lib/api/client";

export type AdminLoanApplication = {
  _id: string;
  userId: string;
  groupId?: string | null;
  groupName?: string | null;
  loanAmount: number;
  loanPurpose: string;
  repaymentPeriod: number;
  monthlyIncome?: number | null;
  guarantors?: Array<{ name: string; phone?: string }>;
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "rejected"
    | "disbursed"
    | "completed"
    | "defaulted"
    | "cancelled";
  createdAt: string;
  reviewNotes?: string | null;
  applicant?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export async function listAdminLoanApplications(params: { status?: string; search?: string } = {}) {
  const apiParams =
    params.status === "all" ? { search: params.search } : params;

  try {
    const res = await api.get("/admin/loans/applications", { params: apiParams });
    return (res.data?.data?.applications ?? []) as AdminLoanApplication[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function reviewAdminLoanApplication(
  applicationId: string,
  payload: { status: "under_review" | "approved" | "rejected"; reviewNotes?: string },
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/review`,
      payload,
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function disburseAdminLoanApplication(
  applicationId: string,
  payload?: { repaymentStartDate?: string | null },
) {
  try {
    const res = await api.post(
      `/admin/loans/applications/${applicationId}/disburse`,
      payload ?? {},
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
