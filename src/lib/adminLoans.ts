import axios from "axios";
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
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    signedAt?: string | null;
  } | null;
};

export type LoanEditChange = {
  field: string;
  label: string;
  from?: string | number | null;
  to?: string | number | null;
};

export type LoanEditRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  changes?: LoanEditChange[];
  documents?: AdminLoanDocument[];
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
  disbursementBankAccountId?: string | null;
  disbursementBankName?: string | null;
  disbursementBankCode?: string | null;
  disbursementAccountNumber?: string | null;
  disbursementAccountName?: string | null;
  payoutReference?: string | null;
  payoutGateway?: string | null;
  payoutTransferCode?: string | null;
  payoutStatus?: string | null;
  payoutOtpResentAt?: string | null;
  guarantors?: AdminLoanGuarantor[];
  documents?: AdminLoanDocument[];
  latestEditRequest?: LoanEditRequest | null;
  status:
    | "draft"
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

export type AdminLoanListResponse = {
  applications: AdminLoanApplication[];
  otpResendCooldownSeconds: number;
  page: number;
  limit: number;
  total: number;
  summary?: {
    pendingCount: number;
    underReviewCount: number;
    approvedCount: number;
    totalRequested: number;
  };
};

export async function listAdminLoanApplications(
  params: {
    status?: string;
    search?: string;
    groupId?: string;
    year?: number | string;
    month?: number | string;
    page?: number;
    limit?: number;
  } = {},
): Promise<AdminLoanListResponse> {
  const { status, ...rest } = params;
  const apiParams = status === "all" || !status ? rest : params;

  try {
    const res = await api.get("/admin/loans/applications", { params: apiParams });
    return {
      applications: (res.data?.data?.applications ?? []) as AdminLoanApplication[],
      otpResendCooldownSeconds: Math.max(
        0,
        Number(res.data?.data?.otpResendCooldownSeconds) || 0,
      ),
      page: Number(res.data?.page ?? 1),
      limit: Number(res.data?.limit ?? 50),
      total: Number(res.data?.total ?? 0),
      summary: res.data?.data?.summary as AdminLoanListResponse["summary"],
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function exportAdminLoanApplications(params: {
  status?: string;
  search?: string;
  groupId?: string;
  year?: number | string;
  month?: number | string;
} = {}): Promise<Blob> {
  const { status, ...rest } = params;
  const apiParams = status === "all" || !status ? rest : params;

  try {
    const res = await api.get("/admin/loans/applications/export", {
      params: apiParams,
      responseType: "blob",
    });
    const mimeType = (res.headers?.["content-type"] as string) || "text/csv";
    return new Blob([res.data], { type: mimeType });
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function reconcileAdminLoanApplication(
  applicationId: string,
  payload?: { notes?: string },
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/reconcile`,
      payload ?? {},
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function reviewAdminLoanEditRequest(
  applicationId: string,
  requestId: string,
  payload: { status: "approved" | "rejected"; reviewNotes?: string },
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/edit-requests/${requestId}`,
      payload,
    );
    return {
      application: res.data?.data?.application as AdminLoanApplication,
      editRequest: res.data?.data?.editRequest as LoanEditRequest,
    };
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
  payload?: {
    repaymentStartDate?: string | null;
    reference?: string;
    gateway?: string;
    bankAccountId?: string | null;
  },
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

export async function finalizeAdminLoanDisbursementOtp(
  applicationId: string,
  payload: { transferCode: string; otp: string; repaymentStartDate?: string | null },
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/finalize-otp`,
      {
        transferCode: payload.transferCode,
        otp: payload.otp,
        repaymentStartDate: payload.repaymentStartDate ?? null,
      },
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function resendAdminLoanDisbursementOtp(
  applicationId: string,
  payload: { transferCode: string; reason?: string } = { transferCode: "" },
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/resend-otp`,
      {
        transferCode: payload.transferCode,
        reason: payload.reason,
      },
    );
    const retryAfter = parseRetryAfterSeconds(res.headers?.["retry-after"]);
    return {
      application: res.data?.data?.application as AdminLoanApplication,
      retryAfter,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const retryAfter = parseRetryAfterSeconds(
        err.response?.headers?.["retry-after"],
      );
      const wrapped = new Error(getApiErrorMessage(err)) as Error & {
        retryAfter?: number;
        status?: number;
      };
      if (retryAfter) wrapped.retryAfter = retryAfter;
      if (err.response?.status) wrapped.status = err.response.status;
      throw wrapped;
    }
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminLoanBankAccount = {
  _id: string;
  userId: string;
  bankName: string;
  bankCode?: string | null;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function listAdminLoanBankAccounts(
  applicationId: string,
): Promise<AdminLoanBankAccount[]> {
  try {
    const res = await api.get(
      `/admin/loans/applications/${applicationId}/bank-accounts`,
    );
    return (res.data?.data?.accounts ?? []) as AdminLoanBankAccount[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function verifyAdminLoanDisbursementTransfer(
  applicationId: string,
  payload: { repaymentStartDate?: string | null } = {},
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/verify-transfer`,
      { repaymentStartDate: payload.repaymentStartDate ?? null },
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

function parseRetryAfterSeconds(value: unknown): number | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return undefined;
  const rawText = String(raw).trim();
  if (!rawText) return undefined;
  const asNumber = Number(rawText);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.ceil(asNumber);
  }
  const parsedDate = Date.parse(rawText);
  if (Number.isFinite(parsedDate)) {
    const seconds = Math.ceil((parsedDate - Date.now()) / 1000);
    return seconds > 0 ? seconds : undefined;
  }
  return undefined;
}
