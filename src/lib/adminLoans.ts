import axios from "axios";
import { api, getApiErrorMessage } from "@/lib/api/client";

export type AdminLoanDocument = {
  documentType?: string | null;
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

export type AdminManualLoanDisbursement = {
  status?: "pending_otp" | "completed" | null;
  method?:
    | "cash"
    | "bank_transfer"
    | "bank_settlement"
    | "cheque"
    | "pos"
    | "other"
    | null;
  amount?: number | null;
  externalReference?: string | null;
  occurredAt?: string | null;
  repaymentStartDate?: string | null;
  notes?: string | null;
  initiatedAt?: string | null;
  completedAt?: string | null;
  otpChannel?: "phone" | "email" | null;
  otpRecipient?: string | null;
  otpBackupChannels?: Array<"phone" | "email">;
  otpSentAt?: string | null;
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
  manualDisbursement?: AdminManualLoanDisbursement | null;
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
  nextPaymentDueDate?: string | null;
  nextPaymentAmount?: number | null;
  nextPaymentStatus?: "pending" | "overdue" | null;
  applicant?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type AdminLoanTrackerItem = {
  _id: string;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  loanCode?: string | null;
  loanType?: string | null;
  loanStatus: "disbursed" | "defaulted" | "completed";
  trackerStatus: "active" | "overdue" | "completed";
  approvedAmount: number;
  totalRepayable: number;
  remainingBalance: number;
  repaidSoFar: number;
  interestRate: number;
  interestRateType?: "annual" | "monthly" | "total" | null;
  repaymentPeriod: number;
  monthlyPayment: number;
  disbursedAt?: string | null;
  repaymentStartDate?: string | null;
  nextPaymentDueDate?: string | null;
  nextPaymentAmount: number;
  nextPaymentStatus?: "pending" | "overdue" | null;
  nextInstallmentNumber?: number | null;
  overdueInstallments: number;
  paidInstallments: number;
  totalInstallments: number;
  lastPaidAt?: string | null;
};

export type AdminLoanTrackerSummary = {
  activeLoans: number;
  completedLoans: number;
  overdueLoans: number;
  defaultedLoans: number;
  totalOutstanding: number;
  totalRepaid: number;
  totalNextDue: number;
};

export type AdminLoanRepaymentReceipt = {
  name: string;
  type: string;
  size: number;
  status: string;
  url: string;
  publicId?: string | null;
  resourceType?: string | null;
  format?: string | null;
};

export type AdminLoanRepaymentAllocation = {
  scheduleItemId: string;
  installmentNumber: number;
  dueDate?: string | null;
  appliedAmount: number;
  remainingInstallmentBalance: number;
};

export type AdminLoanRepaymentHistoryItem = {
  id: string;
  reference: string;
  amount: number;
  status: "success" | "pending" | "failed";
  description?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  channel?: string | null;
  gateway?: string | null;
  manual: boolean;
  receipt?: AdminLoanRepaymentReceipt | null;
  recordedAt?: string | null;
  receivedAt?: string | null;
  recordedBy?: {
    id?: string | null;
    name: string;
    email?: string | null;
  } | null;
  allocations: AdminLoanRepaymentAllocation[];
  settledInstallmentCount: number;
  remainingBalanceAfterPayment?: number | null;
  notes?: string | null;
};

export type AdminLoanRepaymentHistorySummary = {
  totalRepayments: number;
  totalCollected: number;
  lastRepaymentAt?: string | null;
  settledInstallments: number;
  totalInstallments: number;
  overdueInstallments: number;
  remainingBalance: number;
  repaidSoFar: number;
  nextPaymentAmount: number;
  nextPaymentDueDate?: string | null;
  nextPaymentStatus?: "pending" | "overdue" | null;
};

export type AdminLoanRepaymentHistoryLoan = {
  id: string;
  loanCode?: string | null;
  loanType?: string | null;
  loanStatus: AdminLoanApplication["status"];
  borrowerName: string;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
  groupName?: string | null;
  approvedAmount: number;
  totalRepayable: number;
  remainingBalance: number;
  repaidSoFar: number;
  disbursedAt?: string | null;
  repaymentStartDate?: string | null;
  nextPaymentAmount: number;
  nextPaymentDueDate?: string | null;
  nextPaymentStatus?: "pending" | "overdue" | null;
};

export type AdminManualLoanRepaymentResponse = {
  transaction: unknown;
  application: AdminLoanApplication;
  allocations: AdminLoanRepaymentAllocation[];
  nextPayment?: {
    scheduleItemId: string;
    installmentNumber: number;
    dueDate: string;
    status: "pending" | "overdue";
    amountDue: number;
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

export async function initiateAdminManualLoanDisbursement(
  applicationId: string,
  payload: {
    method:
      | "cash"
      | "bank_transfer"
      | "bank_settlement"
      | "cheque"
      | "pos"
      | "other";
    occurredAt?: string | null;
    externalReference?: string | null;
    notes?: string | null;
    repaymentStartDate?: string | null;
    bankAccountId?: string | null;
  },
) {
  try {
    const res = await api.post(
      `/admin/loans/applications/${applicationId}/manual-disbursement`,
      {
        method: payload.method,
        occurredAt: payload.occurredAt ?? null,
        externalReference: payload.externalReference ?? null,
        notes: payload.notes ?? null,
        repaymentStartDate: payload.repaymentStartDate ?? null,
        bankAccountId: payload.bankAccountId ?? null,
      },
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function finalizeAdminManualLoanDisbursement(
  applicationId: string,
  payload: { otp: string; repaymentStartDate?: string | null },
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/manual-disbursement/finalize`,
      {
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

export async function resendAdminManualLoanDisbursementOtp(
  applicationId: string,
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/manual-disbursement/resend-otp`,
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

export async function cancelAdminManualLoanDisbursement(
  applicationId: string,
) {
  try {
    const res = await api.patch(
      `/admin/loans/applications/${applicationId}/manual-disbursement/cancel`,
    );
    return res.data?.data?.application as AdminLoanApplication;
  } catch (err) {
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

export async function listAdminLoanTracker(
  params: {
    status?: "all" | "active" | "overdue" | "completed";
    search?: string;
    groupId?: string;
    loanType?: string;
    year?: number | string;
    month?: number | string;
  } = {},
): Promise<{ loans: AdminLoanTrackerItem[]; summary: AdminLoanTrackerSummary }> {
  const apiParams =
    !params.status || params.status === "all"
      ? { ...params, status: undefined }
      : params;

  try {
    const res = await api.get("/admin/loans/tracker", { params: apiParams });
    return {
      loans: (res.data?.data?.loans ?? []) as AdminLoanTrackerItem[],
      summary: (res.data?.data?.summary ?? {
        activeLoans: 0,
        completedLoans: 0,
        overdueLoans: 0,
        defaultedLoans: 0,
        totalOutstanding: 0,
        totalRepaid: 0,
        totalNextDue: 0,
      }) as AdminLoanTrackerSummary,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listAdminLoanRepaymentHistory(
  applicationId: string,
): Promise<{
  loan: AdminLoanRepaymentHistoryLoan;
  summary: AdminLoanRepaymentHistorySummary;
  repayments: AdminLoanRepaymentHistoryItem[];
}> {
  try {
    const res = await api.get(
      `/admin/loans/applications/${applicationId}/repayments`,
    );
    return {
      loan: res.data?.data?.loan as AdminLoanRepaymentHistoryLoan,
      summary: res.data?.data?.summary as AdminLoanRepaymentHistorySummary,
      repayments: (res.data?.data?.repayments ?? []) as AdminLoanRepaymentHistoryItem[],
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function downloadAdminLoanRepaymentReceiptPdf(
  applicationId: string,
  repaymentId: string,
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get(
      `/admin/loans/applications/${applicationId}/repayments/${repaymentId}/receipt/pdf`,
      { responseType: "blob" },
    );
    const mimeType =
      (res.headers?.["content-type"] as string) || "application/pdf";
    return {
      blob: new Blob([res.data], { type: mimeType }),
      filename:
        extractFilename(res.headers?.["content-disposition"]) ||
        `loan-repayment-receipt-${repaymentId}.pdf`,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function emailAdminLoanRepaymentReceipt(
  applicationId: string,
  repaymentId: string,
  payload: { emails: string[] },
): Promise<{ ok: boolean; recipients: string[] }> {
  try {
    const res = await api.post(
      `/admin/loans/applications/${applicationId}/repayments/${repaymentId}/receipt/email`,
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

export async function exportAdminLoanRepaymentHistory(
  applicationId: string,
  format: "csv" | "pdf",
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get(
      `/admin/loans/applications/${applicationId}/repayments/export`,
      {
        params: { format },
        responseType: "blob",
      },
    );
    return {
      blob: new Blob([res.data], {
        type:
          (res.headers?.["content-type"] as string) ||
          (format === "pdf" ? "application/pdf" : "text/csv"),
      }),
      filename:
        extractFilename(res.headers?.["content-disposition"]) ||
        `loan-repayment-history-${applicationId}.${format}`,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function uploadAdminLoanRepaymentReceipt(
  file: File,
  opts?: { onProgress?: (percent: number) => void },
): Promise<AdminLoanRepaymentReceipt> {
  try {
    const formData = new FormData();
    formData.append("receipt", file);
    const res = await api.post("/admin/loans/repayment-receipts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!opts?.onProgress) return;
        const total = event.total ?? 0;
        if (!total) return;
        const pct = Math.min(100, Math.round((event.loaded / total) * 100));
        opts.onProgress(pct);
      },
    });
    return res.data?.data?.receipt as AdminLoanRepaymentReceipt;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function recordAdminLoanManualRepayment(
  applicationId: string,
  payload: {
    amount: number;
    paymentMethod: string;
    paymentReference?: string | null;
    receivedAt?: string | null;
    notes?: string | null;
    receipt?: AdminLoanRepaymentReceipt | null;
  },
): Promise<AdminManualLoanRepaymentResponse> {
  try {
    const res = await api.post(
      `/admin/loans/applications/${applicationId}/manual-repayment`,
      {
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        paymentReference: payload.paymentReference ?? null,
        receivedAt: payload.receivedAt ?? null,
        notes: payload.notes ?? null,
        receipt: payload.receipt ?? null,
      },
    );
    return res.data?.data as AdminManualLoanRepaymentResponse;
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

function extractFilename(value: unknown): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const match = /filename="?([^"]+)"?/i.exec(String(raw));
  return match?.[1] || null;
}
