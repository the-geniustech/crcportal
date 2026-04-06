import { api, getApiErrorMessage } from "./api/client";

export type BackendLoanDocument = {
  name: string;
  type: string;
  size: number;
  status: string;
  url?: string | null;
};

export type BackendLoanGuarantorInfo = {
  type: "member" | "external";
  profileId?: string | null;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  occupation?: string;
  address?: string;
  memberSince?: string;
  savingsBalance?: number | null;
  liabilityPercentage?: number | null;
  requestMessage?: string | null;
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    signedAt?: string | null;
  } | null;
};

export type BackendLoanApplication = {
  _id: string;
  userId: string;
  groupId?: string | null;
  groupName?: string | null;
  loanNumber?: number | null;
  loanCode?: string | null;
  loanType?: string | null;
  loanAmount: number;
  loanPurpose: string;
  purposeDescription?: string;
  repaymentPeriod: number;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  monthlyIncome?: number | null;
  disbursementBankAccountId?: string | null;
  disbursementBankName?: string | null;
  disbursementBankCode?: string | null;
  disbursementAccountNumber?: string | null;
  disbursementAccountName?: string | null;
  documents?: BackendLoanDocument[];
  guarantors?: BackendLoanGuarantorInfo[];
  status: string;
  draftStep?: number | null;
  draftLastSavedAt?: string | null;
  approvedAmount?: number | null;
  approvedInterestRate?: number | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  disbursedBy?: string | null;
  repaymentStartDate?: string | null;
  monthlyPayment?: number | null;
  totalRepayable?: number | null;
  remainingBalance?: number | null;
  repaymentToDate?: number | null;
  nextPaymentDueDate?: string | null;
  nextPaymentAmount?: number | null;
  nextPaymentStatus?: "paid" | "pending" | "upcoming" | "overdue" | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendLoanGuarantor = {
  _id: string;
  loanApplicationId: string;
  guarantorUserId: string;
  guarantorName: string;
  guarantorEmail?: string | null;
  guarantorPhone?: string | null;
  liabilityPercentage: number;
  requestMessage?: string | null;
  status: "pending" | "accepted" | "rejected";
  responseComment?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendLoanScheduleItem = {
  _id: string;
  loanApplicationId: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: "paid" | "pending" | "upcoming" | "overdue";
  paidAt?: string | null;
  paidAmount?: number | null;
  reference?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendGuarantorRequest = {
  id: string;
  guarantorId: string;
  loanId: string;
  loanCode?: string | null;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  loanAmount: number;
  liabilityPercentage: number;
  liabilityAmount: number;
  requestMessage: string;
  requestDate: string;
  status: "pending" | "accepted" | "rejected";
  loanPurpose: string;
  repaymentTerm: number | null;
};

export type BackendGuarantorCommitment = {
  id: string;
  guarantorId: string;
  loanId: string;
  loanCode?: string | null;
  borrowerName: string;
  loanAmount: number;
  liabilityAmount: number;
  liabilityPercentage: number;
  loanStatus: "active" | "completed" | "defaulted";
  disbursedDate: string | null;
  remainingBalance: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
  missedPayments: number;
  totalPaid: number;
  progressPercentage: number;
};

export type BackendGuarantorNotification = {
  _id: string;
  guarantorId: string;
  notificationType: string;
  message: string;
  sentVia: string[];
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendLoanEligibility = {
  savingsBalance: number;
  totalContributions: number;
  membershipDuration: number;
  groupsJoined: number;
  attendanceRate: number;
  contributionStreak: number;
  previousLoans: number;
  defaultedLoans: number;
  overdueContributions?: number;
  overdueRepayments?: number;
  contributionWindow?: { startDay: number; endDay: number; isOpen: boolean };
  creditScore: number;
};

export async function getLoanEligibility(): Promise<BackendLoanEligibility> {
  try {
    const res = await api.get("/loans/eligibility");
    return (res.data?.data?.eligibility ??
      res.data?.data ??
      {}) as BackendLoanEligibility;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type CreateLoanApplicationInput = {
  draftId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  loanType: string;
  loanAmount: number;
  loanPurpose: string;
  purposeDescription?: string;
  repaymentPeriod: number;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  monthlyIncome?: number | null;
  bankAccountId?: string | null;
  documents?: BackendLoanDocument[];
  guarantors?: BackendLoanGuarantorInfo[];
};

export async function createLoanApplication(
  input: CreateLoanApplicationInput,
): Promise<{ application: BackendLoanApplication }> {
  try {
    const res = await api.post("/loans/applications", input);
    return {
      application: res.data?.data?.application as BackendLoanApplication,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function uploadLoanDocuments(
  files: File[],
  opts?: { onProgress?: (percent: number) => void },
): Promise<BackendLoanDocument[]> {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("documents", file));
    const res = await api.post("/loans/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!opts?.onProgress) return;
        const total = event.total ?? 0;
        if (!total) return;
        const pct = Math.min(100, Math.round((event.loaded / total) * 100));
        opts.onProgress(pct);
      },
    });
    return (res.data?.data?.documents ?? []) as BackendLoanDocument[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type LoanSignatureUpload = {
  url: string;
  publicId?: string | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  bytes?: number | null;
  originalFilename?: string | null;
  resourceType?: string | null;
};

export async function uploadLoanSignature(
  file: File,
  opts?: { onProgress?: (percent: number) => void },
): Promise<LoanSignatureUpload> {
  try {
    const formData = new FormData();
    formData.append("signature", file);
    const res = await api.post("/loans/signatures", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!opts?.onProgress) return;
        const total = event.total ?? 0;
        if (!total) return;
        const pct = Math.min(100, Math.round((event.loaded / total) * 100));
        opts.onProgress(pct);
      },
    });
    return res.data?.data?.signature as LoanSignatureUpload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type LoanDraftInput = Partial<CreateLoanApplicationInput> & {
  draftStep?: number;
};

export async function createLoanDraft(
  input: LoanDraftInput,
): Promise<{ application: BackendLoanApplication }> {
  try {
    const res = await api.post("/loans/applications/draft", input);
    return {
      application: res.data?.data?.application as BackendLoanApplication,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateLoanDraft(
  applicationId: string,
  input: LoanDraftInput,
): Promise<{ application: BackendLoanApplication }> {
  try {
    const res = await api.patch(`/loans/applications/${applicationId}/draft`, input);
    return {
      application: res.data?.data?.application as BackendLoanApplication,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteLoanDraft(applicationId: string): Promise<void> {
  try {
    await api.delete(`/loans/applications/${applicationId}/draft`);
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listMyLoanApplications(): Promise<
  BackendLoanApplication[]
> {
  try {
    const res = await api.get("/loans/applications/me");
    return (res.data?.data?.applications ?? []) as BackendLoanApplication[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getLoanApplication(applicationId: string): Promise<{
  application: BackendLoanApplication;
  guarantors: BackendLoanGuarantor[];
  schedule: BackendLoanScheduleItem[];
}> {
  try {
    const res = await api.get(`/loans/applications/${applicationId}`);
    return {
      application: res.data?.data?.application as BackendLoanApplication,
      guarantors: (res.data?.data?.guarantors ?? []) as BackendLoanGuarantor[],
      schedule: (res.data?.data?.schedule ?? []) as BackendLoanScheduleItem[],
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listLoanSchedule(
  applicationId: string,
): Promise<BackendLoanScheduleItem[]> {
  try {
    const res = await api.get(`/loans/${applicationId}/schedule`);
    return (res.data?.data?.schedule ?? []) as BackendLoanScheduleItem[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function recordLoanRepayment(
  applicationId: string,
  input: { amount: number; reference: string; channel?: string | null },
): Promise<{
  transaction: unknown;
  scheduleItem: BackendLoanScheduleItem;
  application: BackendLoanApplication;
}> {
  try {
    const res = await api.post(`/loans/${applicationId}/repayments`, input);
    return res.data?.data as {
      transaction: unknown;
      scheduleItem: BackendLoanScheduleItem;
      application: BackendLoanApplication;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listGuarantorRequests(): Promise<
  BackendGuarantorRequest[]
> {
  try {
    const res = await api.get("/loans/guarantor/requests");
    return (res.data?.data?.requests ?? []) as BackendGuarantorRequest[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function respondToGuarantorRequest(
  guarantorId: string,
  input: { status: "accepted" | "rejected"; responseComment?: string },
): Promise<BackendLoanGuarantor> {
  try {
    const res = await api.patch(
      `/loans/guarantor/requests/${guarantorId}/respond`,
      input,
    );
    return res.data?.data?.guarantor as BackendLoanGuarantor;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listGuarantorCommitments(): Promise<
  BackendGuarantorCommitment[]
> {
  try {
    const res = await api.get("/loans/guarantor/commitments");
    return (res.data?.data?.commitments ?? []) as BackendGuarantorCommitment[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listGuarantorNotifications(): Promise<{
  notifications: BackendGuarantorNotification[];
  unread: number;
}> {
  try {
    const res = await api.get("/loans/guarantor/notifications");
    return {
      notifications: (res.data?.data?.notifications ??
        []) as BackendGuarantorNotification[],
      unread: Number(res.data?.data?.unread ?? 0),
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function markGuarantorNotificationRead(
  notificationId: string,
): Promise<BackendGuarantorNotification> {
  try {
    const res = await api.patch(
      `/loans/guarantor/notifications/${notificationId}/read`,
    );
    return res.data?.data?.notification as BackendGuarantorNotification;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
