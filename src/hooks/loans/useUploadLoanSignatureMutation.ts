import { useMutation } from "@tanstack/react-query";
import { uploadLoanSignature } from "@/lib/loans";

export function useUploadLoanSignatureMutation() {
  return useMutation({
    mutationFn: async (input: { file: File; onProgress?: (percent: number) => void }) =>
      uploadLoanSignature(input.file, { onProgress: input.onProgress }),
  });
}
