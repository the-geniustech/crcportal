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

export type BackendWithdrawalRequest = {
  _id: string;
  userId: string;
  amount: number;
  bankAccountId?: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  reason?: string | null;
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  adminNotes?: string | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  reason?: string | null;
}): Promise<BackendWithdrawalRequest> {
  try {
    const res = await api.post("/withdrawals/me", input);
    return res.data?.data?.withdrawal as BackendWithdrawalRequest;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listWithdrawals(params: { status?: string; userId?: string } = {}) {
  try {
    const res = await api.get("/withdrawals", { params });
    return (res.data?.data?.withdrawals ?? []) as BackendWithdrawalRequest[];
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

export type BackendBankAccount = {
  _id: string;
  userId: string;
  bankName: string;
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

export async function createMyBankAccount(input: {
  bankName: string;
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
