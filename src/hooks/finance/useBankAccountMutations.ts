import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMyBankAccount, deleteMyBankAccount, updateMyBankAccount } from "@/lib/finance";

export function useCreateMyBankAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createMyBankAccount>[0]) => createMyBankAccount(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bank-accounts", "me"] });
    },
  });
}

export function useUpdateMyBankAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Parameters<typeof updateMyBankAccount>[1] }) =>
      updateMyBankAccount(input.id, input.patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bank-accounts", "me"] });
    },
  });
}

export function useDeleteMyBankAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteMyBankAccount(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bank-accounts", "me"] });
    },
  });
}

