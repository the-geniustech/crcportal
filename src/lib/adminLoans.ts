import { api, getApiErrorMessage } from "@/lib/api/client";

export type AdminLoanDocument = {
  name: string;
  type: string;
  size: number;
  status: string;
  url?: string | null;
};

export type AdminLoanGuarantor = {
  type: "member" | "external";
  profileId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  occupation?: string | null;
  address?: string | null;
  memberSince?: string | null;
  savingsBalance?: number | null;
  liabilityPercentage?: number | null;
};

export type AdminLoanApplication = {
  _id: string;
  userId: string;
  groupId?: string | null;
  groupName?: string | null;
  loanCode?: string | null;
  loanNumber?: number | null;
  loanType?: string | null;
  loanAmount: number;
  loanPurpose: string;
  purposeDescription?: string | null;
  repaymentPeriod: number;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  approvedAmount?: number | null;
  approvedInterestRate?: number | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  repaymentStartDate?: string | null;
  monthlyPayment?: number | null;
  totalRepayable?: number | null;
  remainingBalance?: number | null;
  monthlyIncome?: number | null;
  guarantors?: AdminLoanGuarantor[];
  documents?: AdminLoanDocument[];
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

export async function downloadAdminLoanApplicationPdf(
  applicationId: string,
): Promise<Blob> {
  try {
    const res = await api.get(
      `/admin/loans/applications/${applicationId}/pdf`,
      { responseType: "blob" },
    );
    const mimeType =
      (res.headers?.["content-type"] as string) || "application/pdf";
    return new Blob([res.data], { type: mimeType });
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function emailAdminLoanApplicationPdf(
  applicationId: string,
  payload: {
    sendApplicant?: boolean;
    sendGuarantors?: boolean;
    extraEmails?: string[];
  } = {},
): Promise<{ ok: boolean; recipients: string[] }> {
  try {
    const res = await api.post(
      `/admin/loans/applications/${applicationId}/email`,
      payload,
    );
    return {
      ok: Boolean(res.data?.data?.ok ?? true),
      recipients: (res.data?.data?.recipients ?? []) as string[],
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function reviewAdminLoanApplication(
  applicationId: string,
  payload: {
    status: "under_review" | "approved" | "rejected";
    reviewNotes?: string;
    approvedAmount?: number | null;
    approvedInterestRate?: number | null;
  },
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
