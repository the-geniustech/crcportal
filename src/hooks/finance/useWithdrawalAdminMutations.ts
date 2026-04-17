import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveWithdrawal,
  cancelManualWithdrawalPayout,
  completeWithdrawal,
  finalizeManualWithdrawalPayout,
  finalizeWithdrawalOtp,
  initiateManualWithdrawalPayout,
  markWithdrawalProcessing,
  rejectWithdrawal,
  resendManualWithdrawalPayoutOtp,
  resendWithdrawalOtp,
  verifyWithdrawalTransfer,
} from "@/lib/finance";

export function useApproveWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; adminNotes?: string | null }) => approveWithdrawal(input.id, { adminNotes: input.adminNotes }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}

export function useRejectWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; rejectionReason: string; adminNotes?: string | null }) =>
      rejectWithdrawal(input.id, { rejectionReason: input.rejectionReason, adminNotes: input.adminNotes }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}

export function useMarkWithdrawalProcessingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => markWithdrawalProcessing(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}

export function useCompleteWithdrawalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reference?: string; gateway?: string }) =>
      completeWithdrawal(input.id, { reference: input.reference, gateway: input.gateway }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
      await qc.invalidateQueries({ queryKey: ["withdrawals", "balance"] });
    },
  });
}

export function useFinalizeWithdrawalOtpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; transferCode: string; otp: string }) =>
      finalizeWithdrawalOtp(input.id, { transferCode: input.transferCode, otp: input.otp }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["withdrawals", "balance"] });
    },
  });
}

export function useResendWithdrawalOtpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; transferCode: string; reason?: string }) =>
      resendWithdrawalOtp(input.id, { transferCode: input.transferCode, reason: input.reason }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}

export function useVerifyWithdrawalTransferMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => verifyWithdrawalTransfer(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
      await qc.invalidateQueries({ queryKey: ["withdrawals", "balance"] });
    },
  });
}

export function useInitiateManualWithdrawalPayoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
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
    }) =>
      initiateManualWithdrawalPayout(input.id, {
        method: input.method,
        occurredAt: input.occurredAt,
        externalReference: input.externalReference,
        notes: input.notes,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}

export function useFinalizeManualWithdrawalPayoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; otp: string }) =>
      finalizeManualWithdrawalPayout(input.id, { otp: input.otp }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
      await qc.invalidateQueries({ queryKey: ["transactions", "me"] });
      await qc.invalidateQueries({ queryKey: ["savings", "me", "summary"] });
      await qc.invalidateQueries({ queryKey: ["withdrawals", "balance"] });
    },
  });
}

export function useResendManualWithdrawalPayoutOtpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => resendManualWithdrawalPayoutOtp(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}

export function useCancelManualWithdrawalPayoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => cancelManualWithdrawalPayout(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["withdrawals", "admin"] });
    },
  });
}
