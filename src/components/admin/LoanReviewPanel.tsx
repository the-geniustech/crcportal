import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { calculateLoanSummary } from "@/lib/loanMath";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
import {
  downloadAdminLoanApplicationPdf,
  emailAdminLoanApplicationPdf,
} from "@/lib/adminLoans";

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
}

interface LoanApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
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
  monthlyIncome: number;
  guarantorName: string;
  guarantorPhone: string;
  guarantors?: LoanGuarantor[];
  documents?: LoanDocument[];
  status: "pending" | "under_review" | "approved" | "rejected" | "disbursed";
  createdAt: string;
  reviewNotes?: string;
}

interface LoanReviewPanelProps {
  applications: LoanApplication[];
  onApprove: (
    id: string,
    notes: string,
    approvedInterestRate?: number | null,
  ) => void;
  onReject: (id: string, notes: string) => void;
  onStartReview: (id: string) => void;
  onDisburse: (id: string, repaymentStartDate?: string | null) => void;
}

export default function LoanReviewPanel({
  applications,
  onApprove,
  onReject,
  onStartReview,
  onDisburse,
}: LoanReviewPanelProps) {
  const { toast } = useToast();
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [repaymentStartDate, setRepaymentStartDate] = useState("");
  const [approvedRateInput, setApprovedRateInput] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [isEmailingPdf, setIsEmailingPdf] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState({
    sendApplicant: true,
    sendGuarantors: true,
    extraEmails: "",
  });

  const pendingCount = applications.filter(
    (a) => a.status === "pending",
  ).length;
  const underReviewCount = applications.filter(
    (a) => a.status === "under_review",
  ).length;
  const approvedCount = applications.filter(
    (a) => a.status === "approved" || a.status === "disbursed",
  ).length;
  const totalRequested = applications
    .filter((a) => a.status === "pending" || a.status === "under_review")
    .reduce((sum, a) => sum + a.loanAmount, 0);

  const filteredApplications = applications.filter(
    (a) => statusFilter === "all" || a.status === statusFilter,
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="mr-1 w-3 h-3" />
            Pending
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
    selectedLoan?.monthlyPayment ??
    selectedLoanSummary?.monthlyPayment ??
    0;
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

  const parseExtraEmails = (value: string) =>
    value
      .split(/[,\n;]/g)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const extraRecipientEmails = parseExtraEmails(recipientOptions.extraEmails);
  const hasEmailRecipients =
    (recipientOptions.sendApplicant && Boolean(selectedLoan?.applicantEmail)) ||
    (recipientOptions.sendGuarantors &&
      Array.isArray(selectedLoan?.guarantors) &&
      selectedLoan?.guarantors?.some((g) => Boolean(g.email))) ||
    extraRecipientEmails.length > 0;

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
    const applicantHasEmail = Boolean(loan.applicantEmail);
    const guarantorHasEmail =
      Array.isArray(loan.guarantors) &&
      loan.guarantors.some((g) => Boolean(g.email));
    setRecipientOptions({
      sendApplicant: applicantHasEmail,
      sendGuarantors: guarantorHasEmail,
      extraEmails: "",
    });
  };

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
    setSelectedLoan(loan);
    setRepaymentStartDate("");
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
    if (!hasEmailRecipients) {
      toast({
        title: "Select recipients",
        description: "Choose at least one recipient to email this PDF.",
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

  const confirmDisburse = () => {
    if (selectedLoan) {
      onDisburse(selectedLoan.id, repaymentStartDate || null);
      setShowDisburseModal(false);
      setSelectedLoan(null);
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
        <div className="flex justify-between items-center p-4 border-gray-100 border-b">
          <h3 className="font-semibold text-gray-900 text-lg">
            Loan Applications
          </h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
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

        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {filteredApplications.map((loan) => {
            const rateInfo = resolveRateInfo(loan);
            const interestLabel = formatInterestLabel(
              rateInfo.rate,
              rateInfo.rateType,
              rateInfo.facility?.interestRateRange,
            );
            const facilityLabel = rateInfo.facility?.name || "General Loan";

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
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleDisburse(loan)}
                      >
                        Disburse
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Loan Application Details</DialogTitle>
          </DialogHeader>
          {selectedLoan && (() => {
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
              <div className="flex flex-col">
                <div className="border-b bg-slate-50 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                        Loan Application
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold text-gray-900">
                        {loanLabel}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Submitted {formatDate(selectedLoan.createdAt)} •{" "}
                        {facilityLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(selectedLoan.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintLoan}
                        disabled={isPrintingPdf}
                        className="gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        {isPrintingPdf ? "Preparing..." : "Print"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEmailPdf}
                        disabled={isEmailingPdf || !hasEmailRecipients}
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {isEmailingPdf ? "Emailing..." : "Email PDF"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="h-4 w-4" />
                        {isDownloadingPdf ? "Downloading..." : "Download PDF"}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {(() => {
                      const risk = getRiskTone(dtiValue);
                      const dtiLabel =
                        dtiValue != null
                          ? `DTI ${dtiValue.toFixed(1)}%`
                          : "DTI —";
                      return (
                        <>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
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
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                            Guarantors {guarantors.length}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                            Documents {documents.length}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Recipients
                        </p>
                        <p className="text-xs text-gray-500">
                          Choose who receives the PDF.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            id="loan-recipient-applicant"
                            checked={recipientOptions.sendApplicant}
                            disabled={!selectedLoan.applicantEmail}
                            onCheckedChange={(value) =>
                              setRecipientOptions((prev) => ({
                                ...prev,
                                sendApplicant: Boolean(value),
                              }))
                            }
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
                            onCheckedChange={(value) =>
                              setRecipientOptions((prev) => ({
                                ...prev,
                                sendGuarantors: Boolean(value),
                              }))
                            }
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
                        onChange={(event) =>
                          setRecipientOptions((prev) => ({
                            ...prev,
                            extraEmails: event.target.value,
                          }))
                        }
                        placeholder="Add extra emails (comma or semicolon separated)"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Example: finance@company.com, auditor@company.com
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Requested
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {formatCurrency(selectedLoan.loanAmount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedLoan.repaymentPeriod} months
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Approved Amount
                      </p>
                      <p className="mt-2 text-xl font-semibold text-emerald-600">
                        {selectedLoan.approvedAmount != null
                          ? formatCurrency(selectedLoan.approvedAmount)
                          : "Pending"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Interest {selectedInterestLabel || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Monthly Payment
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {formatCurrency(selectedMonthlyPayment)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Total repayable {formatCurrency(selectedTotalRepayable)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Remaining Balance
                      </p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {selectedLoan.remainingBalance != null
                          ? formatCurrency(selectedLoan.remainingBalance)
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Repayment progress{" "}
                        {repaymentProgress != null
                          ? `${Math.round(repaymentProgress)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                        <User className="h-4 w-4 text-emerald-500" />
                        Applicant
                      </div>
                      <p className="mt-3 text-lg font-semibold text-gray-900">
                        {selectedLoan.applicantName}
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{selectedLoan.applicantEmail || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{selectedLoan.applicantPhone || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{selectedLoan.groupName || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                        Loan Snapshot
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <p className="text-base font-semibold text-gray-900">
                          {selectedLoan.loanPurpose}
                        </p>
                        <p>
                          {selectedLoan.purposeDescription ||
                            "No additional description provided."}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2 text-xs text-gray-500">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                            {facilityLabel}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {selectedInterestLabel || "Interest TBD"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {selectedLoan.repaymentPeriod} months
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Approval Timeline
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            Applied {formatDate(selectedLoan.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            Approved {formatDate(selectedLoan.approvedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            Disbursed {formatDate(selectedLoan.disbursedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            Repayment Start{" "}
                            {formatDate(selectedLoan.repaymentStartDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Affordability
                      </p>
                      <div className="mt-3">
                        <p className="text-xl font-semibold text-gray-900">
                          {monthlyIncome
                            ? formatCurrency(monthlyIncome)
                            : "—"}
                        </p>
                        <p className="text-xs text-gray-500">Monthly Income</p>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
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
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Review Notes
                      </p>
                      <p className="mt-3 text-sm text-gray-600">
                        {selectedLoan.reviewNotes ||
                          "No review notes recorded."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                      <User className="h-4 w-4 text-emerald-500" />
                      Guarantors
                    </div>
                    {guarantors.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        No guarantors submitted for this application.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {guarantors.map((g, index) => (
                          <div
                            key={`${g.name}-${index}`}
                            className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                          >
                            <p className="font-semibold text-gray-900">
                              {g.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {g.relationship || g.type || "Guarantor"}
                            </p>
                            <p className="mt-2 text-xs text-gray-600">
                              {g.phone || g.email || "—"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                              {g.liabilityPercentage != null && (
                                <span className="rounded-full bg-white px-2 py-1 text-gray-600">
                                  Liability {g.liabilityPercentage}%
                                </span>
                              )}
                              {g.savingsBalance != null && (
                                <span className="rounded-full bg-white px-2 py-1 text-gray-600">
                                  Savings {formatCurrency(g.savingsBalance)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      Documents
                    </div>
                    {documents.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-500">
                        No documents have been uploaded yet.
                      </p>
                    ) : (
                      <div className="mt-4 divide-y divide-gray-100">
                        {documents.map((doc, index) => (
                          <div
                            key={`${doc.name}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {doc.name}
                              </p>
                              <p className="text-xs text-gray-500">
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
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">
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

                <div className="flex justify-end gap-2 border-t bg-white px-6 py-4">
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
                  {formatCurrency(selectedLoan.loanAmount)}
                </p>
                <p className="text-gray-600 text-sm">
                  {selectedLoan.loanPurpose}
                </p>
              </div>
            )}
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
              >
                Confirm Disbursement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


