import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useBlocker } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LoanEligibilityCheck from "@/components/loans/LoanEligibilityCheck";
import LoanAmountSelector from "@/components/loans/LoanAmountSelector";
import LoanRepaymentTerms from "@/components/loans/LoanRepaymentTerms";
import LoanDocumentUpload from "@/components/loans/LoanDocumentUpload";
import LoanGuarantorInfo from "@/components/loans/LoanGuarantorInfo";
import LoanBankDetails from "@/components/loans/LoanBankDetails";
import LoanReviewSubmit from "@/components/loans/LoanReviewSubmit";
import LoanFaqModal from "@/components/loans/LoanFaqModal";
import { useLoanEligibilityQuery } from "@/hooks/loans/useLoanEligibilityQuery";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useGroupMembersQuery } from "@/hooks/groups/useGroupMembersQuery";
import { useMyBankAccountsQuery } from "@/hooks/finance/useMyBankAccountsQuery";
import { useCreateLoanApplicationMutation } from "@/hooks/loans/useCreateLoanApplicationMutation";
import { useSaveLoanDraftMutation } from "@/hooks/loans/useSaveLoanDraftMutation";
import { useDeleteLoanDraftMutation } from "@/hooks/loans/useDeleteLoanDraftMutation";
import { useLoanApplicationQuery } from "@/hooks/loans/useLoanApplicationQuery";
import { useCreateLoanEditRequestMutation } from "@/hooks/loans/useCreateLoanEditRequestMutation";
import { calculateLoanSummary } from "@/lib/loanMath";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BackendLoanApplication } from "@/lib/loans";
import { normalizeNigerianPhone } from "@/lib/phone";
import {
  inferLoanDocumentType,
  REQUIRED_LOAN_DOCUMENTS,
  type LoanDocumentType,
} from "@/lib/loanDocuments";
import {
  LOAN_FACILITIES,
  LoanFacilityKey,
  formatInterestLabel,
  getLoanFacility,
  getLoanTermOptions,
} from "@/lib/loanPolicy";
import {
  CheckCircle,
  ArrowLeft,
  Calculator,
  Info,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  documentType?: LoanDocumentType | null;
  name: string;
  type: string;
  size: number;
  status: "uploading" | "uploaded" | "error";
  url?: string;
  progress?: number;
  file?: File;
}

interface Guarantor {
  id: string;
  type: "member" | "external";
  profileId?: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  address: string;
  memberSince?: string;
  savingsBalance?: number;
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    signedAt?: string | null;
  } | null;
}

interface BankAccount {
  id: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

interface RawMembership {
  groupId: string | { _id: string; groupName?: string; group_name?: string };
  groupName?: string;
}

interface RawMember {
  userId:
    | string
    | {
        _id?: string;
        id?: string;
        fullName?: string;
        full_name?: string;
        email?: string;
        phone?: string;
        avatar?: { url?: string };
        avatar_url?: string;
      };
  joinedAt?: string;
  _id?: string;
}

interface RawBankAccount {
  _id?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  isPrimary?: boolean;
}

interface BackendGuarantor {
  type: "member" | "external";
  profileId?: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  address: string;
  memberSince?: string;
  savingsBalance?: number;
  liabilityPercentage: number;
  requestMessage: null;
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    signedAt?: string | null;
  } | null;
}

const steps = [
  {
    id: 0,
    name: "Eligibility",
    shortName: "Eligibility",
    description: "Verify your loan eligibility",
  },
  {
    id: 1,
    name: "Loan Amount",
    shortName: "Amount",
    description: "Select loan amount and purpose",
  },
  {
    id: 2,
    name: "Repayment Terms",
    shortName: "Terms",
    description: "Choose repayment schedule",
  },
  {
    id: 3,
    name: "Documentation",
    shortName: "Documents",
    description: "Upload required documents",
  },
  {
    id: 4,
    name: "Guarantor Info",
    shortName: "Guarantor",
    description: "Add loan guarantors",
  },
  {
    id: 5,
    name: "Bank Details",
    shortName: "Bank",
    description: "Select a bank account for disbursement",
  },
  {
    id: 6,
    name: "Review & Submit",
    shortName: "Submit",
    description: "Review and submit application",
  },
];

const editSteps = [
  {
    id: 0,
    name: "Edit Details",
    shortName: "Details",
    description: "Update loan amount, purpose, term, and documents",
  },
  {
    id: 1,
    name: "Guarantor Info",
    shortName: "Guarantor",
    description: "Update guarantor details for this request",
  },
  {
    id: 2,
    name: "Bank Details",
    shortName: "Bank",
    description: "Confirm the disbursement account",
  },
  {
    id: 3,
    name: "Review & Submit",
    shortName: "Submit",
    description: "Review your changes before submitting for approval",
  },
];

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const LoanApplicationContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const eligibilityQuery = useLoanEligibilityQuery();
  const myGroupsQuery = useMyGroupMembershipsQuery();
  const createLoanApplicationMutation = useCreateLoanApplicationMutation();
  const createEditRequestMutation = useCreateLoanEditRequestMutation();
  const saveDraftMutation = useSaveLoanDraftMutation();
  const deleteDraftMutation = useDeleteLoanDraftMutation();

  // Get pre-filled data from calculator
  const prefilledData = location.state as {
    amount?: number;
    term?: number;
    loanType?: LoanFacilityKey;
  } | null;

  const searchParams = new URLSearchParams(location.search);
  const editIdParam = searchParams.get("edit");
  const isEditMode = Boolean(editIdParam);
  const draftIdParam = isEditMode ? null : searchParams.get("draft");
  const draftQuery = useLoanApplicationQuery(draftIdParam);
  const editQuery = useLoanApplicationQuery(editIdParam);

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loanType, setLoanType] = useState<LoanFacilityKey>(
    prefilledData?.loanType || "revolving",
  );
  const [loanAmount, setLoanAmount] = useState(prefilledData?.amount || 100000);
  const [purpose, setPurpose] = useState("");
  const [purposeDescription, setPurposeDescription] = useState("");
  const [repaymentTerm, setRepaymentTerm] = useState(prefilledData?.term || 10);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrefilledNotice, setShowPrefilledNotice] = useState(
    !!prefilledData && !isEditMode,
  );
  const [draftId, setDraftId] = useState<string | null>(draftIdParam);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);
  const [draftLastSavedAt, setDraftLastSavedAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showLoanFaq, setShowLoanFaq] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const initialSnapshotRef = useRef<string | null>(null);
  const pendingExitRef = useRef<null | {
    proceed: () => void;
    reset: () => void;
  }>(null);
  const ignorePromptRef = useRef(false);

  const activeSteps = isEditMode ? editSteps : steps;

  const groupOptions = React.useMemo(() => {
    const memberships: RawMembership[] = myGroupsQuery.data ?? [];
    const out: {
      id: string;
      name: string;
      maxLoanAmount: number;
      interestRate: number;
    }[] = [];

    for (const m of memberships) {
      const g = typeof m.groupId === "object" ? m.groupId : null;
      const id = typeof m.groupId === "string" ? m.groupId : g?._id;
      const name = g?.groupName || g?.group_name || m?.groupName || "CRC Group";
      if (id) {
        out.push({
          id: String(id),
          name: String(name),
          maxLoanAmount: 1_000_000,
          interestRate: 5,
        });
      }
    }

    return out;
  }, [myGroupsQuery.data]);

  // Derived values
  const selectedGroupData = groupOptions.find((g) => g.id === selectedGroup);
  const contributionBalance = Number(
    eligibilityQuery.data?.contributionBalance ??
      eligibilityQuery.data?.savingsBalance ??
      0,
  );
  const baseMaxLoanAmount = selectedGroupData?.maxLoanAmount || 500000;
  const contributionBasedCap = contributionBalance > 0 ? contributionBalance * 10 : 0;
  const maxLoanAmount =
    contributionBasedCap > 0
      ? Math.min(baseMaxLoanAmount, contributionBasedCap)
      : baseMaxLoanAmount;
  const allRequiredDocumentsUploaded = REQUIRED_LOAN_DOCUMENTS.every(
    (requiredDoc) =>
      documents.some((doc) => {
        const documentType = inferLoanDocumentType({
          documentType: doc.documentType ?? null,
          id: doc.id,
          name: doc.name,
        });
        return documentType === requiredDoc.id && doc.status === "uploaded";
      }),
  );
  const minLoanAmount = 50000;
  const loanFacility = getLoanFacility(loanType);
  const appInterestRate = isEditMode
    ? Number(
        editQuery.data?.application?.approvedInterestRate ??
          editQuery.data?.application?.interestRate ??
          NaN,
      )
    : NaN;
  const appInterestRateType = isEditMode
    ? (editQuery.data?.application?.interestRateType as
        | "annual"
        | "monthly"
        | "total"
        | undefined)
    : undefined;
  const interestRateType = (appInterestRateType ??
    loanFacility?.interestRateType ??
    "annual") as "annual" | "monthly" | "total";
  const interestRate =
    (Number.isFinite(appInterestRate) ? appInterestRate : undefined) ??
    loanFacility?.interestRate ??
    loanFacility?.interestRateRange?.min ??
    selectedGroupData?.interestRate ??
    5;
  const interestLabel = formatInterestLabel(
    interestRate,
    interestRateType,
    loanFacility?.interestRateRange,
  );
  const termOptions = (() => {
    const baseOptions = getLoanTermOptions(loanType, addMonths(new Date(), 1));
    return Array.from(new Set(baseOptions)).sort((a, b) => a - b);
  })();

  const groupMembersQuery = useGroupMembersQuery(selectedGroup || undefined);
  const bankAccountsQuery = useMyBankAccountsQuery();
  const groupMembers = React.useMemo(() => {
    const raw: RawMember[] = groupMembersQuery.data ?? [];

    return raw.map((m) => {
      const userObj = typeof m.userId === "object" ? m.userId : null;
      const name = userObj?.fullName || userObj?.full_name || "Member";
      const email = userObj?.email || "";
      const phone = userObj?.phone || "";
      const memberSince = m.joinedAt
        ? new Date(m.joinedAt).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })
        : "";

      return {
        id: String(userObj?._id || userObj?.id || m._id),
        name: String(name),
        email: String(email),
        phone: String(phone),
        memberSince,
        savingsBalance: 0,
        avatar: userObj?.avatar?.url || userObj?.avatar_url || undefined,
      };
    });
  }, [groupMembersQuery.data]);

  const bankAccounts: BankAccount[] = React.useMemo(() => {
    const data = bankAccountsQuery.data ?? [];
    return data.map(
      (acc: {
        _id: string;
        bankName: string;
        bankCode?: string;
        accountNumber: string;
        accountName: string;
        isPrimary: boolean;
      }) => ({
        id: String(acc._id),
        bankName: String(acc.bankName),
        bankCode: acc.bankCode ? String(acc.bankCode) : undefined,
        accountNumber: String(acc.accountNumber),
        accountName: String(acc.accountName),
        isPrimary: Boolean(acc.isPrimary),
      }),
    );
  }, [bankAccountsQuery.data]);

  const editBankFallback = React.useMemo(() => {
    if (!isEditMode) return null;
    const app = editQuery.data?.application;
    if (!app) return null;
    if (
      !app.disbursementBankName &&
      !app.disbursementAccountNumber &&
      !app.disbursementAccountName
    ) {
      return null;
    }
    return {
      id: "edit-bank-fallback",
      bankName: String(app.disbursementBankName || "Bank"),
      accountNumber: String(app.disbursementAccountNumber || ""),
      accountName: String(app.disbursementAccountName || ""),
      isPrimary: false,
    };
  }, [isEditMode, editQuery.data?.application]);

  const selectedBankAccount = React.useMemo(() => {
    const found =
      bankAccounts.find((acc) => acc.id === selectedBankAccountId) || null;
    if (found) return found;
    return editBankFallback || null;
  }, [bankAccounts, selectedBankAccountId, editBankFallback]);

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const buildLeaveSnapshot = React.useCallback(() => {
    const normalizedDocuments = documents
      .map((doc) => {
        const documentType = inferLoanDocumentType({
          documentType: doc.documentType ?? null,
          id: doc.id,
          name: doc.name,
        });
        return {
          id: doc.id,
          documentType,
          name: doc.name,
          type: doc.type,
          size: doc.size,
          status: doc.status,
          url: doc.url ?? null,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const normalizedGuarantors = guarantors
      .map((g) => ({
        id: g.id,
        type: g.type,
        profileId: g.profileId ?? "",
        name: g.name.trim(),
        email: g.email.trim().toLowerCase(),
        phone: g.phone.trim(),
        relationship: g.relationship.trim(),
        occupation: g.occupation.trim(),
        address: g.address.trim(),
        memberSince: g.memberSince ?? "",
        savingsBalance: g.savingsBalance ?? null,
        signature: g.signature
          ? {
              method: g.signature.method ?? null,
              text: g.signature.text ?? null,
              font: g.signature.font ?? null,
              imageUrl: g.signature.imageUrl ?? null,
              imagePublicId: g.signature.imagePublicId ?? null,
              signedAt: g.signature.signedAt ?? null,
            }
          : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
      selectedGroup: selectedGroup ?? "",
      loanType,
      loanAmount,
      purpose: purpose.trim(),
      purposeDescription: purposeDescription.trim(),
      repaymentTerm,
      bankAccountId: selectedBankAccountId || "",
      documents: normalizedDocuments,
      guarantors: normalizedGuarantors,
    });
  }, [
    documents,
    guarantors,
    loanAmount,
    loanType,
    purpose,
    purposeDescription,
    repaymentTerm,
    selectedBankAccountId,
    selectedGroup,
  ]);

  const hasUnsavedChanges =
    Boolean(initialSnapshotRef.current) &&
    buildLeaveSnapshot() !== initialSnapshotRef.current;

  const exitPromptTitle = isEditMode
    ? "Discard loan edit?"
    : "Leave loan application?";
  const exitPromptDescription = isEditMode
    ? "Your edits have not been submitted. Leaving now will discard them."
    : "You have unsaved changes. Save a draft to continue later, or discard this application.";

  // Check if coming from calculator with pre-filled data
  useEffect(() => {
    if (isEditMode) return;
    if (prefilledData?.amount || prefilledData?.term) {
      toast({
        title: "Calculator Data Applied",
        description: `Loan amount: ₦${(prefilledData.amount || 100000).toLocaleString()}, Term: ${prefilledData.term || 10} months`,
      });
    }
  }, [prefilledData?.amount, prefilledData?.term, toast, isEditMode]);

  useEffect(() => {
    if (!draftIdParam || draftLoaded || !draftQuery.data?.application) return;
    const app = draftQuery.data.application;
    setDraftId(String(app._id));
    setDraftLastSavedAt(app.draftLastSavedAt ?? app.updatedAt ?? null);
    const resolvedDraftStep = Math.min(
      steps.length - 1,
      Math.max(0, Number(app.draftStep ?? 0)),
    );
    setCurrentStep(resolvedDraftStep);
    if (app.groupId) {
      setSelectedGroup(String(app.groupId));
    }
    if (app.loanType) {
      setLoanType(app.loanType as LoanFacilityKey);
    }
    if (app.loanAmount) {
      setLoanAmount(Number(app.loanAmount));
    }
    if (typeof app.loanPurpose === "string") {
      setPurpose(app.loanPurpose);
    }
    if (typeof app.purposeDescription === "string") {
      setPurposeDescription(app.purposeDescription);
    }
    if (app.repaymentPeriod) {
      setRepaymentTerm(Number(app.repaymentPeriod));
    }
    if (app.disbursementBankAccountId) {
      setSelectedBankAccountId(String(app.disbursementBankAccountId));
    }
    const draftDocs = Array.isArray(app.documents)
      ? app.documents
          .map((doc, idx) => {
            const documentType = inferLoanDocumentType({
              documentType: doc.documentType ?? null,
              name: doc.name,
            });
            if (!documentType) return null;
            const definition = REQUIRED_LOAN_DOCUMENTS.find(
              (item) => item.id === documentType,
            );
            return {
              id: `draft_doc_${documentType}_${idx}`,
              documentType,
              name: definition?.name || doc.name,
              type: doc.type,
              size: doc.size,
              status: "uploaded" as const,
              url: doc.url ?? undefined,
            };
          })
          .filter(Boolean)
      : [];
    setDocuments(draftDocs);

    const draftGuarantors = Array.isArray(app.guarantors)
      ? app.guarantors.map((g, idx) => ({
          id: g.profileId
            ? `guarantor_${String(g.profileId)}`
            : `guarantor_ext_${idx}`,
          type: g.type,
          profileId: g.profileId ? String(g.profileId) : undefined,
          name: g.name || "",
          email: g.email || "",
          phone: g.phone || "",
          relationship: g.relationship || "",
          occupation: g.occupation || "",
          address: g.address || "",
          memberSince: g.memberSince || undefined,
          savingsBalance:
            typeof g.savingsBalance === "number" ? g.savingsBalance : undefined,
          signature: g.signature ?? null,
        }))
      : [];
    setGuarantors(draftGuarantors);
    setShowPrefilledNotice(false);
    setDraftLoaded(true);
  }, [draftIdParam, draftLoaded, draftQuery.data]);

  useEffect(() => {
    if (!editIdParam || editLoaded || !editQuery.data?.application) return;
    const app = editQuery.data.application;
    setSelectedGroup(app.groupId ? String(app.groupId) : null);
    if (app.loanType) {
      setLoanType(app.loanType as LoanFacilityKey);
    }
    if (app.loanAmount) {
      setLoanAmount(Number(app.loanAmount));
    }
    if (typeof app.loanPurpose === "string") {
      setPurpose(app.loanPurpose);
    }
    if (typeof app.purposeDescription === "string") {
      setPurposeDescription(app.purposeDescription);
    }
    if (app.repaymentPeriod) {
      setRepaymentTerm(Number(app.repaymentPeriod));
    }
    if (app.disbursementBankAccountId) {
      setSelectedBankAccountId(String(app.disbursementBankAccountId));
    }

    const editDocs = Array.isArray(app.documents)
      ? app.documents
          .map((doc, idx) => {
            const documentType = inferLoanDocumentType({
              documentType: doc.documentType ?? null,
              name: doc.name,
            });
            if (!documentType) return null;
            const definition = REQUIRED_LOAN_DOCUMENTS.find(
              (item) => item.id === documentType,
            );
            return {
              id: `edit_doc_${documentType}_${idx}`,
              documentType,
              name: definition?.name || doc.name,
              type: doc.type,
              size: doc.size,
              status: "uploaded" as const,
              url: doc.url ?? undefined,
            };
          })
          .filter(Boolean)
      : [];
    setDocuments(editDocs);

    const editGuarantors = Array.isArray(app.guarantors)
      ? app.guarantors.map((g, idx) => ({
          id: g.profileId
            ? `guarantor_${String(g.profileId)}`
            : `guarantor_ext_${idx}`,
          type: g.type,
          profileId: g.profileId ? String(g.profileId) : undefined,
          name: g.name || "",
          email: g.email || "",
          phone: g.phone || "",
          relationship: g.relationship || "",
          occupation: g.occupation || "",
          address: g.address || "",
          memberSince: g.memberSince || undefined,
          savingsBalance:
            typeof g.savingsBalance === "number" ? g.savingsBalance : undefined,
          signature: g.signature ?? null,
        }))
      : [];
    setGuarantors(editGuarantors);
    setCurrentStep(0);
    setShowPrefilledNotice(false);
    setEditLoaded(true);
  }, [editIdParam, editLoaded, editQuery.data]);

  useEffect(() => {
    if (isEditMode) return;
    if (bankAccounts.length === 0) return;
    if (
      selectedBankAccountId &&
      bankAccounts.some((acc) => acc.id === selectedBankAccountId)
    ) {
      return;
    }
    const primary = bankAccounts.find((acc) => acc.isPrimary);
    setSelectedBankAccountId(primary?.id || bankAccounts[0].id);
  }, [bankAccounts, selectedBankAccountId, isEditMode]);

  useEffect(() => {
    if (initialSnapshotRef.current) return;

    if (isEditMode) {
      if (!editLoaded) return;
      initialSnapshotRef.current = buildLeaveSnapshot();
      return;
    }

    if (draftIdParam && !draftLoaded) return;
    if (bankAccountsQuery.isLoading) return;
    if (bankAccounts.length > 0 && !selectedBankAccountId) return;

    initialSnapshotRef.current = buildLeaveSnapshot();
  }, [
    bankAccounts.length,
    bankAccountsQuery.isLoading,
    buildLeaveSnapshot,
    draftIdParam,
    draftLoaded,
    editLoaded,
    isEditMode,
    selectedBankAccountId,
  ]);

  const termOptionsKey = termOptions.join(",");

  useEffect(() => {
    if (!termOptionsKey) return;
    const parsedTermOptions = termOptionsKey
      .split(",")
      .map((value) => Number(value));

    if (!parsedTermOptions.includes(repaymentTerm)) {
      setRepaymentTerm(parsedTermOptions[0]);
    }
  }, [termOptionsKey, repaymentTerm]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (ignorePromptRef.current) {
      ignorePromptRef.current = false;
      return false;
    }
    if (!hasUnsavedChanges) return false;
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    );
  });

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    pendingExitRef.current = {
      proceed: blocker.proceed,
      reset: blocker.reset,
    };
    setShowExitPrompt(true);
  }, [blocker.proceed, blocker.reset, blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges || ignorePromptRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const calculateRepayment = (
    principal: number,
    rate: number,
    months: number,
    rateType: "annual" | "monthly" | "total",
  ) => {
    return calculateLoanSummary({
      principal,
      rate,
      rateType,
      months,
    });
  };

  const repaymentDetails = calculateRepayment(
    loanAmount,
    interestRate,
    repaymentTerm,
    interestRateType,
  );

  const goToStep = (step: number) => {
    if (step >= 0 && step <= activeSteps.length - 1) {
      setCurrentStep(step);
    }
  };

  const getRequiredGuarantorCount = (amount: number) =>
    amount >= 500000 ? 2 : 1;

  const buildBackendGuarantors = (
    list: Guarantor[],
    requiredCount: number,
    includeAll = false,
  ): BackendGuarantor[] => {
    const selected = includeAll ? list : list.slice(0, requiredCount);
    const perPct = Math.floor(100 / Math.max(1, selected.length));

    return selected.map((g, idx) => ({
      type: g.type,
      profileId: g.type === "member" ? g.profileId : undefined,
      name: g.name,
      email: g.email,
      phone: g.phone,
      relationship: g.relationship,
      occupation: g.occupation,
      address: g.address,
      memberSince: g.memberSince,
      savingsBalance: g.savingsBalance,
      liabilityPercentage:
        idx === selected.length - 1
          ? 100 - perPct * (selected.length - 1)
          : perPct,
      requestMessage: null,
      signature: g.signature ?? null,
    }));
  };

  const normalizeDocList = (
    docs: {
      documentType?: string | null;
      name: string;
      type: string;
      size: number;
      url?: string | null;
    }[],
  ) =>
    docs
      .map((doc) => {
        const documentType = inferLoanDocumentType({
          documentType: doc.documentType ?? null,
          name: doc.name,
        });
        if (!documentType) return null;
        return {
          documentType,
          name:
            REQUIRED_LOAN_DOCUMENTS.find((item) => item.id === documentType)
              ?.name || String(doc.name || "document"),
          type: String(doc.type || "application/octet-stream"),
          size: Number(doc.size || 0),
          url: doc.url ? String(doc.url) : null,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        String(a?.documentType || "").localeCompare(
          String(b?.documentType || ""),
        ),
      );

  const normalizeSignature = (
    signature:
      | Guarantor["signature"]
      | BackendGuarantor["signature"]
      | null
      | undefined,
  ) => {
    if (!signature || typeof signature !== "object") return null;
    return {
      method: signature.method ?? null,
      text: signature.text ?? null,
      font: signature.font ?? null,
      imageUrl: signature.imageUrl ?? null,
      imagePublicId: signature.imagePublicId ?? null,
      signedAt: signature.signedAt ? String(signature.signedAt) : null,
    };
  };

  const normalizeGuarantorList = (list: Array<Guarantor | BackendGuarantor>) =>
    list.map((g) => ({
      type: g.type,
      profileId: g.profileId ? String(g.profileId) : null,
      name: String(g.name || "").trim(),
      email: String(g.email || "")
        .trim()
        .toLowerCase(),
      phone:
        normalizeNigerianPhone(String(g.phone || "")) ||
        String(g.phone || "").trim(),
      relationship: String(g.relationship || "").trim(),
      occupation: String(g.occupation || "").trim(),
      address: String(g.address || "").trim(),
      signature: normalizeSignature(g.signature),
    }));

  const buildEditRequestPayload = (
    editTarget: BackendLoanApplication,
  ): {
    loanAmount?: number;
    loanPurpose?: string;
    purposeDescription?: string;
    repaymentPeriod?: number;
    documents?: {
      documentType: LoanDocumentType;
      name: string;
      type: string;
      size: number;
      status: string;
      url?: string | null;
    }[];
    guarantors?: BackendGuarantor[];
    bankAccountId?: string;
  } => {
    const payload: {
      loanAmount?: number;
      loanPurpose?: string;
      purposeDescription?: string;
      repaymentPeriod?: number;
      documents?: {
        documentType: LoanDocumentType;
        name: string;
        type: string;
        size: number;
        status: string;
        url?: string | null;
      }[];
      guarantors?: BackendGuarantor[];
      bankAccountId?: string;
    } = {};

    const nextAmount = Number(loanAmount);
    const currentAmount = Number(editTarget.loanAmount || 0);
    if (nextAmount !== currentAmount) {
      payload.loanAmount = nextAmount;
    }

    const nextTerm = Number(repaymentTerm);
    const currentTerm = Number(editTarget.repaymentPeriod || 0);
    if (nextTerm !== currentTerm) {
      payload.repaymentPeriod = nextTerm;
    }

    const nextPurpose = purpose.trim();
    const currentPurpose = String(editTarget.loanPurpose || "").trim();
    if (nextPurpose !== currentPurpose) {
      payload.loanPurpose = nextPurpose;
    }

    const nextDescription = purposeDescription.trim();
    const currentDescription = String(
      editTarget.purposeDescription || "",
    ).trim();
    if (nextDescription !== currentDescription) {
      payload.purposeDescription = nextDescription;
    }

    const uploadedDocs = documents
      .filter((doc) => doc.status === "uploaded")
      .map((doc) => {
        const documentType = inferLoanDocumentType({
          documentType: doc.documentType ?? null,
          id: doc.id,
          name: doc.name,
        });
        if (!documentType) return null;
        const docDefinition = REQUIRED_LOAN_DOCUMENTS.find(
          (item) => item.id === documentType,
        );
        return {
          documentType,
          name: docDefinition?.name || doc.name,
          type: doc.type,
          size: doc.size,
          status: "uploaded",
          url: doc.url ?? null,
        };
      })
      .filter(Boolean);
    const currentDocs = normalizeDocList(editTarget.documents ?? []);
    const nextDocs = normalizeDocList(uploadedDocs);
    if (JSON.stringify(nextDocs) !== JSON.stringify(currentDocs)) {
      payload.documents = uploadedDocs;
    }

    const requiredGuarantors = getRequiredGuarantorCount(nextAmount);
    const currentGuarantors = normalizeGuarantorList(
      editTarget.guarantors ?? [],
    );
    const nextGuarantors = normalizeGuarantorList(guarantors);
    if (JSON.stringify(nextGuarantors) !== JSON.stringify(currentGuarantors)) {
      payload.guarantors = buildBackendGuarantors(
        guarantors,
        requiredGuarantors,
        true,
      );
    }

    const currentBankId = editTarget.disbursementBankAccountId
      ? String(editTarget.disbursementBankAccountId)
      : "";
    const nextBankId = selectedBankAccountId
      ? String(selectedBankAccountId)
      : "";
    if (nextBankId && nextBankId !== currentBankId) {
      payload.bankAccountId = nextBankId;
    }

    return payload;
  };

  const validateEditInputs = () => {
    if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
      return {
        title: "Invalid amount",
        description: "Enter a valid loan amount.",
      };
    }
    if (!Number.isFinite(repaymentTerm) || repaymentTerm <= 0) {
      return {
        title: "Invalid term",
        description: "Enter a valid repayment period.",
      };
    }
    if (!purpose.trim()) {
      return {
        title: "Loan purpose required",
        description: "Please provide a loan purpose.",
      };
    }
    return null;
  };

  const handleEditContinueToReview = () => {
    const editTarget = editQuery.data?.application;
    if (!editTarget) {
      toast({
        title: "Unable to load loan details",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const validationError = validateEditInputs();
    if (validationError) {
      toast({
        title: validationError.title,
        description: validationError.description,
        variant: "destructive",
      });
      return;
    }

    const hasUploadingDocs = documents.some(
      (doc) => doc.status === "uploading",
    );
    if (hasUploadingDocs) {
      toast({
        title: "Uploads in progress",
        description: "Please wait for document uploads to finish.",
      });
      return;
    }

    const hasErroredDocs = documents.some((doc) => doc.status === "error");
    if (hasErroredDocs) {
      toast({
        title: "Document upload error",
        description: "Please retry or remove failed uploads before continuing.",
        variant: "destructive",
      });
      return;
    }

    const payload = buildEditRequestPayload(editTarget);
    if (Object.keys(payload).length === 0) {
      toast({
        title: "No changes detected",
        description: "Adjust at least one field before reviewing.",
      });
      return;
    }

    goToStep(3);
  };

  const handleEditReviewStep = (step: number) => {
    if (!isEditMode) {
      goToStep(step);
      return;
    }
    if (step === 1 || step === 3) {
      goToStep(0);
      return;
    }
    if (step === 4) {
      goToStep(1);
      return;
    }
    if (step === 5) {
      goToStep(2);
      return;
    }
    goToStep(0);
  };

  const navigateWithBypass = (to: string) => {
    ignorePromptRef.current = true;
    navigate(to);
  };

  const buildDraftPayload = () => ({
    draftId,
    draftStep: currentStep,
    groupId: selectedGroup || null,
    groupName: selectedGroupData?.name || null,
    loanType,
    loanAmount,
    loanPurpose: purpose,
    purposeDescription,
    repaymentPeriod: repaymentTerm,
    interestRate,
    interestRateType,
    bankAccountId: selectedBankAccountId || null,
    documents: documents
      .map((d) => {
        const documentType = inferLoanDocumentType({
          documentType: d.documentType ?? null,
          id: d.id,
          name: d.name,
        });
        if (!documentType) return null;
        const definition = REQUIRED_LOAN_DOCUMENTS.find(
          (item) => item.id === documentType,
        );
        return {
          documentType,
          name: definition?.name || d.name,
          type: d.type,
          size: d.size,
          status: d.status,
          url: d.url,
        };
      })
      .filter(Boolean),
    guarantors: guarantors.map((g) => ({
      type: g.type,
      profileId: g.type === "member" ? g.profileId : undefined,
      name: g.name,
      email: g.email,
      phone: g.phone,
      relationship: g.relationship,
      occupation: g.occupation,
      address: g.address,
      memberSince: g.memberSince,
      savingsBalance: g.savingsBalance,
      liabilityPercentage: null,
      requestMessage: null,
      signature: g.signature ?? null,
    })),
  });

  const handleSaveDraft = async (exitAfter = false, onExit?: () => void) => {
    if (isEditMode) return;
    setIsSavingDraft(true);
    try {
      const response = await saveDraftMutation.mutateAsync(buildDraftPayload());
      const saved = response.application;
      setDraftId(String(saved._id));
      setDraftLastSavedAt(saved.draftLastSavedAt ?? saved.updatedAt ?? null);
      if (!draftId) {
        navigate(
          { pathname: location.pathname, search: `?draft=${saved._id}` },
          { replace: true },
        );
      }
      toast({
        title: "Draft saved",
        description: "You can continue this application anytime.",
      });
      initialSnapshotRef.current = buildLeaveSnapshot();
      if (exitAfter) {
        if (onExit) {
          onExit();
        } else {
          navigateWithBypass("/loans");
        }
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast({
        title: "Unable to save draft",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (isEditMode) return;
    if (!draftId) return;
    const confirmDelete = window.confirm(
      "Delete this draft? This action cannot be undone.",
    );
    if (!confirmDelete) return;
    try {
      await deleteDraftMutation.mutateAsync(draftId);
      toast({
        title: "Draft deleted",
        description: "Your draft has been removed.",
      });
      navigateWithBypass("/loans");
    } catch (error) {
      toast({
        title: "Unable to delete draft",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const handleExitStay = () => {
    pendingExitRef.current?.reset();
    pendingExitRef.current = null;
    setShowExitPrompt(false);
  };

  const proceedExit = (fallbackPath = "/loans") => {
    const pending = pendingExitRef.current;
    pendingExitRef.current = null;
    setShowExitPrompt(false);

    if (pending?.proceed) {
      pending.proceed();
      return;
    }

    navigateWithBypass(fallbackPath);
  };

  const handleExitDiscard = () => {
    proceedExit("/loans");
  };

  const handleExitSaveDraft = async () => {
    if (isEditMode) return;
    await handleSaveDraft(true, () => proceedExit("/loans"));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (isEditMode) {
        const editTarget = editQuery.data?.application;
        if (!editTarget) {
          toast({
            title: "Unable to load loan details",
            description: "Please refresh and try again.",
            variant: "destructive",
          });
          return;
        }

        const validationError = validateEditInputs();
        if (validationError) {
          toast({
            title: validationError.title,
            description: validationError.description,
            variant: "destructive",
          });
          return;
        }

        const hasUploadingDocs = documents.some(
          (doc) => doc.status === "uploading",
        );
        if (hasUploadingDocs) {
          toast({
            title: "Uploads in progress",
            description: "Please wait for document uploads to finish.",
          });
          return;
        }

        const hasErroredDocs = documents.some((doc) => doc.status === "error");
        if (hasErroredDocs) {
          toast({
            title: "Document upload error",
            description:
              "Please retry or remove failed uploads before submitting.",
            variant: "destructive",
          });
          return;
        }

        const payload = buildEditRequestPayload(editTarget);
        if (Object.keys(payload).length === 0) {
          toast({
            title: "No changes detected",
            description: "Adjust at least one field before submitting.",
          });
          return;
        }

        await createEditRequestMutation.mutateAsync({
          applicationId: editTarget._id,
          payload,
        });

        toast({
          title: "Edit request submitted",
          description: "Your changes have been sent for admin approval.",
        });
        navigateWithBypass("/loans");
        return;
      }

      if (!selectedBankAccountId) {
        toast({
          title: "Select Bank Account",
          description:
            "Please choose the bank account for loan disbursement before submitting.",
          variant: "destructive",
        });
        setCurrentStep(5);
        return;
      }

      const requiredGuarantors = getRequiredGuarantorCount(loanAmount);
      const backendGuarantors: BackendGuarantor[] = buildBackendGuarantors(
        guarantors,
        requiredGuarantors,
        true,
      );

      await createLoanApplicationMutation.mutateAsync({
        draftId: draftId || undefined,
        groupId: selectedGroup || null,
        groupName: selectedGroupData?.name || null,
        loanType,
        loanAmount,
        loanPurpose: purpose,
        purposeDescription,
        repaymentPeriod: repaymentTerm,
        interestRate,
        interestRateType,
        bankAccountId: selectedBankAccountId,
        documents: documents
          .map((d) => {
            const documentType = inferLoanDocumentType({
              documentType: d.documentType ?? null,
              id: d.id,
              name: d.name,
            });
            if (!documentType) return null;
            const definition = REQUIRED_LOAN_DOCUMENTS.find(
              (item) => item.id === documentType,
            );
            return {
              documentType,
              name: definition?.name || d.name,
              type: d.type,
              size: d.size,
              status: d.status,
              url: d.url,
            };
          })
          .filter(Boolean),
        guarantors: backendGuarantors,
      });

      toast({
        title: "Application Submitted!",
        description:
          "Your loan application has been submitted successfully. Guarantor requests have been sent.",
      });

      navigateWithBypass("/loans");
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast({
        title: "Error",
        description:
          message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    loading ||
    eligibilityQuery.isLoading ||
    myGroupsQuery.isLoading ||
    (draftIdParam && draftQuery.isLoading) ||
    (editIdParam && editQuery.isLoading)
  ) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/loans")}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Loans
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-bold text-gray-900 text-3xl">
            {isEditMode ? "Request Loan Edit" : "Apply for a Loan"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEditMode
              ? "Update the fields below and submit your changes for approval."
              : "Complete the application form below to request a loan from your Contributions group"}
          </p>
        </div>

        {/* Pre-filled Notice */}
        {showPrefilledNotice && prefilledData && (
          <div className="flex items-start gap-3 bg-blue-50 mb-6 p-4 border border-blue-200 rounded-xl">
            <Calculator className="mt-0.5 w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">
                Calculator Data Applied
              </p>
              <p className="mt-1 text-blue-700 text-sm">
                Your loan calculator selections have been pre-filled:
                <span className="font-semibold">
                  {" "}
                  ₦{(prefilledData.amount || 100000).toLocaleString()}
                </span>{" "}
                for
                <span className="font-semibold">
                  {" "}
                  {prefilledData.term || 10} months
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowPrefilledNotice(false)}
              className="text-blue-500 hover:text-blue-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Progress Steps - Enhanced */}
        <div className="bg-white shadow-sm mb-8 p-6 border border-gray-100 rounded-2xl">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">
                  {isEditMode
                    ? "Edit Request Progress"
                    : "Application Progress"}
                </h2>
                {!isEditMode && draftId && (
                  <span className="bg-amber-100 px-2.5 py-0.5 rounded-full font-medium text-amber-700 text-xs">
                    Draft
                  </span>
                )}
              </div>
              {!isEditMode && draftLastSavedAt && (
                <p className="text-gray-500 text-xs">
                  Last saved {formatDate(draftLastSavedAt)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-500 text-sm">
                Step {currentStep + 1} of {activeSteps.length}
              </span>
              {!isEditMode && (
                <>
                  <button
                    onClick={() => handleSaveDraft(false)}
                    disabled={isSavingDraft}
                    className="hover:bg-emerald-50 disabled:opacity-60 px-3 py-1.5 border border-emerald-200 rounded-lg font-semibold text-emerald-700 text-xs"
                  >
                    {isSavingDraft ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={() => handleSaveDraft(true)}
                    disabled={isSavingDraft}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1.5 rounded-lg font-semibold text-white text-xs"
                  >
                    Save & Exit
                  </button>
                  {draftId && (
                    <button
                      onClick={handleDeleteDraft}
                      className="hover:bg-red-50 px-3 py-1.5 border border-red-200 rounded-lg font-semibold text-red-600 text-xs"
                    >
                      Delete Draft
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 mb-6 rounded-full h-2">
            <div
              className="bg-emerald-500 rounded-full h-2 transition-all duration-500"
              style={{
                width: `${((currentStep + 1) / activeSteps.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex justify-between items-center">
            {activeSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => index < currentStep && goToStep(index)}
                    disabled={index > currentStep}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      index < currentStep
                        ? "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                        : index === currentStep
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold text-sm">{index + 1}</span>
                    )}
                  </button>
                  <span
                    className={`mt-2 text-xs font-medium hidden md:block ${
                      index <= currentStep
                        ? "text-emerald-600"
                        : "text-gray-400"
                    }`}
                  >
                    {step.name}
                  </span>
                  <span
                    className={`mt-2 text-xs font-medium md:hidden ${
                      index <= currentStep
                        ? "text-emerald-600"
                        : "text-gray-400"
                    }`}
                  >
                    {step.shortName}
                  </span>
                </div>
                {index < activeSteps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full ${
                      index < currentStep ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Current Step Description */}
          <div className="bg-gray-50 mt-4 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 text-sm">
                {activeSteps[currentStep].description}
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {isEditMode ? (
            <>
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Edit Request Details
                    </h3>
                    <p className="mt-1 text-gray-500 text-sm">
                      Update the fields below. Your request will be reviewed
                      before changes are applied.
                    </p>
                    {editQuery.data?.application && (
                      <div className="bg-gray-50 mt-4 p-4 rounded-xl text-gray-600 text-sm">
                        <p className="font-medium text-gray-900">
                          {editQuery.data.application.loanPurpose}
                        </p>
                        <p className="text-gray-500">
                          {editQuery.data.application.groupName ||
                            "CRC Connect"}
                        </p>
                      </div>
                    )}
                    <div className="gap-4 grid mt-6">
                      <div>
                        <label className="font-medium text-gray-700 text-sm">
                          Loan Amount
                        </label>
                        <Input
                          type="number"
                          value={loanAmount}
                          onChange={(e) =>
                            setLoanAmount(Number(e.target.value || 0))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-gray-700 text-sm">
                          Repayment Period (Months)
                        </label>
                        <Input
                          type="number"
                          value={repaymentTerm}
                          onChange={(e) =>
                            setRepaymentTerm(Number(e.target.value || 0))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-gray-700 text-sm">
                          Loan Purpose
                        </label>
                        <Input
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-gray-700 text-sm">
                          Purpose Description
                        </label>
                        <Textarea
                          value={purposeDescription}
                          onChange={(e) =>
                            setPurposeDescription(e.target.value)
                          }
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold text-gray-900">
                        Required Documents
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">
                        Keep the same three required documents aligned with the
                        main application flow when requesting edits.
                      </p>
                    </div>
                    <LoanDocumentUpload
                      documents={documents}
                      onDocumentsChange={setDocuments}
                      showNavigation={false}
                    />
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/loans")}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => goToStep(1)}
                      disabled={!allRequiredDocumentsUploaded}
                    >
                      Continue to Guarantors
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <LoanGuarantorInfo
                  guarantors={guarantors}
                  onGuarantorsChange={setGuarantors}
                  onContinue={() => goToStep(2)}
                  onBack={() => goToStep(0)}
                  loanAmount={loanAmount}
                  groupMembers={groupMembers}
                  currentUserId={profile?.id ?? null}
                />
              )}

              {currentStep === 2 && (
                <LoanBankDetails
                  bankAccounts={bankAccounts}
                  bankAccountsLoading={bankAccountsQuery.isLoading}
                  bankAccountsError={bankAccountsQuery.isError}
                  selectedAccountId={selectedBankAccountId}
                  onSelectAccount={setSelectedBankAccountId}
                  onContinue={handleEditContinueToReview}
                  onBack={() => goToStep(1)}
                  currentAccount={editBankFallback}
                  autoSelectOnEmpty={false}
                />
              )}

              {currentStep === 3 && (
                <LoanReviewSubmit
                  loanAmount={loanAmount}
                  loanType={loanType}
                  purpose={purpose}
                  purposeDescription={purposeDescription}
                  repaymentTerm={repaymentTerm}
                  interestRate={interestRate}
                  interestRateType={interestRateType}
                  monthlyPayment={repaymentDetails.monthlyPayment}
                  totalInterest={repaymentDetails.totalInterest}
                  totalPayment={repaymentDetails.totalPayment}
                  documents={documents}
                  guarantors={guarantors}
                  bankAccount={selectedBankAccount}
                  groupName={
                    selectedGroupData?.name ||
                    editQuery.data?.application?.groupName ||
                    ""
                  }
                  onSubmit={handleSubmit}
                  onBack={() => goToStep(2)}
                  onEditStep={handleEditReviewStep}
                  isSubmitting={isSubmitting}
                  submitLabel="Submit Edit Request"
                  requireBankAccount={false}
                />
              )}
            </>
          ) : (
            <>
              {currentStep === 0 && (
                <LoanEligibilityCheck
                  eligibilityData={
                    eligibilityQuery.data ?? {
                      savingsBalance: 0,
                      contributionBalance: 0,
                      totalContributions: 0,
                      membershipDuration: 0,
                      groupsJoined: 0,
                      attendanceRate: 0,
                      contributionStreak: 0,
                      previousLoans: 0,
                      defaultedLoans: 0,
                      overdueContributions: 0,
                      overdueRepayments: 0,
                      contributionWindow: {
                        startDay: 1,
                        endDay: 31,
                        isOpen: true,
                      },
                      creditScore: 0,
                    }
                  }
                  selectedGroup={selectedGroup}
                  requestedLoanAmount={loanAmount}
                  onGroupSelect={setSelectedGroup}
                  onContinue={() => goToStep(1)}
                  groups={groupOptions}
                />
              )}

              {currentStep === 1 && (
                <LoanAmountSelector
                  maxAmount={maxLoanAmount}
                  minAmount={minLoanAmount}
                  selectedAmount={loanAmount}
                  loanType={loanType}
                  facilities={LOAN_FACILITIES}
                  purpose={purpose}
                  purposeDescription={purposeDescription}
                  onAmountChange={setLoanAmount}
                  onLoanTypeChange={setLoanType}
                  onPurposeChange={setPurpose}
                  onPurposeDescriptionChange={setPurposeDescription}
                  onContinue={() => goToStep(2)}
                  onBack={() => goToStep(0)}
                  interestRate={interestRate}
                  interestRateType={interestRateType}
                  interestLabel={interestLabel}
                />
              )}

              {currentStep === 2 && (
                <LoanRepaymentTerms
                  loanAmount={loanAmount}
                  interestRate={interestRate}
                  interestRateType={interestRateType}
                  selectedTerm={repaymentTerm}
                  onTermChange={setRepaymentTerm}
                  termOptions={termOptions}
                  onContinue={() => goToStep(3)}
                  onBack={() => goToStep(1)}
                />
              )}

              {currentStep === 3 && (
                <LoanDocumentUpload
                  documents={documents}
                  onDocumentsChange={setDocuments}
                  onContinue={() => goToStep(4)}
                  onBack={() => goToStep(2)}
                />
              )}

              {currentStep === 4 && (
                <LoanGuarantorInfo
                  guarantors={guarantors}
                  onGuarantorsChange={setGuarantors}
                  onContinue={() => goToStep(5)}
                  onBack={() => goToStep(3)}
                  loanAmount={loanAmount}
                  groupMembers={groupMembers}
                  currentUserId={profile?.id ?? null}
                />
              )}

              {currentStep === 5 && (
                <LoanBankDetails
                  bankAccounts={bankAccounts}
                  bankAccountsLoading={bankAccountsQuery.isLoading}
                  bankAccountsError={bankAccountsQuery.isError}
                  selectedAccountId={selectedBankAccountId}
                  onSelectAccount={setSelectedBankAccountId}
                  onContinue={() => goToStep(6)}
                  onBack={() => goToStep(4)}
                />
              )}

              {currentStep === 6 && (
                <LoanReviewSubmit
                  loanAmount={loanAmount}
                  loanType={loanType}
                  purpose={purpose}
                  purposeDescription={purposeDescription}
                  repaymentTerm={repaymentTerm}
                  interestRate={interestRate}
                  interestRateType={interestRateType}
                  monthlyPayment={repaymentDetails.monthlyPayment}
                  totalInterest={repaymentDetails.totalInterest}
                  totalPayment={repaymentDetails.totalPayment}
                  documents={documents}
                  guarantors={guarantors}
                  bankAccount={selectedBankAccount}
                  groupName={selectedGroupData?.name || ""}
                  onSubmit={handleSubmit}
                  onBack={() => goToStep(5)}
                  onEditStep={goToStep}
                  isSubmitting={isSubmitting}
                />
              )}
            </>
          )}
        </div>

        {/* Loan Summary Sidebar (visible on larger screens) */}
        {currentStep > 0 && (
          <div className="hidden lg:block top-32 right-8 fixed bg-white shadow-lg p-6 border rounded-xl w-72">
            <h3 className="mb-4 font-semibold text-gray-900">Loan Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">
                  ₦{loanAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Term</span>
                <span className="font-medium">{repaymentTerm} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Type</span>
                <span className="font-medium">
                  {loanFacility?.name || "Loan"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest Rate</span>
                <span className="font-medium">{interestLabel}</span>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Payment</span>
                  <span className="font-bold text-emerald-600">
                    ₦{repaymentDetails.monthlyPayment.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Interest</span>
                <span className="font-medium text-amber-600">
                  ₦{repaymentDetails.totalInterest.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-gray-600">Total Repayment</span>
                <span className="font-bold">
                  ₦{repaymentDetails.totalPayment.toLocaleString()}
                </span>
              </div>
            </div>

            {selectedGroupData && (
              <div className="bg-emerald-50 mt-4 p-3 rounded-lg">
                <p className="text-emerald-700 text-xs">
                  Borrowing from:{" "}
                  <span className="font-medium">{selectedGroupData.name}</span>
                </p>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={() => setShowLoanFaq(true)}
                className="font-semibold text-emerald-600 hover:text-emerald-700 text-sm"
              >
                View Loan FAQ
              </button>
            </div>
          </div>
        )}

        {/* Help Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl text-white">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-lg">Need Help?</h3>
              <p className="mb-4 text-blue-100 text-sm leading-relaxed">
                Questions about loan terms, guarantors, or documents? Our
                support team is here to help.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/loans")}
                  className="bg-white hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-blue-600 text-sm transition-colors"
                >
                  Use Loan Calculator
                </button>
                <button
                  onClick={() => setShowLoanFaq(true)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                >
                  View Loan FAQ
                </button>
              </div>
            </div>
          </div>
        </div>

        <AlertDialog
          open={showExitPrompt}
          onOpenChange={(open) => {
            if (!open) {
              handleExitStay();
              return;
            }
            setShowExitPrompt(true);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{exitPromptTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {exitPromptDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex sm:flex-row flex-col sm:justify-end gap-2">
              <AlertDialogCancel
                onClick={handleExitStay}
                disabled={isSavingDraft}
              >
                Stay
              </AlertDialogCancel>
              {isEditMode ? (
                <Button
                  type="button"
                  onClick={handleExitDiscard}
                  disabled={isSavingDraft}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Discard Changes
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExitDiscard}
                    disabled={isSavingDraft}
                    className="hover:bg-red-50 border-red-200 text-red-600"
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    onClick={handleExitSaveDraft}
                    disabled={isSavingDraft}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSavingDraft ? "Saving..." : "Save Draft & Exit"}
                  </Button>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <LoanFaqModal open={showLoanFaq} onOpenChange={setShowLoanFaq} />
      </main>
    </div>
  );
};

const LoanApplication: React.FC = () => {
  return (
    <AuthProvider>
      <LoanApplicationContent />
    </AuthProvider>
  );
};

export default LoanApplication;


