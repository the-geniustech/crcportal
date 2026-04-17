import axios from "axios";
import { api, getApiErrorMessage } from "./api/client";

export type BackendSavingsSummary = {
  ledgerBalance: number;
  availableBalance: number;
  reservedBalance: number;
  monthlyDeposits: number;
  interestEarned: number;
  annualInterestRatePct: number;
};

export async function getMySavingsSummary(): Promise<BackendSavingsSummary> {
  try {
    const res = await api.get("/savings/me/summary");
    return res.data?.data as BackendSavingsSummary;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendWithdrawalBalance = {
  ledgerBalance: number;
  availableBalance: number;
  reservedBalance: number;
  totalContributions?: number;
  totalWithdrawals?: number;
  totalInterest?: number;
  groupId?: string | null;
  contributionType?: string | null;
};

export async function getMyWithdrawalBalance(params: {
  groupId?: string | null;
  contributionType?: string | null;
} = {}): Promise<BackendWithdrawalBalance> {
  try {
    const res = await api.get("/withdrawals/me/balance", { params });
    return res.data?.data as BackendWithdrawalBalance;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendTransaction = {
  _id: string;
  reference: string;
  amount: number;
  type: "deposit" | "loan_repayment" | "group_contribution" | "withdrawal" | "interest";
  status: "success" | "pending" | "failed";
  description: string;
  date: string;
  updatedAt?: string;
  channel?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  loanId?: string | null;
  loanName?: string | null;
  gateway?: string | null;
  metadata?: unknown;
};

export async function listMyTransactions(params: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
} = {}): Promise<{
  transactions: BackendTransaction[];
  total?: number;
  page?: number;
  limit?: number;
}> {
  try {
    const res = await api.get("/transactions/me", { params });
    return {
      transactions: (res.data?.data?.transactions ?? []) as BackendTransaction[],
      total: res.data?.total,
      page: res.data?.page,
      limit: res.data?.limit,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function emailMyTransactionReceipt(
  transactionId: string,
  emails: string[] | string,
) {
  try {
    const payload = Array.isArray(emails) ? { emails } : { email: emails };
    const res = await api.post(`/transactions/me/${transactionId}/receipt`, payload);
    return Boolean(res.data?.data?.ok ?? true);
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendPaymentReminder = {
  id: string;
  type: "loan_repayment" | "group_contribution";
  title: string;
  amount: number;
  dueDate: string;
  groupId?: string | null;
  groupName?: string | null;
  loanId?: string | null;
  loanName?: string | null;
  contributionType?: string | null;
  isOverdue: boolean;
  daysUntilDue: number;
};

export type BackendPaymentReminderSummary = {
  overdueCount: number;
  upcomingCount: number;
  totalDue: number;
};

export async function listMyPaymentReminders(params: { windowDays?: number } = {}): Promise<{
  reminders: BackendPaymentReminder[];
  summary: BackendPaymentReminderSummary;
}> {
  try {
    const res = await api.get("/payment-reminders/me", { params });
    return {
      reminders: (res.data?.data?.reminders ?? []) as BackendPaymentReminder[],
      summary: (res.data?.data?.summary ?? {
        overdueCount: 0,
        upcomingCount: 0,
        totalDue: 0,
      }) as BackendPaymentReminderSummary,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function downloadMyTransactionReceiptPdf(transactionId: string): Promise<Blob> {
  try {
    const res = await api.get(`/transactions/me/${transactionId}/receipt/pdf`, {
      responseType: "blob",
    });
    return res.data as Blob;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function downloadMyStatement(params: {
  format: "pdf" | "csv";
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get("/transactions/me/statement", {
      params,
      responseType: "blob",
    });
    const filename =
      extractFilename(res.headers?.["content-disposition"]) ||
      `statement.${params.format}`;
    return { blob: res.data as Blob, filename };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

function extractFilename(value: unknown): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const match = /filename="?([^"]+)"?/i.exec(String(raw));
  return match?.[1] || null;
}

export type BackendWithdrawalRequest = {
  _id: string;
  userId: string;
  amount: number;
  bankAccountId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  contributionType?: string | null;
  bankName: string;
  bankCode?: string | null;
  accountNumber: string;
  accountName: string;
  reason?: string | null;
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  adminNotes?: string | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  payoutReference?: string | null;
  payoutGateway?: string | null;
  payoutTransferCode?: string | null;
  payoutStatus?: string | null;
  payoutOtpResentAt?: string | null;
  payoutEvents?: Array<{
    eventType: string;
    gateway?: string | null;
    status?: string | null;
    reference?: string | null;
    transferCode?: string | null;
    message?: string | null;
    actorUserId?: string | null;
    actorProfileId?: string | null;
    occurredAt?: string | null;
    metadata?: unknown;
  }>;
  manualPayout?: {
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
    notes?: string | null;
    previousStatus?: string | null;
    initiatedAt?: string | null;
    completedAt?: string | null;
    otpChannel?: "phone" | "email" | null;
    otpRecipient?: string | null;
    otpSentAt?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendWithdrawalListResponse = {
  withdrawals: BackendWithdrawalRequest[];
  otpResendCooldownSeconds: number;
};

export async function listMyWithdrawals(): Promise<BackendWithdrawalRequest[]> {
  try {
    const res = await api.get("/withdrawals/me");
    return (res.data?.data?.withdrawals ?? []) as BackendWithdrawalRequest[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createWithdrawalRequest(input: {
  amount: number;
  bankAccountId: string;
  contributionType: string;
  groupId?: string | null;
  reason?: string | null;
}): Promise<BackendWithdrawalRequest> {
  try {
    const res = await api.post("/withdrawals/me", input);
    return res.data?.data?.withdrawal as BackendWithdrawalRequest;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listWithdrawals(
  params: { status?: string; userId?: string } = {},
): Promise<BackendWithdrawalListResponse> {
  try {
    const res = await api.get("/withdrawals", { params });
    return {
      withdrawals: (res.data?.data?.withdrawals ?? []) as BackendWithdrawalRequest[],
      otpResendCooldownSeconds: Math.max(
        0,
        Number(res.data?.data?.otpResendCooldownSeconds) || 0,
      ),
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function approveWithdrawal(id: string, input: { adminNotes?: string | null } = {}) {
  try {
    const res = await api.patch(`/withdrawals/${id}/approve`, input);
    return res.data?.data?.withdrawal as BackendWithdrawalRequest;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function rejectWithdrawal(
  id: string,
  input: { rejectionReason: string; adminNotes?: string | null },
) {
  try {
    const res = await api.patch(`/withdrawals/${id}/reject`, input);
    return res.data?.data?.withdrawal as BackendWithdrawalRequest;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function markWithdrawalProcessing(id: string) {
  try {
    const res = await api.patch(`/withdrawals/${id}/processing`);
    return res.data?.data?.withdrawal as BackendWithdrawalRequest;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function completeWithdrawal(id: string, input: { reference?: string; gateway?: string } = {}) {
  try {
    const res = await api.patch(`/withdrawals/${id}/complete`, input);
    return res.data?.data as { withdrawal: BackendWithdrawalRequest; transaction: BackendTransaction };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function finalizeWithdrawalOtp(
  id: string,
  input: { transferCode: string; otp: string },
) {
  try {
    const res = await api.patch(`/withdrawals/${id}/finalize-otp`, {
      transferCode: input.transferCode,
      otp: input.otp,
    });
    return res.data?.data as { withdrawal: BackendWithdrawalRequest; transaction?: BackendTransaction };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function resendWithdrawalOtp(
  id: string,
  input: { transferCode: string; reason?: string },
) {
  try {
    const res = await api.patch(`/withdrawals/${id}/resend-otp`, {
      transferCode: input.transferCode,
      reason: input.reason,
    });
    const retryAfter = parseRetryAfterSeconds(res.headers?.["retry-after"]);
    return {
      withdrawal: res.data?.data?.withdrawal as BackendWithdrawalRequest,
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

export async function verifyWithdrawalTransfer(id: string) {
  try {
    const res = await api.patch(`/withdrawals/${id}/verify-transfer`);
    return res.data?.data as {
      withdrawal: BackendWithdrawalRequest;
      transaction?: BackendTransaction;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function initiateManualWithdrawalPayout(
  id: string,
  input: {
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
  },
) {
  try {
    const res = await api.patch(`/withdrawals/${id}/initiate-manual-payout`, {
      method: input.method,
      occurredAt: input.occurredAt,
      externalReference: input.externalReference,
      notes: input.notes,
    });
    return res.data?.data as { withdrawal: BackendWithdrawalRequest };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function finalizeManualWithdrawalPayout(
  id: string,
  input: { otp: string },
) {
  try {
    const res = await api.patch(`/withdrawals/${id}/finalize-manual-otp`, {
      otp: input.otp,
    });
    return res.data?.data as {
      withdrawal: BackendWithdrawalRequest;
      transaction?: BackendTransaction;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function resendManualWithdrawalPayoutOtp(id: string) {
  try {
    const res = await api.patch(`/withdrawals/${id}/resend-manual-otp`);
    const retryAfter = parseRetryAfterSeconds(res.headers?.["retry-after"]);
    return {
      withdrawal: res.data?.data?.withdrawal as BackendWithdrawalRequest,
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

export async function cancelManualWithdrawalPayout(id: string) {
  try {
    const res = await api.patch(`/withdrawals/${id}/cancel-manual-otp`);
    return res.data?.data?.withdrawal as BackendWithdrawalRequest;
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

export type BackendBankAccount = {
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

export async function listMyBankAccounts(): Promise<BackendBankAccount[]> {
  try {
    const res = await api.get("/bank-accounts/me");
    return (res.data?.data?.accounts ?? []) as BackendBankAccount[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type PaystackBank = {
  name: string;
  code: string;
  slug?: string;
  active?: boolean;
  is_deleted?: boolean;
  country?: string;
  currency?: string;
  type?: string;
};

export async function listPaystackBanks(params: { country?: string } = {}): Promise<PaystackBank[]> {
  try {
    const res = await api.get("/bank-accounts/banks", { params });
    return (res.data?.data?.banks ?? []) as PaystackBank[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createMyBankAccount(input: {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPrimary?: boolean;
}): Promise<BackendBankAccount> {
  try {
    const res = await api.post("/bank-accounts/me", input);
    return res.data?.data?.account as BackendBankAccount;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateMyBankAccount(id: string, input: Partial<BackendBankAccount>) {
  try {
    const res = await api.patch(`/bank-accounts/me/${id}`, input);
    return res.data?.data?.account as BackendBankAccount;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteMyBankAccount(id: string) {
  try {
    await api.delete(`/bank-accounts/me/${id}`);
    return true;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendRecurringPayment = {
  _id: string;
  paymentType: "deposit" | "loan_repayment" | "group_contribution";
  amount: number;
  contributionType?: string | null;
  frequency: "weekly" | "bi-weekly" | "monthly";
  startDate: string;
  nextPaymentDate: string;
  endDate?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  loanId?: string | null;
  loanName?: string | null;
  description?: string | null;
  isActive: boolean;
  totalPaymentsMade: number;
  totalAmountPaid: number;
  lastPaymentDate?: string | null;
  lastPaymentStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listMyRecurringPayments(): Promise<BackendRecurringPayment[]> {
  try {
    const res = await api.get("/recurring-payments/me");
    return (res.data?.data?.payments ?? []) as BackendRecurringPayment[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createRecurringPayment(input: Partial<BackendRecurringPayment>) {
  try {
    const res = await api.post("/recurring-payments/me", input);
    return res.data?.data?.payment as BackendRecurringPayment;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateRecurringPayment(id: string, input: Partial<BackendRecurringPayment>) {
  try {
    const res = await api.patch(`/recurring-payments/me/${id}`, input);
    return res.data?.data?.payment as BackendRecurringPayment;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteRecurringPayment(id: string) {
  try {
    await api.delete(`/recurring-payments/me/${id}`);
    return true;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createDeposit(input: {
  amount: number;
  reference?: string;
  channel?: string | null;
  description?: string | null;
  gateway?: string | null;
  metadata?: unknown;
}) {
  try {
    const res = await api.post("/savings/deposits", input);
    return res.data?.data?.transaction as BackendTransaction;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function verifyMyDeposit(reference: string) {
  try {
    const res = await api.post("/savings/deposits/verify", { reference });
    return res.data?.data?.transaction as BackendTransaction;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
