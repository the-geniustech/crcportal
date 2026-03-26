import { api, getApiErrorMessage } from "./api/client";

export type InitializePaystackPaymentInput = {
  amount: number;
  email: string;
  paymentType: "loan_repayment" | "group_contribution";
  groupId?: string | null;
  loanApplicationId?: string | null;
  contributionType?: string | null;
  description?: string | null;
  callbackUrl?: string | null;
};

export type BulkPaymentItem = {
  type: "loan_repayment" | "group_contribution";
  amount: number;
  groupId?: string | null;
  loanApplicationId?: string | null;
  contributionType?: string | null;
  dueDate?: string | null;
  description?: string | null;
};

export type InitializePaystackBulkPaymentInput = {
  items: BulkPaymentItem[];
  email: string;
  description?: string | null;
  callbackUrl?: string | null;
};

export async function initializePaystackPayment(
  input: InitializePaystackPaymentInput,
): Promise<{
  reference: string;
  authorizationUrl: string;
  accessCode?: string;
}> {
  try {
    const res = await api.post("/payments/paystack/initialize", input);
    return res.data?.data as {
      reference: string;
      authorizationUrl: string;
      accessCode?: string;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function initializePaystackBulkPayment(
  input: InitializePaystackBulkPaymentInput,
): Promise<{
  reference: string;
  authorizationUrl: string;
  accessCode?: string;
}> {
  try {
    const res = await api.post("/payments/paystack/initialize-bulk", input);
    return res.data?.data as {
      reference: string;
      authorizationUrl: string;
      accessCode?: string;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function verifyPaystackPayment(reference: string) {
  try {
    const res = await api.post("/payments/paystack/verify", { reference });
    return res.data?.data?.transaction as unknown;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
