import { useMutation } from "@tanstack/react-query";
import { uploadLoanDocuments } from "@/lib/loans";
import type { LoanDocumentType } from "@/lib/loanDocuments";

export function useUploadLoanDocumentsMutation() {
  return useMutation({
    mutationFn: async (input: {
      file: File;
      documentType: LoanDocumentType;
      onProgress?: (percent: number) => void;
    }) =>
      uploadLoanDocuments([input.file], {
        documentType: input.documentType,
        onProgress: input.onProgress,
      }),
  });
}
