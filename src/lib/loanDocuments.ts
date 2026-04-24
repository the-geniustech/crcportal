export const REQUIRED_LOAN_DOCUMENTS = [
  {
    id: "valid_id_card",
    name: "Valid ID Card",
    description:
      "National ID, Voter's Card, Driver's License, or International Passport",
    required: true,
    acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxSize: 5,
  },
  {
    id: "proof_of_address",
    name: "Proof of Address",
    description:
      "Utility bill, bank statement, or tenancy agreement (not older than 3 months)",
    required: true,
    acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxSize: 5,
  },
  {
    id: "passport_photograph",
    name: "Passport Photograph",
    description:
      "Recent passport-sized photograph with white background",
    required: true,
    acceptedTypes: ["image/jpeg", "image/png"],
    maxSize: 2,
  },
] as const;

export type LoanDocumentType = (typeof REQUIRED_LOAN_DOCUMENTS)[number]["id"];
export type RequiredDocument = (typeof REQUIRED_LOAN_DOCUMENTS)[number];

const LEGACY_LOAN_DOCUMENT_ALIASES: Record<string, LoanDocumentType> = {
  valid_id_card: "valid_id_card",
  id_card: "valid_id_card",
  proof_of_address: "proof_of_address",
  passport_photograph: "passport_photograph",
  passport_photo: "passport_photograph",
};

export function normalizeLoanDocumentType(
  value?: string | null,
): LoanDocumentType | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) return null;
  return LEGACY_LOAN_DOCUMENT_ALIASES[normalized] ?? null;
}

export function getLoanDocumentDefinition(
  documentType?: string | null,
): RequiredDocument | null {
  const normalized = normalizeLoanDocumentType(documentType);
  if (!normalized) return null;
  return (
    REQUIRED_LOAN_DOCUMENTS.find((item) => item.id === normalized) ?? null
  );
}

export function inferLoanDocumentType(input: {
  documentType?: string | null;
  id?: string | null;
  name?: string | null;
}): LoanDocumentType | null {
  const explicit = normalizeLoanDocumentType(
    input.documentType || input.id || null,
  );
  if (explicit) return explicit;

  const label = String(input.name || "")
    .trim()
    .toLowerCase();

  if (label.startsWith("valid id card")) return "valid_id_card";
  if (label.startsWith("proof of address")) return "proof_of_address";
  if (label.startsWith("passport photograph")) return "passport_photograph";

  return null;
}
