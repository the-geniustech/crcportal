import { useMutation } from "@tanstack/react-query";
import { uploadLoanDocuments } from "@/lib/loans";

export function useUploadLoanDocumentsMutation() {
  return useMutation({
    mutationFn: async (input: { file: File; onProgress?: (percent: number) => void }) =>
      uploadLoanDocuments([input.file], { onProgress: input.onProgress }),
  });
}
