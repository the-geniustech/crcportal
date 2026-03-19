import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRecurringPayment,
  deleteRecurringPayment,
  updateRecurringPayment,
} from "@/lib/finance";

export function useCreateRecurringPaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: unknown) => createRecurringPayment(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recurring-payments", "me"] });
    },
  });
}

export function useUpdateRecurringPaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: unknown }) =>
      updateRecurringPayment(input.id, input.patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recurring-payments", "me"] });
    },
  });
}

export function useDeleteRecurringPaymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteRecurringPayment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recurring-payments", "me"] });
    },
  });
}
