import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  Download,
  Printer,
  Calendar,
  Mail,
  Phone,
  Building2,
  Info,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminLoanBankAccountsQuery } from "@/hooks/admin/useAdminLoanBankAccountsQuery";
import { useNotificationPreferencesQuery } from "@/hooks/profile/useNotificationPreferencesQuery";
import { useUpdateNotificationPreferencesMutation } from "@/hooks/profile/useUpdateNotificationPreferencesMutation";
import { calculateLoanSummary } from "@/lib/loanMath";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
import {
  downloadAdminLoanApplicationPdf,
  emailAdminLoanApplicationPdf,
  exportAdminLoanApplications,
} from "@/lib/adminLoans";
import { useAdminLoanApplicationsQuery } from "@/hooks/admin/useAdminLoanApplicationsQuery";
import { useReconcileAdminLoanApplicationMutation } from "@/hooks/admin/useReconcileAdminLoanApplicationMutation";
import { useReviewAdminLoanEditRequestMutation } from "@/hooks/admin/useReviewAdminLoanEditRequestMutation";
import type { NotificationPreferences } from "@/lib/notificationPreferences";

interface LoanDocument {
  name: string;
  type: string;
  size: number;
  status: string;
  url?: string | null;
}

interface LoanGuarantor {
  type: "member" | "external";
  profileId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  occupation?: string | null;
  address?: string | null;
  memberSince?: string | null;
  savingsBalance?: number | null;
  liabilityPercentage?: number | null;
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    signedAt?: string | null;
  } | null;
}

interface LoanEditChange {
  field: string;
  label: string;
  from?: string | number | null;
  to?: string | number | null;
}

interface LoanEditRequest {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  changes?: LoanEditChange[];
  documents?: LoanDocument[];
}

interface AdminBankAccount {
  id: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

interface LoanApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  groupId?: string | null;
  groupName: string;
  loanCode?: string | null;
  loanNumber?: number | null;
  loanType?: string | null;
  loanAmount: number;
  loanPurpose: string;
  purposeDescription?: string | null;
  repaymentPeriod: number;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  approvedAmount?: number | null;
  approvedInterestRate?: number | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  repaymentStartDate?: string | null;
  monthlyPayment?: number | null;
  totalRepayable?: number | null;
  remainingBalance?: number | null;
  disbursementBankAccountId?: string | null;
  disbursementBankName?: string | null;
  disbursementBankCode?: string | null;
  disbursementAccountNumber?: string | null;
  disbursementAccountName?: string | null;
  payoutReference?: string | null;
  payoutGateway?: string | null;
  payoutTransferCode?: string | null;
  payoutStatus?: string | null;
  payoutOtpResentAt?: string | null;
  monthlyIncome: number;
  guarantorName: string;
  guarantorPhone: string;
  guarantors?: LoanGuarantor[];
  documents?: LoanDocument[];
  latestEditRequest?: LoanEditRequest | null;
  status:
    | "draft"
    | "pending"
    | "under_review"
    | "approved"
    | "rejected"
    | "disbursed";
  createdAt: string;
  reviewNotes?: string;
}

type LoanPayoutUpdate = {
  payoutReference?: string | null;
  payoutGateway?: string | null;
  payoutTransferCode?: string | null;
  payoutStatus?: string | null;
  payoutOtpResentAt?: string | null;
  disbursementBankAccountId?: string | null;
  disbursementBankName?: string | null;
  disbursementBankCode?: string | null;
  disbursementAccountNumber?: string | null;
  disbursementAccountName?: string | null;
};

interface LoanReviewPanelProps {
  onApprove: (
    id: string,
    notes: string,
    approvedInterestRate?: number | null,
  ) => void;
  onReject: (id: string, notes: string) => void;
  onStartReview: (id: string) => void;
  onDisburse: (
    id: string,
    repaymentStartDate?: string | null,
    bankAccountId?: string | null,
  ) => Promise<LoanPayoutUpdate | null>;
  onVerifyTransfer: (
    id: string,
    repaymentStartDate?: string | null,
  ) => Promise<LoanPayoutUpdate>;
  onFinalizeOtp: (
    id: string,
    transferCode: string,
    otp: string,
    repaymentStartDate?: string | null,
  ) => Promise<LoanPayoutUpdate>;
  onResendOtp: (
    id: string,
    transferCode: string,
  ) => Promise<{ application: LoanPayoutUpdate; retryAfter?: number }>;
  groupOptions?: { id: string; name: string }[];
  canDisburse?: boolean;
  canFinalizeOtp?: boolean;
}

export default function LoanReviewPanel({
  onApprove,
  onReject,
  onStartReview,
  onDisburse,
  onVerifyTransfer,
  onFinalizeOtp,
  onResendOtp,
  groupOptions = [],
  canDisburse = true,
  canFinalizeOtp = true,
}: LoanReviewPanelProps) {
  const { toast } = useToast();
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [editReviewNotes, setEditReviewNotes] = useState("");
  const [editReviewAction, setEditReviewAction] = useState<
    "approved" | "rejected" | null
  >(null);
  const [editRequestTarget, setEditRequestTarget] =
    useState<LoanApplication | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [repaymentStartDate, setRepaymentStartDate] = useState("");
  const [selectedDisbursementAccountId, setSelectedDisbursementAccountId] =
    useState("");
  const [approvedRateInput, setApprovedRateInput] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [isEmailingPdf, setIsEmailingPdf] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [otpTarget, setOtpTarget] = useState<LoanApplication | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [otpAction, setOtpAction] = useState<"finalize" | "resend" | null>(
    null,
  );
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [verifyTargetId, setVerifyTargetId] = useState<string | null>(null);
  const [recipientOptions, setRecipientOptions] = useState({
    sendApplicant: true,
    sendGuarantors: true,
    extraEmails: "",
  });
  const [recipientDirty, setRecipientDirty] = useState(false);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewItems, setDocPreviewItems] = useState<LoanDocument[]>([]);
  const [docPreviewIndex, setDocPreviewIndex] = useState(0);

  const preferencesQuery = useNotificationPreferencesQuery();
  const updatePreferencesMutation = useUpdateNotificationPreferencesMutation();
  const reconcileLoanMutation = useReconcileAdminLoanApplicationMutation();
  const reviewEditRequestMutation = useReviewAdminLoanEditRequestMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, groupFilter, yearFilter, monthFilter, searchQuery]);

  const loansQuery = useAdminLoanApplicationsQuery({
    status: statusFilter,
    search: searchQuery || undefined,
    groupId: groupFilter !== "all" ? groupFilter : undefined,
    year: yearFilter !== "all" ? yearFilter : undefined,
    month: monthFilter !== "all" ? monthFilter : undefined,
    page: currentPage,
    limit: 10,
  });

  const applications = useMemo(() => {
    const raw = loansQuery.data?.applications ?? [];
    return raw.map((a) => {
      const guarantor =
        Array.isArray(a.guarantors) && a.guarantors.length > 0
          ? a.guarantors[0]
          : null;
      return {
        id: a._id,
        applicantName: a.applicant?.fullName || "Applicant",
        applicantEmail: a.applicant?.email || "",
        applicantPhone: a.applicant?.phone || "",
        groupId: a.groupId ?? null,
        groupName: a.groupName || "—",
        loanCode: a.loanCode ?? null,
        loanNumber: a.loanNumber ?? null,
        loanAmount: Number(a.loanAmount || 0),
        loanPurpose: String(a.loanPurpose || ""),
        purposeDescription: a.purposeDescription ?? "",
        loanType: a.loanType ?? null,
        repaymentPeriod: Number(a.repaymentPeriod || 0),
        interestRate: a.interestRate ?? null,
        interestRateType: a.interestRateType ?? null,
        approvedAmount: a.approvedAmount ?? null,
        approvedInterestRate: a.approvedInterestRate ?? null,
        approvedAt: a.approvedAt ?? null,
        disbursedAt: a.disbursedAt ?? null,
        repaymentStartDate: a.repaymentStartDate ?? null,
        monthlyPayment: a.monthlyPayment ?? null,
        totalRepayable: a.totalRepayable ?? null,
        remainingBalance: a.remainingBalance ?? null,
        monthlyIncome: Number(a.monthlyIncome || 0),
        guarantorName: guarantor?.name || "—",
        guarantorPhone: guarantor?.phone || "—",
        guarantors: Array.isArray(a.guarantors) ? a.guarantors : [],
        documents: Array.isArray(a.documents) ? a.documents : [],
        status: a.status as LoanApplication["status"],
        createdAt: a.createdAt,
        reviewNotes: a.reviewNotes ?? undefined,
        latestEditRequest: a.latestEditRequest ?? null,
        disbursementBankAccountId: a.disbursementBankAccountId ?? null,
        disbursementBankName: a.disbursementBankName ?? null,
        disbursementBankCode: a.disbursementBankCode ?? null,
        disbursementAccountNumber: a.disbursementAccountNumber ?? null,
        disbursementAccountName: a.disbursementAccountName ?? null,
        payoutReference: a.payoutReference ?? null,
        payoutGateway: a.payoutGateway ?? null,
        payoutTransferCode: a.payoutTransferCode ?? null,
        payoutStatus: a.payoutStatus ?? null,
        payoutOtpResentAt: a.payoutOtpResentAt ?? null,
      };
    });
  }, [loansQuery.data?.applications]);

  const otpResendCooldownSeconds =
    loansQuery.data?.otpResendCooldownSeconds ?? 0;
  const total = loansQuery.data?.total ?? applications.length;
  const limit = loansQuery.data?.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const summary = loansQuery.data?.summary;
  const pageStart = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const pageEnd = Math.min(currentPage * limit, total);

  const groupSelectOptions = useMemo(() => {
    if (groupOptions.length > 0) {
      return groupOptions;
    }
    const dedup = new Map<string, string>();
    applications.forEach((app) => {
      if (app.groupId && app.groupName) {
        dedup.set(app.groupId, app.groupName);
      }
    });
    return Array.from(dedup.entries()).map(([id, name]) => ({ id, name }));
  }, [applications, groupOptions]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, idx) => currentYear - idx);
  }, []);

  const monthOptions = useMemo(
    () => [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      { value: 3, label: "March" },
      { value: 4, label: "April" },
      { value: 5, label: "May" },
      { value: 6, label: "June" },
      { value: 7, label: "July" },
      { value: 8, label: "August" },
      { value: 9, label: "September" },
      { value: 10, label: "October" },
      { value: 11, label: "November" },
      { value: 12, label: "December" },
    ],
    [],
  );
  const bankAccountsQuery = useAdminLoanBankAccountsQuery(
    selectedLoan?.id ?? null,
    showDisburseModal && Boolean(selectedLoan?.id),
  );
  const bankAccountsLoading = bankAccountsQuery.isLoading;
  const bankAccountsError = bankAccountsQuery.isError;
  const bankAccounts: AdminBankAccount[] = (bankAccountsQuery.data ?? []).map(
    (acc: any) => ({
      id: String(acc._id),
      bankName: String(acc.bankName),
      bankCode: acc.bankCode ? String(acc.bankCode) : undefined,
      accountNumber: String(acc.accountNumber),
      accountName: String(acc.accountName),
      isPrimary: Boolean(acc.isPrimary),
    }),
  );
  const selectedDisbursementAccount =
    bankAccounts.find((acc) => acc.id === selectedDisbursementAccountId) ||
    null;

  const pendingCount =
    summary?.pendingCount ??
    applications.filter((a) => a.status === "pending").length;
  const underReviewCount =
    summary?.underReviewCount ??
    applications.filter((a) => a.status === "under_review").length;
  const approvedCount =
    summary?.approvedCount ??
    applications.filter(
      (a) => a.status === "approved" || a.status === "disbursed",
    ).length;
  const totalRequested =
    summary?.totalRequested ??
    applications
      .filter((a) => a.status === "pending" || a.status === "under_review")
      .reduce((sum, a) => sum + a.loanAmount, 0);

  const filteredApplications = applications;

  const otpBusy = otpAction !== null;
  const resendDisabled = !otpTarget || otpBusy || resendCooldownSeconds > 0;
  const resendLabel =
    resendCooldownSeconds > 0
      ? `Resend OTP (${resendCooldownSeconds}s)`
      : "Resend OTP";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="mr-1 w-3 h-3" />
            Pending
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-gray-100 text-gray-600">
            <Clock className="mr-1 w-3 h-3" />
            Draft
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Eye className="mr-1 w-3 h-3" />
            Under Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle className="mr-1 w-3 h-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="mr-1 w-3 h-3" />
            Rejected
          </Badge>
        );
      case "disbursed":
        return (
          <Badge className="bg-purple-100 text-purple-700">
            <CreditCard className="mr-1 w-3 h-3" />
            Disbursed
          </Badge>
        );
      default:
        return null;
    }
  };

  const resolveRateInfo = (loan: LoanApplication | null) => {
    const facility = getLoanFacility(loan?.loanType || "");
    const rateType = (loan?.interestRateType ||
      facility?.interestRateType ||
      "annual") as "annual" | "monthly" | "total";
    const rate = Number(
      loan?.approvedInterestRate ??
        loan?.interestRate ??
        facility?.interestRate ??
        facility?.interestRateRange?.min ??
        0,
    );

    return { facility, rateType, rate };
  };

  const selectedRateInfo = selectedLoan ? resolveRateInfo(selectedLoan) : null;
  const selectedPrincipal = selectedLoan
    ? Number(selectedLoan.approvedAmount ?? selectedLoan.loanAmount ?? 0)
    : 0;
  const selectedLoanSummary =
    selectedLoan && selectedRateInfo
      ? calculateLoanSummary({
          principal: selectedPrincipal,
          rate: selectedRateInfo.rate,
          rateType: selectedRateInfo.rateType,
          months: selectedLoan.repaymentPeriod,
        })
      : null;
  const selectedMonthlyPayment =
    selectedLoan?.monthlyPayment ?? selectedLoanSummary?.monthlyPayment ?? 0;
  const selectedTotalRepayable =
    selectedLoan?.totalRepayable ??
    selectedLoanSummary?.totalPayment ??
    selectedPrincipal;
  const selectedInterestLabel = selectedRateInfo
    ? formatInterestLabel(
        selectedRateInfo.rate,
        selectedRateInfo.rateType,
        selectedRateInfo.facility?.interestRateRange,
      )
    : "";

  const formatCurrency = (value?: number | null) => {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeValue);
  };

  const formatCompactCurrency = (value?: number | null) => {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(safeValue);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatFileSize = (value?: number | null) => {
    const size = Number(value || 0);
    if (!Number.isFinite(size) || size <= 0) return "-";
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  };

  const parseEmailEntries = (value: string) =>
    value
      .split(/[,\n;]/g)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const extraRecipientEntries = parseEmailEntries(recipientOptions.extraEmails);
  const invalidExtraEmails = extraRecipientEntries.filter(
    (email) => !isValidEmail(email),
  );
  const extraRecipientEmails = extraRecipientEntries.filter((email) =>
    isValidEmail(email),
  );
  const resolvedRecipients = (() => {
    if (!selectedLoan) return [];
    const recipients: Array<{ label: string; name?: string; email: string }> =
      [];

    if (
      recipientOptions.sendApplicant &&
      selectedLoan.applicantEmail &&
      isValidEmail(selectedLoan.applicantEmail)
    ) {
      recipients.push({
        label: "Applicant",
        name: selectedLoan.applicantName,
        email: normalizeEmail(selectedLoan.applicantEmail),
      });
    }

    if (
      recipientOptions.sendGuarantors &&
      Array.isArray(selectedLoan.guarantors)
    ) {
      selectedLoan.guarantors.forEach((g) => {
        if (g?.email && isValidEmail(g.email)) {
          recipients.push({
            label: "Guarantor",
            name: g.name,
            email: normalizeEmail(g.email),
          });
        }
      });
    }

    extraRecipientEmails.forEach((email) => {
      recipients.push({
        label: "Extra",
        name: "",
        email: normalizeEmail(email),
      });
    });

    const unique = new Map<
      string,
      { label: string; name?: string; email: string }
    >();
    recipients.forEach((recipient) => {
      if (!unique.has(recipient.email)) {
        unique.set(recipient.email, recipient);
      }
    });

    return Array.from(unique.values());
  })();

  const hasEmailRecipients = resolvedRecipients.length > 0;
  const hasTooManyRecipients = resolvedRecipients.length > 10;

  const buildRecipientDefaults = (
    loan: LoanApplication,
    prefs?: NotificationPreferences | null,
  ) => {
    const applicantHasEmail = Boolean(loan.applicantEmail);
    const guarantorHasEmail =
      Array.isArray(loan.guarantors) &&
      loan.guarantors.some((g) => Boolean(g.email));
    const sendApplicant = prefs?.loanPdfSendApplicant ?? true;
    const sendGuarantors = prefs?.loanPdfSendGuarantors ?? true;
    const extraEmails = Array.isArray(prefs?.loanPdfExtraEmails)
      ? prefs?.loanPdfExtraEmails.filter(Boolean)
      : [];

    return {
      sendApplicant: applicantHasEmail ? sendApplicant : false,
      sendGuarantors: guarantorHasEmail ? sendGuarantors : false,
      extraEmails: extraEmails.join(", "),
    };
  };

  const getLoanLabel = (loan: LoanApplication) =>
    loan.loanCode ||
    (loan.loanNumber ? `LN-${loan.loanNumber}` : null) ||
    `LN-${String(loan.id).slice(-6).toUpperCase()}`;

  const getDocumentStatusTone = (status?: string | null) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("approved") || normalized.includes("verified")) {
      return "bg-emerald-100 text-emerald-700";
    }
    if (normalized.includes("pending")) {
      return "bg-amber-100 text-amber-700";
    }
    if (normalized.includes("rejected") || normalized.includes("failed")) {
      return "bg-red-100 text-red-700";
    }
    return "bg-gray-100 text-gray-600";
  };

  const openDocPreview = (docs: LoanDocument[] = [], index = 0) => {
    const safeDocs = Array.isArray(docs) ? docs : [];
    const safeIndex = safeDocs.length
      ? Math.min(Math.max(0, index), safeDocs.length - 1)
      : 0;
    setDocPreviewItems(safeDocs);
    setDocPreviewIndex(safeIndex);
    setDocPreviewOpen(true);
  };

  const closeDocPreview = () => {
    setDocPreviewOpen(false);
    setDocPreviewItems([]);
    setDocPreviewIndex(0);
  };

  const getRiskTone = (dtiValue: number | null) => {
    if (dtiValue == null || Number.isNaN(dtiValue)) {
      return { label: "Risk Unknown", classes: "bg-gray-100 text-gray-600" };
    }
    if (dtiValue > 45) {
      return { label: "High Risk", classes: "bg-red-100 text-red-700" };
    }
    if (dtiValue > 35) {
      return { label: "Watchlist", classes: "bg-amber-100 text-amber-700" };
    }
    return { label: "Healthy", classes: "bg-emerald-100 text-emerald-700" };
  };

  const handleViewDetails = (loan: LoanApplication) => {
    setSelectedLoan(loan);
    setShowDetailModal(true);
    setRecipientDirty(false);
    setRecipientOptions(buildRecipientDefaults(loan, preferencesQuery.data));
  };

  useEffect(() => {
    if (!showDetailModal || !selectedLoan || recipientDirty) return;
    if (!preferencesQuery.data) return;
    setRecipientOptions(
      buildRecipientDefaults(selectedLoan, preferencesQuery.data),
    );
  }, [preferencesQuery.data, recipientDirty, selectedLoan, showDetailModal]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return undefined;
    const timer = setTimeout(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldownSeconds]);

  useEffect(() => {
    if (!otpTarget) {
      setResendCooldownSeconds(0);
      return;
    }
    if (!otpTarget.payoutOtpResentAt || !otpResendCooldownSeconds) {
      setResendCooldownSeconds(0);
      return;
    }
    const lastResentAt = Date.parse(otpTarget.payoutOtpResentAt);
    if (!Number.isFinite(lastResentAt)) {
      setResendCooldownSeconds(0);
      return;
    }
    const elapsedSeconds = Math.floor((Date.now() - lastResentAt) / 1000);
    const remainingSeconds = Math.max(
      otpResendCooldownSeconds - elapsedSeconds,
      0,
    );
    setResendCooldownSeconds(remainingSeconds);
  }, [otpTarget, otpResendCooldownSeconds]);

  useEffect(() => {
    if (!showDisburseModal || !selectedLoan) return;
    if (bankAccounts.length === 0) {
      setSelectedDisbursementAccountId("");
      return;
    }
    if (
      selectedDisbursementAccountId &&
      bankAccounts.some((acc) => acc.id === selectedDisbursementAccountId)
    ) {
      return;
    }
    const preferred =
      selectedLoan.disbursementBankAccountId &&
      bankAccounts.find(
        (acc) => acc.id === selectedLoan.disbursementBankAccountId,
      )
        ? selectedLoan.disbursementBankAccountId
        : null;
    const primary = bankAccounts.find((acc) => acc.isPrimary)?.id || null;
    setSelectedDisbursementAccountId(
      preferred || primary || bankAccounts[0].id,
    );
  }, [
    bankAccounts,
    selectedDisbursementAccountId,
    selectedLoan,
    showDisburseModal,
  ]);

  const handleReview = (
    loan: LoanApplication,
    action: "approve" | "reject",
  ) => {
    setSelectedLoan(loan);
    setReviewAction(action);
    setReviewNotes("");
    const facility = getLoanFacility(loan.loanType || "");
    const defaultRate =
      loan.approvedInterestRate ??
      loan.interestRate ??
      facility?.interestRate ??
      facility?.interestRateRange?.min ??
      0;
    setApprovedRateInput(defaultRate ? String(defaultRate) : "");
    setShowReviewModal(true);
  };

  const handleDisburse = (loan: LoanApplication) => {
    if (!canDisburse) return;
    setSelectedLoan(loan);
    setRepaymentStartDate("");
    setSelectedDisbursementAccountId("");
    setShowDisburseModal(true);
  };

  const handleDownloadPdf = async () => {
    if (!selectedLoan) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await downloadAdminLoanApplicationPdf(selectedLoan.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const label = getLoanLabel(selectedLoan)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      link.href = url;
      link.download = `loan-application-${label}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Download ready",
        description: "Loan application PDF downloaded.",
      });
    } catch (error: unknown) {
      toast({
        title: "Download failed",
        description:
          (error as Error).message ||
          "Unable to download the loan application PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleEmailPdf = async () => {
    if (!selectedLoan) return;
    if (invalidExtraEmails.length > 0) {
      toast({
        title: "Invalid emails",
        description: "Remove or correct the invalid email addresses.",
      });
      return;
    }
    if (!hasEmailRecipients) {
      toast({
        title: "Select recipients",
        description: "Choose at least one recipient to email this PDF.",
      });
      return;
    }
    if (hasTooManyRecipients) {
      toast({
        title: "Too many recipients",
        description: "Please keep the recipient list to 10 emails or fewer.",
      });
      return;
    }
    setIsEmailingPdf(true);
    try {
      const response = await emailAdminLoanApplicationPdf(selectedLoan.id, {
        sendApplicant: recipientOptions.sendApplicant,
        sendGuarantors: recipientOptions.sendGuarantors,
        extraEmails: extraRecipientEmails,
      });
      const count = response.recipients.length;
      toast({
        title: "Email queued",
        description:
          count > 0
            ? `Loan summary sent to ${count} recipient${count > 1 ? "s" : ""}.`
            : "No valid recipient emails were found.",
      });
    } catch (error: unknown) {
      toast({
        title: "Email failed",
        description:
          (error as Error).message ||
          "Unable to email the loan application summary.",
        variant: "destructive",
      });
    } finally {
      setIsEmailingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAdminLoanApplications({
        status: statusFilter,
        search: searchQuery || undefined,
        groupId: groupFilter !== "all" ? groupFilter : undefined,
        year: yearFilter !== "all" ? yearFilter : undefined,
        month: monthFilter !== "all" ? monthFilter : undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `loan-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export ready",
        description: "Loan applications export has been downloaded.",
      });
    } catch (error: unknown) {
      toast({
        title: "Export failed",
        description:
          (error as Error).message || "Unable to export loan applications.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReconcileLoan = async (loan: LoanApplication) => {
    const confirmReconcile = window.confirm(
      "Reconcile this rejected loan and return it to pending review?",
    );
    if (!confirmReconcile) return;
    try {
      await reconcileLoanMutation.mutateAsync({ applicationId: loan.id });
      toast({
        title: "Loan reconciled",
        description: "Loan application is back in the pending queue.",
      });
    } catch (error: unknown) {
      toast({
        title: "Reconcile failed",
        description:
          (error as Error).message ||
          "Unable to reconcile this loan application.",
        variant: "destructive",
      });
    }
  };

  const openEditReview = (
    loan: LoanApplication,
    action: "approved" | "rejected",
  ) => {
    setEditRequestTarget(loan);
    setEditReviewAction(action);
    setEditReviewNotes("");
    setShowEditReviewModal(true);
  };

  const confirmEditReview = async () => {
    if (!editRequestTarget || !editReviewAction) return;
    const requestId = editRequestTarget.latestEditRequest?.id;
    if (!requestId) return;
    try {
      await reviewEditRequestMutation.mutateAsync({
        applicationId: editRequestTarget.id,
        requestId,
        status: editReviewAction,
        reviewNotes: editReviewNotes || undefined,
      });
      toast({
        title:
          editReviewAction === "approved"
            ? "Edit approved"
            : "Edit rejected",
        description:
          editReviewAction === "approved"
            ? "The requested edits have been applied."
            : "The edit request has been rejected.",
      });
      setShowEditReviewModal(false);
      setEditRequestTarget(null);
    } catch (error: unknown) {
      toast({
        title: "Edit request failed",
        description:
          (error as Error).message ||
          "Unable to review this edit request.",
        variant: "destructive",
      });
    }
  };

  const handleSaveRecipientDefaults = async () => {
    if (invalidExtraEmails.length > 0) {
      toast({
        title: "Invalid emails",
        description: "Remove or correct the invalid email addresses.",
      });
      return;
    }
    try {
      await updatePreferencesMutation.mutateAsync({
        loanPdfSendApplicant: recipientOptions.sendApplicant,
        loanPdfSendGuarantors: recipientOptions.sendGuarantors,
        loanPdfExtraEmails: extraRecipientEmails,
      });
      setRecipientDirty(false);
      toast({
        title: "Defaults saved",
        description: "Your recipient preferences have been updated.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Unable to save recipient defaults.";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handlePrintLoan = async () => {
    if (!selectedLoan) return;
    setIsPrintingPdf(true);
    try {
      const blob = await downloadAdminLoanApplicationPdf(selectedLoan.id);
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (!printWindow) {
        throw new Error("Popup blocked");
      }
      const timer = setInterval(() => {
        if (printWindow.document.readyState === "complete") {
          clearInterval(timer);
          printWindow.focus();
          printWindow.print();
        }
      }, 400);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 20000);
    } catch (error: unknown) {
      toast({
        title: "Print failed",
        description:
          (error as Error).message ||
          "Unable to open the print preview for this loan.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsPrintingPdf(false), 1200);
    }
  };

  const confirmReview = () => {
    if (selectedLoan && reviewAction) {
      if (reviewAction === "approve") {
        const parsedRate = approvedRateInput.trim()
          ? Number(approvedRateInput)
          : undefined;
        onApprove(
          selectedLoan.id,
          reviewNotes,
          Number.isFinite(parsedRate) ? parsedRate : undefined,
        );
      } else {
        onReject(selectedLoan.id, reviewNotes);
      }
      setShowReviewModal(false);
      setSelectedLoan(null);
    }
  };

  const mergePayoutUpdate = (
    base: LoanApplication,
    update?: LoanPayoutUpdate | null,
  ) => ({
    ...base,
    payoutReference: update?.payoutReference ?? base.payoutReference,
    payoutGateway: update?.payoutGateway ?? base.payoutGateway,
    payoutTransferCode: update?.payoutTransferCode ?? base.payoutTransferCode,
    payoutStatus: update?.payoutStatus ?? base.payoutStatus,
    payoutOtpResentAt: update?.payoutOtpResentAt ?? base.payoutOtpResentAt,
    disbursementBankAccountId:
      update?.disbursementBankAccountId ?? base.disbursementBankAccountId,
    disbursementBankName:
      update?.disbursementBankName ?? base.disbursementBankName,
    disbursementBankCode:
      update?.disbursementBankCode ?? base.disbursementBankCode,
    disbursementAccountNumber:
      update?.disbursementAccountNumber ?? base.disbursementAccountNumber,
    disbursementAccountName:
      update?.disbursementAccountName ?? base.disbursementAccountName,
  });

  const confirmDisburse = async () => {
    if (!selectedLoan) return;
    if (bankAccountsLoading) {
      toast({
        title: "Loading Bank Accounts",
        description: "Please wait while we load the borrower bank accounts.",
      });
      return;
    }
    if (bankAccountsError) {
      toast({
        title: "Bank Accounts Unavailable",
        description:
          "Unable to load borrower bank accounts. Please retry shortly.",
        variant: "destructive",
      });
      return;
    }
    if (bankAccounts.length === 0) {
      toast({
        title: "No Bank Accounts",
        description:
          "This borrower does not have a bank account on file. Ask them to add one before disbursement.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDisbursementAccountId) {
      toast({
        title: "Select Bank Account",
        description: "Choose a bank account for disbursement.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await onDisburse(
        selectedLoan.id,
        repaymentStartDate || null,
        selectedDisbursementAccountId || null,
      );
      if (result?.payoutStatus === "otp") {
        const updated = mergePayoutUpdate(selectedLoan, result);
        setOtpTarget(updated);
        setTransferCode(updated.payoutTransferCode || "");
        setOtpCode("");
      }
    } finally {
      setShowDisburseModal(false);
      setSelectedLoan(null);
    }
  };

  const handleVerifyTransfer = async (loan: LoanApplication) => {
    if (!loan.payoutReference) {
      toast({
        title: "Missing Reference",
        description: "No payout reference found for this transfer.",
        variant: "destructive",
      });
      return;
    }
    setVerifyTargetId(loan.id);
    try {
      const result = await onVerifyTransfer(
        loan.id,
        loan.repaymentStartDate || null,
      );
      const updated = mergePayoutUpdate(loan, result);

      if (updated.payoutStatus === "success") {
        toast({
          title: "Transfer Verified",
          description: "The payout has been completed and the loan disbursed.",
        });
      } else if (updated.payoutStatus === "otp") {
        toast({
          title: "OTP Required",
          description: "Paystack requires OTP to complete this transfer.",
        });
        setOtpTarget(updated);
        setTransferCode(updated.payoutTransferCode || "");
        setOtpCode("");
      } else {
        toast({
          title: "Transfer Pending",
          description:
            "The payout is still processing. You can verify again later.",
        });
      }

      if (selectedLoan?.id === loan.id) {
        setSelectedLoan(updated);
      }
    } catch (error: unknown) {
      toast({
        title: "Verify Failed",
        description:
          (error as Error).message || "Unable to verify transfer status.",
        variant: "destructive",
      });
    } finally {
      setVerifyTargetId(null);
    }
  };

  const handleFinalizeOtp = async () => {
    if (!canFinalizeOtp) return;
    if (!otpTarget) return;
    if (!otpCode.trim()) {
      toast({
        title: "OTP Required",
        description:
          "Enter the OTP sent by Paystack to finalize this transfer.",
        variant: "destructive",
      });
      return;
    }
    if (!transferCode.trim()) {
      toast({
        title: "Transfer Code Required",
        description: "Enter the transfer code for this payout.",
        variant: "destructive",
      });
      return;
    }

    setOtpAction("finalize");
    try {
      const plannedStartDate =
        otpTarget.repaymentStartDate || repaymentStartDate || null;
      const result = await onFinalizeOtp(
        otpTarget.id,
        transferCode.trim(),
        otpCode.trim(),
        plannedStartDate,
      );
      const updated = mergePayoutUpdate(otpTarget, result);

      if (updated.payoutStatus === "success") {
        toast({
          title: "Transfer Finalized",
          description: "OTP verified. The loan has been disbursed.",
        });
        setOtpTarget(null);
        setOtpCode("");
        setTransferCode("");
        setResendCooldownSeconds(0);
      } else {
        toast({
          title: "Transfer Processing",
          description:
            "The payout is still processing. You can retry if Paystack requires another OTP.",
        });
        setOtpTarget(updated);
        setTransferCode(updated.payoutTransferCode || transferCode.trim());
      }
    } catch (error: unknown) {
      toast({
        title: "Finalize Failed",
        description: (error as Error).message || "Failed to finalize transfer",
        variant: "destructive",
      });
    } finally {
      setOtpAction(null);
    }
  };

  const handleResendOtp = async () => {
    if (!otpTarget) return;
    if (!transferCode.trim()) {
      toast({
        title: "Transfer Code Required",
        description: "Enter the transfer code to resend OTP.",
        variant: "destructive",
      });
      return;
    }

    setOtpAction("resend");
    try {
      const result = await onResendOtp(otpTarget.id, transferCode.trim());
      const updated = mergePayoutUpdate(otpTarget, result.application);
      setOtpTarget(updated);
      setTransferCode(updated.payoutTransferCode || transferCode.trim());

      const retryAfter = result.retryAfter;
      const cooldown =
        typeof retryAfter === "number" && retryAfter > 0
          ? retryAfter
          : otpResendCooldownSeconds;
      if (cooldown > 0) {
        setResendCooldownSeconds(cooldown);
      }

      toast({
        title: "OTP Resent",
        description: "A new OTP has been sent to your Paystack contact.",
      });
    } catch (error: unknown) {
      const retryAfter = (error as Error & { retryAfter?: number }).retryAfter;
      const cooldown =
        typeof retryAfter === "number" && retryAfter > 0
          ? retryAfter
          : otpResendCooldownSeconds;
      if (cooldown > 0) {
        setResendCooldownSeconds(cooldown);
      }
      toast({
        title: "Resend Failed",
        description: (error as Error).message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setOtpAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-2xl">{pendingCount}</p>
              <p className="text-gray-500 text-sm">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-2xl">
                {underReviewCount}
              </p>
              <p className="text-gray-500 text-sm">Under Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-2xl">
                {approvedCount}
              </p>
              <p className="text-gray-500 text-sm">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-2xl">
                {formatCompactCurrency(totalRequested)}
              </p>
              <p className="text-gray-500 text-sm">Total Requested</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl">
        <div className="space-y-3 p-4 border-gray-100 border-b">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h3 className="font-semibold text-gray-900 text-lg">
              Loan Applications
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportCsv}
              disabled={isExporting || applications.length === 0}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by applicant, group, purpose or code"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groupSelectOptions.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
                setGroupFilter("all");
                setYearFilter("all");
                setMonthFilter("all");
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {loansQuery.isLoading && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Loading loan applications…
            </div>
          )}
          {loansQuery.isError && (
            <div className="p-8 text-center text-red-500 text-sm">
              {(loansQuery.error as Error)?.message ||
                "Unable to load loan applications."}
            </div>
          )}
          {!loansQuery.isLoading &&
            !loansQuery.isError &&
            filteredApplications.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No loans match the selected filters.
              </div>
            )}
          {!loansQuery.isLoading &&
            !loansQuery.isError &&
            filteredApplications.map((loan) => {
            const rateInfo = resolveRateInfo(loan);
            const interestLabel = formatInterestLabel(
              rateInfo.rate,
              rateInfo.rateType,
              rateInfo.facility?.interestRateRange,
            );
            const facilityLabel = rateInfo.facility?.name || "General Loan";
            const hasEditRequest =
              loan.latestEditRequest?.status === "pending";

            return (
              <div
                key={loan.id}
                className="hover:bg-gray-50 p-4 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="flex justify-center items-center bg-emerald-100 rounded-full w-10 h-10">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {loan.applicantName}
                      </h4>
                      <p className="text-emerald-600 text-sm">
                        {loan.groupName}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-gray-500 text-sm">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(loan.loanAmount)}
                        </span>
                        <span>{loan.repaymentPeriod} months</span>
                        <span>{loan.loanPurpose}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-gray-400 text-xs">
                        <span>{facilityLabel}</span>
                        <span>{interestLabel}</span>
                      </div>
                      <p className="mt-1 text-gray-400 text-xs">
                        Applied: {new Date(loan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(loan.status)}
                    {hasEditRequest && (
                      <Badge className="bg-indigo-100 text-indigo-700">
                        Edit Requested
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(loan)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {loan.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-600"
                        onClick={() => onStartReview(loan.id)}
                      >
                        Start Review
                      </Button>
                    )}
                    {loan.status === "under_review" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleReview(loan, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600"
                          onClick={() => handleReview(loan, "reject")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {loan.status === "approved" && (
                      <>
                        {loan.payoutStatus === "otp" ? (
                          canFinalizeOtp ? (
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700"
                              onClick={() => {
                                setOtpTarget(loan);
                                setTransferCode(loan.payoutTransferCode || "");
                                setOtpCode("");
                              }}
                            >
                              Finalize OTP
                            </Button>
                          ) : null
                        ) : ["pending", "processing", "queued"].includes(
                            String(loan.payoutStatus || "").toLowerCase(),
                          ) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-200 text-amber-700"
                            onClick={() => handleVerifyTransfer(loan)}
                            disabled={verifyTargetId === loan.id}
                          >
                            {verifyTargetId === loan.id
                              ? "Verifying..."
                              : "Verify Transfer"}
                          </Button>
                        ) : canDisburse ? (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleDisburse(loan)}
                          >
                            Disburse
                          </Button>
                        ) : null}
                        {!canDisburse &&
                          String(loan.payoutStatus || "").toLowerCase() !==
                            "otp" &&
                          !["pending", "processing", "queued"].includes(
                            String(loan.payoutStatus || "").toLowerCase(),
                          ) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full text-amber-700 text-xs cursor-help"
                                  tabIndex={0}
                                >
                                  Admin action required
                                  <Info className="w-3 h-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Only admins can disburse loans.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        {!canFinalizeOtp &&
                          String(loan.payoutStatus || "").toLowerCase() ===
                            "otp" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full text-amber-700 text-xs cursor-help"
                                  tabIndex={0}
                                >
                                  Admin action required
                                  <Info className="w-3 h-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Only admins can finalize OTP transfers.
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </>
                    )}
                    {loan.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-700"
                        onClick={() => handleReconcileLoan(loan)}
                      >
                        Reconcile
                      </Button>
                    )}
                  </div>
                </div>
                {(loan.payoutStatus || loan.payoutTransferCode) && (
                  <div className="flex flex-wrap justify-end gap-3 mt-2 text-gray-500 text-xs">
                    {loan.payoutStatus && (
                      <span className="text-amber-600">
                        Payout Status: {loan.payoutStatus.toUpperCase()}
                      </span>
                    )}
                    {loan.payoutTransferCode && (
                      <span>Transfer Code: {loan.payoutTransferCode}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-3 border-gray-100 border-t">
            <p className="text-gray-500 text-sm">
              Showing {pageStart}-{pageEnd} of {total} loans
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-gray-500 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="p-0 max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Loan Application Details</DialogTitle>
          </DialogHeader>
          {selectedLoan &&
            (() => {
              const loanLabel = getLoanLabel(selectedLoan);
              const facilityLabel =
                selectedRateInfo?.facility?.name || "Loan Facility";
              const repaymentProgress =
                selectedLoan.remainingBalance != null && selectedTotalRepayable
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        ((selectedTotalRepayable -
                          Number(selectedLoan.remainingBalance || 0)) /
                          selectedTotalRepayable) *
                          100,
                      ),
                    )
                  : null;
              const monthlyIncome = Number(selectedLoan.monthlyIncome || 0);
              const dtiValue =
                monthlyIncome > 0
                  ? (selectedMonthlyPayment / monthlyIncome) * 100
                  : null;
              const guarantors = Array.isArray(selectedLoan.guarantors)
                ? selectedLoan.guarantors
                : [];
              const documents = Array.isArray(selectedLoan.documents)
                ? selectedLoan.documents
                : [];

              return (
                <div className="flex flex-col max-h-screen">
                  <div className="z-10 relative bg-slate-50 px-6 py-5 border-b">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <p className="font-semibold text-emerald-600 text-xs uppercase tracking-[0.2em]">
                          Loan Application
                        </p>
                        <h2 className="mt-1 font-semibold text-gray-900 text-2xl">
                          {loanLabel}
                        </h2>
                        <p className="mt-1 text-gray-500 text-sm">
                          Submitted {formatDate(selectedLoan.createdAt)} •{" "}
                          {facilityLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 bg-white shadow-sm px-3 py-2 border border-slate-200 rounded-xl">
                        {getStatusBadge(selectedLoan.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrintLoan}
                          disabled={isPrintingPdf}
                          className="gap-2 bg-white shadow-sm border-slate-200 text-slate-700"
                        >
                          <Printer className="w-4 h-4" />
                          {isPrintingPdf ? "Preparing..." : "Print"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEmailPdf}
                          disabled={
                            isEmailingPdf ||
                            !hasEmailRecipients ||
                            invalidExtraEmails.length > 0 ||
                            hasTooManyRecipients
                          }
                          className="gap-2 bg-white shadow-sm border-slate-200 text-slate-700"
                        >
                          <Mail className="w-4 h-4" />
                          {isEmailingPdf ? "Emailing..." : "Email PDF"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDownloadPdf}
                          disabled={isDownloadingPdf}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          {isDownloadingPdf ? "Downloading..." : "Download PDF"}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                      {(() => {
                        const risk = getRiskTone(dtiValue);
                        const dtiLabel =
                          dtiValue != null
                            ? `DTI ${dtiValue.toFixed(1)}%`
                            : "DTI —";
                        return (
                          <>
                            <span className="bg-slate-100 px-3 py-1 rounded-full font-medium text-slate-600">
                              {dtiLabel}{" "}
                              {dtiValue != null
                                ? dtiValue > 35
                                  ? "(Above 35%)"
                                  : "(Below 35%)"
                                : ""}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 font-semibold ${risk.classes}`}
                            >
                              {risk.label}
                            </span>
                            <span className="bg-slate-100 px-3 py-1 rounded-full font-medium text-slate-600">
                              Guarantors {guarantors.length}
                            </span>
                            <span className="bg-slate-100 px-3 py-1 rounded-full font-medium text-slate-600">
                              Documents {documents.length}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="bg-white mt-4 px-4 py-3 border border-slate-200 rounded-lg">
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <p className="font-semibold text-gray-500 text-xs uppercase tracking-wide">
                            Recipients
                          </p>
                          <p className="text-gray-500 text-xs">
                            Choose who receives the PDF.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              id="loan-recipient-applicant"
                              checked={recipientOptions.sendApplicant}
                              disabled={!selectedLoan.applicantEmail}
                              onCheckedChange={(value) => {
                                setRecipientDirty(true);
                                setRecipientOptions((prev) => ({
                                  ...prev,
                                  sendApplicant: Boolean(value),
                                }));
                              }}
                            />
                            <span>
                              Applicant
                              {!selectedLoan.applicantEmail && " (no email)"}
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              id="loan-recipient-guarantors"
                              checked={recipientOptions.sendGuarantors}
                              disabled={
                                guarantors.length === 0 ||
                                !guarantors.some((g) => Boolean(g.email))
                              }
                              onCheckedChange={(value) => {
                                setRecipientDirty(true);
                                setRecipientOptions((prev) => ({
                                  ...prev,
                                  sendGuarantors: Boolean(value),
                                }));
                              }}
                            />
                            <span>
                              Guarantors
                              {guarantors.length === 0 ||
                              !guarantors.some((g) => Boolean(g.email))
                                ? " (no email)"
                                : ""}
                            </span>
                          </label>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Input
                          value={recipientOptions.extraEmails}
                          onChange={(event) => {
                            setRecipientDirty(true);
                            setRecipientOptions((prev) => ({
                              ...prev,
                              extraEmails: event.target.value,
                            }));
                          }}
                          className={
                            invalidExtraEmails.length > 0
                              ? "border-rose-300 focus-visible:ring-rose-200"
                              : undefined
                          }
                          placeholder="Add extra emails (comma or semicolon separated)"
                          aria-invalid={invalidExtraEmails.length > 0}
                        />
                        <p className="mt-1 text-gray-400 text-xs">
                          Example: finance@company.com, auditor@company.com
                        </p>
                        {invalidExtraEmails.length > 0 && (
                          <p className="mt-1 text-rose-500 text-xs">
                            Invalid: {invalidExtraEmails.join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-slate-100 border-t">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <p className="font-semibold text-gray-500 text-xs uppercase tracking-wide">
                            Resolved Recipients
                          </p>
                          <div className="flex items-center gap-2">
                            {recipientDirty && (
                              <span className="text-amber-600 text-xs">
                                Unsaved changes
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white border-slate-200 text-slate-700"
                              onClick={handleSaveRecipientDefaults}
                              disabled={updatePreferencesMutation.isPending}
                            >
                              {updatePreferencesMutation.isPending
                                ? "Saving..."
                                : "Save Defaults"}
                            </Button>
                          </div>
                        </div>
                        {resolvedRecipients.length === 0 ? (
                          <p className="mt-2 text-gray-400 text-xs">
                            No recipients selected yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {resolvedRecipients.map((recipient, index) => (
                              <span
                                key={`${recipient.email}-${index}`}
                                className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 text-xs"
                              >
                                {recipient.label}
                                {recipient.name
                                  ? ` · ${recipient.name}`
                                  : ""} — {recipient.email}
                              </span>
                            ))}
                          </div>
                        )}
                        {hasTooManyRecipients && (
                          <p className="mt-2 text-rose-500 text-xs">
                            Too many recipients selected. The limit is 10.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6 max-h-[75vh] overflow-y-auto">
                    <div className="gap-4 grid md:grid-cols-4">
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Requested
                        </p>
                        <p className="mt-2 font-semibold text-gray-900 text-xl">
                          {formatCurrency(selectedLoan.loanAmount)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {selectedLoan.repaymentPeriod} months
                        </p>
                      </div>
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Approved Amount
                        </p>
                        <p className="mt-2 font-semibold text-emerald-600 text-xl">
                          {selectedLoan.approvedAmount != null
                            ? formatCurrency(selectedLoan.approvedAmount)
                            : "Pending"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Interest {selectedInterestLabel || "—"}
                        </p>
                      </div>
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Monthly Payment
                        </p>
                        <p className="mt-2 font-semibold text-gray-900 text-xl">
                          {formatCurrency(selectedMonthlyPayment)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Total repayable{" "}
                          {formatCurrency(selectedTotalRepayable)}
                        </p>
                      </div>
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Remaining Balance
                        </p>
                        <p className="mt-2 font-semibold text-gray-900 text-xl">
                          {selectedLoan.remainingBalance != null
                            ? formatCurrency(selectedLoan.remainingBalance)
                            : "—"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Repayment progress{" "}
                          {repaymentProgress != null
                            ? `${Math.round(repaymentProgress)}%`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="gap-4 grid md:grid-cols-2">
                      <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                          <User className="w-4 h-4 text-emerald-500" />
                          Applicant
                        </div>
                        <p className="mt-3 font-semibold text-gray-900 text-lg">
                          {selectedLoan.applicantName}
                        </p>
                        <div className="space-y-2 mt-3 text-gray-600 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{selectedLoan.applicantEmail || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{selectedLoan.applicantPhone || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span>{selectedLoan.groupName || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                          <CreditCard className="w-4 h-4 text-emerald-500" />
                          Loan Snapshot
                        </div>
                        <div className="space-y-2 mt-3 text-gray-600 text-sm">
                          <p className="font-semibold text-gray-900 text-base">
                            {selectedLoan.loanPurpose}
                          </p>
                          <p>
                            {selectedLoan.purposeDescription ||
                              "No additional description provided."}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2 text-gray-500 text-xs">
                            <span className="bg-emerald-50 px-2.5 py-1 rounded-full text-emerald-700">
                              {facilityLabel}
                            </span>
                            <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-600">
                              {selectedInterestLabel || "Interest TBD"}
                            </span>
                            <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-600">
                              {selectedLoan.repaymentPeriod} months
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="gap-4 grid md:grid-cols-3">
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Approval Timeline
                        </p>
                        <div className="space-y-2 mt-3 text-gray-600 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              Applied {formatDate(selectedLoan.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              Approved {formatDate(selectedLoan.approvedAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              Disbursed {formatDate(selectedLoan.disbursedAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              Repayment Start{" "}
                              {formatDate(selectedLoan.repaymentStartDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Affordability
                        </p>
                        <div className="mt-3">
                          <p className="font-semibold text-gray-900 text-xl">
                            {monthlyIncome
                              ? formatCurrency(monthlyIncome)
                              : "—"}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Monthly Income
                          </p>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-gray-500 text-xs">
                            <span>Debt-to-Income</span>
                            <span>
                              {dtiValue != null
                                ? `${dtiValue.toFixed(1)}%`
                                : "—"}
                            </span>
                          </div>
                          <Progress
                            className="mt-2 h-2"
                            value={
                              dtiValue != null
                                ? Math.min(100, Math.max(0, dtiValue))
                                : 0
                            }
                          />
                        </div>
                      </div>
                      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Review Notes
                        </p>
                        <p className="mt-3 text-gray-600 text-sm">
                          {selectedLoan.reviewNotes ||
                            "No review notes recorded."}
                        </p>
                      </div>
                    </div>

                    {selectedLoan.latestEditRequest && (
                      <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Edit Request
                          </div>
                          <Badge
                            className={
                              selectedLoan.latestEditRequest.status ===
                              "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : selectedLoan.latestEditRequest.status ===
                                    "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }
                          >
                            {selectedLoan.latestEditRequest.status.replace(
                              /_/g,
                              " ",
                            )}
                          </Badge>
                        </div>
                        <p className="mt-2 text-gray-500 text-xs">
                          Requested{" "}
                          {formatDate(
                            selectedLoan.latestEditRequest.requestedAt,
                          )}
                        </p>
                        <div className="mt-4 space-y-2">
                          {(selectedLoan.latestEditRequest.changes ?? []).map(
                            (change, index) => (
                              <div
                                key={`${change.field}-${index}`}
                                className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                              >
                                <div className="font-medium text-gray-700">
                                  {change.label}
                                </div>
                                <div className="text-gray-500">
                                  <span className="line-through text-gray-400">
                                    {change.from ?? "—"}
                                  </span>{" "}
                                  →{" "}
                                  <span className="font-medium text-gray-900">
                                    {change.to ?? "—"}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                          {(selectedLoan.latestEditRequest.changes ?? [])
                            .length === 0 && (
                            <p className="text-gray-500 text-sm">
                              No changes recorded.
                            </p>
                          )}
                        </div>
                        {(selectedLoan.latestEditRequest.documents ?? [])
                          .length > 0 && (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">
                              {selectedLoan.latestEditRequest.documents?.length}{" "}
                              document
                              {selectedLoan.latestEditRequest.documents &&
                              selectedLoan.latestEditRequest.documents.length >
                                1
                                ? "s"
                                : ""}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-xs"
                              onClick={() =>
                                openDocPreview(
                                  selectedLoan.latestEditRequest?.documents ??
                                    [],
                                  0,
                                )
                              }
                            >
                              Preview Docs
                            </Button>
                          </div>
                        )}
                        {selectedLoan.latestEditRequest.status ===
                          "pending" && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() =>
                                openEditReview(selectedLoan, "approved")
                              }
                            >
                              Approve Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600"
                              onClick={() =>
                                openEditReview(selectedLoan, "rejected")
                              }
                            >
                              Reject Edit
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                        <User className="w-4 h-4 text-emerald-500" />
                        Guarantors
                      </div>
                      {guarantors.length === 0 ? (
                        <p className="mt-3 text-gray-500 text-sm">
                          No guarantors submitted for this application.
                        </p>
                      ) : (
                        <div className="gap-3 grid md:grid-cols-2 mt-4">
                          {guarantors.map((g, index) => (
                            <div
                              key={`${g.name}-${index}`}
                              className="bg-gray-50 p-3 border border-gray-100 rounded-lg"
                            >
                              <p className="font-semibold text-gray-900">
                                {g.name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {g.relationship || g.type || "Guarantor"}
                              </p>
                              <p className="mt-2 text-gray-600 text-xs">
                                {g.phone || g.email || "—"}
                              </p>
                              {g.signature && (
                                <div className="bg-white mt-2 p-2 border border-gray-200 rounded-lg">
                                  <p className="font-semibold text-[10px] text-gray-400 uppercase">
                                    Signature
                                  </p>
                                  {g.signature.method === "text" ? (
                                    <p
                                      className="text-gray-800 text-base"
                                      style={{
                                        fontFamily:
                                          g.signature.font || "cursive",
                                      }}
                                    >
                                      {g.signature.text || "—"}
                                    </p>
                                  ) : g.signature.imageUrl ? (
                                    <img
                                      src={g.signature.imageUrl}
                                      alt="Guarantor signature"
                                      className="mt-1 w-auto h-10 object-contain"
                                    />
                                  ) : null}
                                  <p className="mt-1 text-[10px] text-gray-400">
                                    {g.signature.signedAt
                                      ? `Signed ${formatDate(g.signature.signedAt)}`
                                      : "Signature date not available"}
                                  </p>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2 text-gray-500 text-xs">
                                {g.liabilityPercentage != null && (
                                  <span className="bg-white px-2 py-1 rounded-full text-gray-600">
                                    Liability {g.liabilityPercentage}%
                                  </span>
                                )}
                                {g.savingsBalance != null && (
                                  <span className="bg-white px-2 py-1 rounded-full text-gray-600">
                                    Savings {formatCurrency(g.savingsBalance)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        Documents
                      </div>
                      {documents.length === 0 ? (
                        <p className="mt-3 text-gray-500 text-sm">
                          No documents have been uploaded yet.
                        </p>
                      ) : (
                        <div className="mt-4 divide-y divide-gray-100">
                          {documents.map((doc, index) => (
                            <div
                              key={`${doc.name}-${index}`}
                              className="flex flex-wrap justify-between items-center gap-3 py-3"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {doc.name}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {doc.type} • {formatFileSize(doc.size)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getDocumentStatusTone(
                                    doc.status,
                                  )}`}
                                >
                                  {doc.status || "Uploaded"}
                                </span>
                                {doc.url ? (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
                                  >
                                    View
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    File pending
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 bg-white px-6 py-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog
        open={docPreviewOpen}
        onOpenChange={(open) => (open ? setDocPreviewOpen(true) : closeDocPreview())}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {docPreviewItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No documents available for preview.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  Document {docPreviewIndex + 1} of {docPreviewItems.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setDocPreviewIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={docPreviewIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setDocPreviewIndex((prev) =>
                        Math.min(docPreviewItems.length - 1, prev + 1),
                      )
                    }
                    disabled={docPreviewIndex >= docPreviewItems.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span className="font-medium text-slate-600">
                  {docPreviewItems[docPreviewIndex]?.name || "Document"}
                </span>
                {docPreviewItems[docPreviewIndex]?.url && (
                  <a
                    href={docPreviewItems[docPreviewIndex]?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Open in new tab
                  </a>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                {docPreviewItems[docPreviewIndex]?.url ? (
                  docPreviewItems[docPreviewIndex]?.type?.startsWith(
                    "image/",
                  ) ? (
                    <img
                      src={docPreviewItems[docPreviewIndex]?.url}
                      alt={docPreviewItems[docPreviewIndex]?.name || "Preview"}
                      className="max-h-[420px] w-full rounded-lg object-contain"
                    />
                  ) : (
                    <iframe
                      title="Document preview"
                      src={docPreviewItems[docPreviewIndex]?.url}
                      className="h-[420px] w-full rounded-lg border-0 bg-white"
                    />
                  )
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-sm text-gray-400">
                    Preview unavailable. Use download to view the file.
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {docPreviewItems.map((doc, idx) => (
                  <button
                    key={`${doc.name}-${idx}`}
                    type="button"
                    onClick={() => setDocPreviewIndex(idx)}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs ${
                      idx === docPreviewIndex
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-100 bg-white text-slate-600 hover:border-emerald-200"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {doc.name || "Document"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {doc.type || "file"} • {formatFileSize(doc.size || 0)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Request Review Modal */}
      <Dialog open={showEditReviewModal} onOpenChange={setShowEditReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editReviewAction === "approved"
                ? "Approve Edit Request"
                : "Reject Edit Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editRequestTarget && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">
                  {editRequestTarget.applicantName}
                </p>
                <p className="text-sm text-gray-500">
                  {editRequestTarget.loanPurpose}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {(editRequestTarget.latestEditRequest?.changes ?? []).map(
                    (change, index) => (
                      <div
                        key={`${change.field}-${index}`}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <span className="font-medium text-gray-700">
                          {change.label}
                        </span>
                        <span className="text-gray-500">
                          {change.from ?? "—"} →{" "}
                          <span className="font-semibold text-gray-900">
                            {change.to ?? "—"}
                          </span>
                        </span>
                      </div>
                    ),
                  )}
                </div>
                {(editRequestTarget.latestEditRequest?.documents ?? []).length >
                  0 && (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">
                      {editRequestTarget.latestEditRequest?.documents?.length}{" "}
                      document
                      {editRequestTarget.latestEditRequest?.documents &&
                      editRequestTarget.latestEditRequest.documents.length > 1
                        ? "s"
                        : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs"
                      onClick={() =>
                        openDocPreview(
                          editRequestTarget.latestEditRequest?.documents ?? [],
                          0,
                        )
                      }
                    >
                      Preview Docs
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Notes (Optional)
              </label>
              <Textarea
                value={editReviewNotes}
                onChange={(e) => setEditReviewNotes(e.target.value)}
                placeholder="Add notes about this decision..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${
                  editReviewAction === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={confirmEditReview}
                disabled={reviewEditRequestMutation.isPending}
              >
                {reviewEditRequestMutation.isPending
                  ? "Saving..."
                  : editReviewAction === "approved"
                    ? "Approve Edit"
                    : "Reject Edit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve"
                ? "Approve Loan Application"
                : "Reject Loan Application"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLoan && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{selectedLoan.applicantName}</p>
                <p className="font-bold text-emerald-600 text-lg">
                  {formatCurrency(selectedLoan.loanAmount)}
                </p>
                <p className="text-gray-600 text-sm">
                  {selectedLoan.loanPurpose}
                </p>
              </div>
            )}
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Review Notes
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
              />
            </div>
            {reviewAction === "approve" && selectedLoan && (
              <div className="space-y-2">
                <label className="block font-medium text-gray-700 text-sm">
                  Approved Interest Rate
                </label>
                {selectedRateInfo?.facility?.interestRateRange ? (
                  <>
                    <input
                      type="number"
                      min={selectedRateInfo.facility.interestRateRange.min}
                      max={selectedRateInfo.facility.interestRateRange.max}
                      step="0.1"
                      value={approvedRateInput}
                      onChange={(e) => setApprovedRateInput(e.target.value)}
                      className="px-3 py-2 border rounded-md w-full text-sm"
                    />
                    <p className="text-gray-500 text-xs">
                      Allowed range:{" "}
                      {selectedRateInfo.facility.interestRateRange.min}-
                      {selectedRateInfo.facility.interestRateRange.max}% monthly
                    </p>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm">
                    {selectedInterestLabel} (fixed)
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${
                  reviewAction === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={confirmReview}
              >
                {reviewAction === "approve"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disburse Modal */}
      {canDisburse && (
        <Dialog open={showDisburseModal} onOpenChange={setShowDisburseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disburse Loan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedLoan && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedLoan.applicantName}</p>
                  <p className="font-bold text-purple-600 text-lg">
                    {formatCurrency(
                      selectedLoan.approvedAmount ?? selectedLoan.loanAmount,
                    )}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {selectedLoan.loanPurpose}
                  </p>
                </div>
              )}
              {selectedLoan && (
                <div className="bg-slate-50 p-3 rounded-lg text-slate-600 text-sm">
                  {selectedDisbursementAccount ? (
                    <div>
                      <p className="font-medium text-slate-700">
                        Disbursement Account
                      </p>
                      <p className="mt-1 text-slate-600 text-sm">
                        {selectedDisbursementAccount.bankName} •{" "}
                        {selectedDisbursementAccount.accountNumber} •{" "}
                        {selectedDisbursementAccount.accountName}
                      </p>
                    </div>
                  ) : bankAccountsLoading ? (
                    <p>Loading borrower bank accounts...</p>
                  ) : bankAccountsError ? (
                    <p>
                      Unable to load borrower bank accounts right now. Please
                      retry.
                    </p>
                  ) : bankAccounts.length === 0 ? (
                    <p>
                      Borrower has no bank accounts on file. Ask them to add one
                      before disbursement.
                    </p>
                  ) : (
                    <p>Select a bank account below for disbursement.</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700 text-sm">
                  Bank Account for Disbursement
                </label>
                <Select
                  value={selectedDisbursementAccountId}
                  onValueChange={setSelectedDisbursementAccountId}
                  disabled={bankAccountsLoading || bankAccounts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        bankAccountsLoading
                          ? "Loading accounts..."
                          : bankAccounts.length === 0
                            ? "No bank accounts found"
                            : "Select bank account"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bankName} • {account.accountNumber} •{" "}
                        {account.accountName}
                        {account.isPrimary ? " (Primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bankAccounts.length === 0 && !bankAccountsLoading && (
                  <p className="text-amber-600 text-xs">
                    The borrower must add a bank account before you can disburse
                    this loan.
                  </p>
                )}
                {bankAccountsError && !bankAccountsLoading && (
                  <p className="text-red-600 text-xs">
                    Unable to load bank accounts. Please retry in a moment.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-gray-700 text-sm">
                  Repayment Start Date (optional)
                </label>
                <input
                  type="date"
                  value={repaymentStartDate}
                  onChange={(e) => setRepaymentStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-md w-full text-sm"
                />
                <p className="text-gray-500 text-xs">
                  Leave empty to start next month. Guarantors must have accepted
                  100% liability before disbursement.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDisburseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={confirmDisburse}
                  disabled={
                    bankAccountsLoading ||
                    bankAccountsError ||
                    bankAccounts.length === 0 ||
                    !selectedDisbursementAccountId
                  }
                >
                  Confirm Disbursement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* OTP Finalization Modal */}
      {canFinalizeOtp && otpTarget && (
        <Dialog
          open={Boolean(otpTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setOtpTarget(null);
              setOtpCode("");
              setTransferCode("");
              setResendCooldownSeconds(0);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalize Paystack OTP</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg text-amber-800 text-sm">
                Paystack requires OTP authorization to complete this transfer.
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">
                  Transfer Code
                </label>
                <Input
                  placeholder="e.g., TRF_ABC123"
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">OTP</label>
                <Input
                  placeholder="Enter OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOtpTarget(null);
                    setOtpCode("");
                    setTransferCode("");
                    setResendCooldownSeconds(0);
                  }}
                  disabled={otpBusy}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleResendOtp}
                  disabled={resendDisabled}
                >
                  {otpAction === "resend" ? "Resending..." : resendLabel}
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  onClick={handleFinalizeOtp}
                  disabled={otpBusy}
                >
                  {otpAction === "finalize" ? "Finalizing..." : "Finalize OTP"}
                </Button>
              </div>
              {resendCooldownSeconds > 0 && (
                <p className="text-amber-700 text-xs">
                  You can resend a new OTP in {resendCooldownSeconds}s.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

