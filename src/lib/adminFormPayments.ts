import { api, getApiErrorMessage } from "@/lib/api/client";

export type AdminFormPaymentType =
  | "membership_registration"
  | "revolving_loan"
  | "bridging_loan"
  | "soft_loan"
  | "special_loan";

export type AdminFormPaymentFilterType = AdminFormPaymentType | "bss_loan";

export type AdminFormPaymentStatus = "pending" | "paid" | "defaulted";

export type AdminFormPaymentSort =
  | "submitted_desc"
  | "submitted_asc"
  | "reviewed_desc"
  | "reviewed_asc"
  | "amount_desc"
  | "amount_asc"
  | "member_asc"
  | "member_desc"
  | "group_asc"
  | "group_desc"
  | "form_type_asc"
  | "status_asc";

export type AdminFormPaymentDetails = Record<string, unknown>;

export interface AdminFormPayment {
  id: string;
  _id: string;
  userId: string | null;
  userAccountId: string | null;
  groupId: string | null;
  groupName: string | null;
  memberName: string | null;
  memberEmail: string | null;
  memberPhone: string | null;
  formType: AdminFormPaymentType;
  formCategory: "membership" | "loan";
  formLabel: string;
  amount: number;
  currency: "NGN" | string;
  paymentStatus: AdminFormPaymentStatus;
  sourceModel: "GroupMembership" | "LoanApplication";
  sourceId: string | null;
  sourceReference: string | null;
  transactionId: string | null;
  transactionReference: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notes: string | null;
  formDetails: AdminFormPaymentDetails;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminFormPaymentSummary {
  totalRecords: number;
  totalAmount: number;
  pendingCount: number;
  paidCount: number;
  defaultedCount: number;
  pendingAmount: number;
  paidAmount: number;
  defaultedAmount: number;
}

export interface AdminFormPaymentListResponse {
  payments: AdminFormPayment[];
  summary: AdminFormPaymentSummary;
  meta: {
    total: number;
    page: number;
    limit: number;
    results: number;
  };
}

export interface AdminFormPaymentListParams {
  search?: string;
  formType?: AdminFormPaymentFilterType | "all";
  paymentStatus?: AdminFormPaymentStatus | "all";
  groupId?: string;
  from?: string;
  to?: string;
  sort?: AdminFormPaymentSort;
  page?: number;
  limit?: number;
}

export interface AdminFormPaymentUpdatePayload {
  paymentStatus?: AdminFormPaymentStatus;
  notes?: string | null;
}

function extractFilename(value: unknown): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const match = /filename="?([^"]+)"?/i.exec(String(raw));
  return match?.[1] ?? null;
}

const emptySummary: AdminFormPaymentSummary = {
  totalRecords: 0,
  totalAmount: 0,
  pendingCount: 0,
  paidCount: 0,
  defaultedCount: 0,
  pendingAmount: 0,
  paidAmount: 0,
  defaultedAmount: 0,
};

export async function listAdminFormPayments(
  params: AdminFormPaymentListParams = {},
): Promise<AdminFormPaymentListResponse> {
  try {
    const res = await api.get("/admin/form-payments", { params });
    const payload = res.data ?? {};
    return {
      payments: (payload?.data?.payments ?? []) as AdminFormPayment[],
      summary: (payload?.data?.summary ?? emptySummary) as AdminFormPaymentSummary,
      meta: {
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? params.page ?? 1),
        limit: Number(payload?.limit ?? params.limit ?? 0),
        results: Number(payload?.results ?? 0),
      },
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function downloadAdminFormPaymentsExport(
  params: AdminFormPaymentListParams & { format: "pdf" | "csv" | "xlsx" },
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get("/admin/form-payments/export", {
      params,
      responseType: "blob",
    });
    const contentType =
      (res.headers?.["content-type"] as string) || "application/octet-stream";
    const filename =
      extractFilename(res.headers?.["content-disposition"]) ||
      `admin-form-payments.${params.format}`;
    return {
      blob: new Blob([res.data], { type: contentType }),
      filename,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function getAdminFormPaymentDetails(
  paymentId: string,
): Promise<AdminFormPayment> {
  try {
    const res = await api.get(`/admin/form-payments/${paymentId}`);
    return res.data?.data?.payment as AdminFormPayment;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function updateAdminFormPayment(
  paymentId: string,
  payload: AdminFormPaymentUpdatePayload,
): Promise<AdminFormPayment> {
  try {
    const res = await api.patch(`/admin/form-payments/${paymentId}`, payload);
    return res.data?.data?.payment as AdminFormPayment;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
