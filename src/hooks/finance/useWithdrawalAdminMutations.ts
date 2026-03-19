import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveWithdrawal,
  completeWithdrawal,
  markWithdrawalProcessing,
  rejectWithdrawal,
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
    },
  });
}

