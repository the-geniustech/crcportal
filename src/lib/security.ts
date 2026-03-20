import { api, getApiErrorMessage } from "./api/client";

export type TwoFactorStatus = {
  enabled: boolean;
  pendingSetup: boolean;
  enabledAt?: string | null;
};

export type TwoFactorSetupPayload = {
  secret: string;
  otpauthUrl?: string | null;
  qrCodeDataUrl?: string | null;
};

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  try {
    const res = await api.get("/auth/2fa/status");
    return (res.data?.data ?? {}) as TwoFactorStatus;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function setupTwoFactor(): Promise<TwoFactorSetupPayload> {
  try {
    const res = await api.post("/auth/2fa/setup");
    return (res.data?.data ?? {}) as TwoFactorSetupPayload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function enableTwoFactor(code: string) {
  try {
    const res = await api.post("/auth/2fa/enable", { code });
    return res.data?.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function disableTwoFactor(payload: {
  password: string;
  code: string;
}) {
  try {
    const res = await api.post("/auth/2fa/disable", payload);
    return res.data?.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type LoginHistoryItem = {
  _id: string;
  method: "password" | "phone_otp" | "two_factor";
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export async function getLoginHistory(params: {
  page?: number;
  limit?: number;
}) {
  try {
    const res = await api.get("/auth/login-history", { params });
    return {
      history: (res.data?.data?.history ?? []) as LoginHistoryItem[],
      total: res.data?.total ?? 0,
      page: res.data?.page ?? 1,
      limit: res.data?.limit ?? params.limit ?? 20,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AccountDeletionStatus = {
  requestedAt?: string | null;
  scheduledFor?: string | null;
  cancelledAt?: string | null;
  isPending: boolean;
};

export async function getAccountDeletionStatus(): Promise<AccountDeletionStatus> {
  try {
    const res = await api.get("/auth/account-deletion");
    return (res.data?.data ?? {}) as AccountDeletionStatus;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function requestAccountDeletion(payload: {
  password: string;
  code?: string;
}) {
  try {
    const res = await api.post("/auth/account-deletion/request", payload);
    return res.data?.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function cancelAccountDeletion(payload: {
  password: string;
  code?: string;
}) {
  try {
    const res = await api.post("/auth/account-deletion/cancel", payload);
    return res.data?.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
