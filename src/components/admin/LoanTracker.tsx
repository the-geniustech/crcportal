import {
  type ChangeEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  HandCoins,
  History,
  Loader2,
  Mail,
  Search,
  Wallet,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdminLoanRepaymentHistoryQuery } from "@/hooks/admin/useAdminLoanRepaymentHistoryQuery";
import { useAdminLoanTrackerQuery } from "@/hooks/admin/useAdminLoanTrackerQuery";
import { useRecordAdminLoanManualRepaymentMutation } from "@/hooks/admin/useRecordAdminLoanManualRepaymentMutation";
import {
  downloadAdminLoanRepaymentReceiptPdf,
  emailAdminLoanRepaymentReceipt,
  exportAdminLoanRepaymentHistory,
  uploadAdminLoanRepaymentReceipt,
  type AdminLoanRepaymentReceipt,
  type AdminLoanRepaymentHistoryItem,
  type AdminLoanTrackerItem,
} from "@/lib/adminLoans";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";

type TrackerStatus = "all" | "active" | "overdue" | "completed";

interface LoanTrackerProps {
  groupOptions?: { id: string; name: string }[];
  canManageActions?: boolean;
}

type ManualRepaymentForm = {
  amount: string;
  paymentMethod: string;
  paymentReference: string;
  receivedAt: string;
  notes: string;
  receipt: AdminLoanRepaymentReceipt | null;
};

const paymentMethodOptions = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "pos", label: "POS" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number | null | undefined) => {
  const safe = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(safe) ? safe : 0);
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

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatFileSize = (value?: number | null) => {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const toDateTimeLocalInput = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
};

const normalizeLoanTypeLabel = (value?: string | null) => {
  const facility = getLoanFacility(String(value || ""));
  if (facility?.label) return facility.label;
  const raw = String(value || "").trim();
  if (!raw) return "Loan";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const buildPageItems = (currentPage: number, totalPages: number) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  if (currentPage > 3) pages.push("ellipsis");
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
};

const getTrackerBadge = (status: AdminLoanTrackerItem["trackerStatus"]) => {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="mr-1 w-3.5 h-3.5" />
          Completed
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-red-100 text-red-700">
          <AlertTriangle className="mr-1 w-3.5 h-3.5" />
          Overdue
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Clock3 className="mr-1 w-3.5 h-3.5" />
          Active
        </Badge>
      );
  }
};

const getDefaultFormState = (
  loan: AdminLoanTrackerItem | null,
): ManualRepaymentForm => {
  const defaultAmount =
    loan && loan.nextPaymentAmount > 0
      ? loan.nextPaymentAmount
      : Number(loan?.remainingBalance ?? 0);
  return {
    amount: defaultAmount > 0 ? String(defaultAmount) : "",
    paymentMethod: "bank_transfer",
    paymentReference: "",
    receivedAt: toDateTimeLocalInput(new Date()),
    notes: "",
    receipt: null,
  };
};

export default function LoanTracker({
  groupOptions = [],
  canManageActions = true,
}: LoanTrackerProps) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [statusFilter, setStatusFilter] = useState<TrackerStatus>("active");
  const [groupFilter, setGroupFilter] = useState("all");
  const [loanTypeFilter, setLoanTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<AdminLoanTrackerItem | null>(
    null,
  );
  const [historyLoan, setHistoryLoan] = useState<AdminLoanTrackerItem | null>(
    null,
  );
  const [repaymentForm, setRepaymentForm] = useState<ManualRepaymentForm>(
    getDefaultFormState(null),
  );
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [receiptEmailTarget, setReceiptEmailTarget] =
    useState<AdminLoanRepaymentHistoryItem | null>(null);
  const [receiptEmailInput, setReceiptEmailInput] = useState("");
  const [isEmailingReceipt, setIsEmailingReceipt] = useState(false);
  const [historyExportingFormat, setHistoryExportingFormat] = useState<
    "csv" | "pdf" | null
  >(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploadProgress, setReceiptUploadProgress] = useState(0);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(
    null,
  );
  const [receiptInputKey, setReceiptInputKey] = useState(0);
  const pageSize = 10;

  const trackerQuery = useAdminLoanTrackerQuery(
    {
      status: statusFilter,
      search: deferredSearch || undefined,
      groupId: groupFilter === "all" ? undefined : groupFilter,
      loanType: loanTypeFilter === "all" ? undefined : loanTypeFilter,
    },
    true,
  );
  const historyQuery = useAdminLoanRepaymentHistoryQuery(
    historyLoan?._id ?? null,
    Boolean(historyLoan),
  );
  const recordRepaymentMutation = useRecordAdminLoanManualRepaymentMutation();

  const loans = trackerQuery.data?.loans ?? [];
  const summary = trackerQuery.data?.summary ?? {
    activeLoans: 0,
    completedLoans: 0,
    overdueLoans: 0,
    defaultedLoans: 0,
    totalOutstanding: 0,
    totalRepaid: 0,
    totalNextDue: 0,
  };
  const historyLoanSummary = historyQuery.data?.loan;
  const historySummary = historyQuery.data?.summary;
  const repaymentHistory = historyQuery.data?.repayments ?? [];

  const loanTypeOptions = useMemo(() => {
    const types = Array.from(
      new Set(
        loans.map((loan) => String(loan.loanType || "").trim()).filter(Boolean),
      ),
    );
    return ["all", ...types];
  }, [loans]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, groupFilter, loanTypeFilter]);

  const total = loans.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);
  const pagedLoans = loans.slice((currentPage - 1) * pageSize, pageEnd);
  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedLoan) return;
    setRepaymentForm(getDefaultFormState(selectedLoan));
    setIsUploadingReceipt(false);
    setReceiptUploadProgress(0);
    setReceiptUploadError(null);
    setReceiptInputKey((current) => current + 1);
  }, [selectedLoan]);

  useEffect(() => {
    if (!receiptEmailTarget) {
      setReceiptEmailInput("");
      return;
    }
    setReceiptEmailInput(
      historyLoanSummary?.borrowerEmail || historyLoan?.borrowerEmail || "",
    );
  }, [
    historyLoan?.borrowerEmail,
    historyLoanSummary?.borrowerEmail,
    receiptEmailTarget,
  ]);

  const selectedAmount = Number(repaymentForm.amount);
  const amountIsValid =
    Number.isFinite(selectedAmount) &&
    selectedAmount > 0 &&
    selectedAmount <= Number(selectedLoan?.remainingBalance ?? 0);

  const closeRepaymentFlow = () => {
    setShowConfirmationModal(false);
    setShowRepaymentModal(false);
    setSelectedLoan(null);
    setRepaymentForm(getDefaultFormState(null));
    setIsUploadingReceipt(false);
    setReceiptUploadProgress(0);
    setReceiptUploadError(null);
    setReceiptInputKey((current) => current + 1);
  };

  const clearReceiptAttachment = () => {
    setRepaymentForm((current) => ({
      ...current,
      receipt: null,
    }));
    setReceiptUploadProgress(0);
    setReceiptUploadError(null);
    setReceiptInputKey((current) => current + 1);
  };

  const handleReceiptUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSupportedFile =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isSupportedFile) {
      setReceiptUploadError("Only image or PDF receipts are supported.");
      toast({
        title: "Unsupported receipt file",
        description: "Please upload an image or PDF receipt.",
        variant: "destructive",
      });
      setReceiptInputKey((current) => current + 1);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setReceiptUploadError("Receipt files must be 10MB or smaller.");
      toast({
        title: "Receipt too large",
        description: "Upload a receipt file smaller than 10MB.",
        variant: "destructive",
      });
      setReceiptInputKey((current) => current + 1);
      return;
    }

    try {
      setIsUploadingReceipt(true);
      setReceiptUploadError(null);
      setReceiptUploadProgress(0);
      const uploadedReceipt = await uploadAdminLoanRepaymentReceipt(file, {
        onProgress: (percent) => setReceiptUploadProgress(percent),
      });
      setRepaymentForm((current) => ({
        ...current,
        receipt: uploadedReceipt,
      }));
      setReceiptUploadProgress(100);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to upload the repayment receipt right now.";
      setReceiptUploadError(message);
      toast({
        title: "Receipt upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingReceipt(false);
      setReceiptInputKey((current) => current + 1);
    }
  };

  const continueToConfirmation = () => {
    if (!selectedLoan) return;
    if (isUploadingReceipt) {
      toast({
        title: "Receipt still uploading",
        description: "Please wait for the receipt upload to finish.",
        variant: "destructive",
      });
      return;
    }
    if (!amountIsValid) {
      toast({
        title: "Invalid repayment details",
        description:
          "Enter an amount greater than 0 and not more than the remaining balance.",
        variant: "destructive",
      });
      return;
    }
    const receivedAt = new Date(repaymentForm.receivedAt);
    if (Number.isNaN(receivedAt.getTime())) {
      toast({
        title: "Invalid repayment details",
        description:
          "Provide a valid received date and time before continuing.",
        variant: "destructive",
      });
      return;
    }
    if (!repaymentForm.paymentMethod || !repaymentForm.receivedAt) {
      toast({
        title: "Missing repayment details",
        description: "Payment method and received date are required.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmationModal(true);
  };

  const projectedBalance = selectedLoan
    ? Math.max(
        0,
        Number(selectedLoan.remainingBalance ?? 0) -
          Math.max(0, selectedAmount),
      )
    : 0;
  const receiptEmailCandidates = receiptEmailInput
    .split(/[,\n;]/g)
    .map((value) => value.trim())
    .filter(Boolean);
  const invalidReceiptEmails = receiptEmailCandidates.filter(
    (value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  );
  const validReceiptEmails = receiptEmailCandidates.filter((value, index) => {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
      receiptEmailCandidates.indexOf(value) === index
    );
  });

  const openExternalUrl = (url?: string | null) => {
    if (!url || typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRepaymentReceipt = async (
    repayment: AdminLoanRepaymentHistoryItem,
  ) => {
    if (!historyLoan) return;
    try {
      const { blob, filename } = await downloadAdminLoanRepaymentReceiptPdf(
        historyLoan._id,
        repayment.id,
      );
      triggerBlobDownload(blob, filename);
      toast({
        title: "Receipt downloaded",
        description: `Receipt for ${repayment.reference} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to download the repayment receipt.",
        variant: "destructive",
      });
    }
  };

  const handleEmailRepaymentReceipt = async () => {
    if (!historyLoan || !receiptEmailTarget) return;
    if (validReceiptEmails.length === 0) {
      toast({
        title: "Recipient required",
        description: "Enter at least one valid recipient email.",
        variant: "destructive",
      });
      return;
    }
    if (invalidReceiptEmails.length > 0) {
      toast({
        title: "Invalid recipient email",
        description: "Remove or correct the invalid email addresses first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEmailingReceipt(true);
      const response = await emailAdminLoanRepaymentReceipt(
        historyLoan._id,
        receiptEmailTarget.id,
        { emails: validReceiptEmails },
      );
      setReceiptEmailTarget(null);
      toast({
        title: "Receipt emailed",
        description: `Receipt sent to ${response.recipients.length} recipient${
          response.recipients.length === 1 ? "" : "s"
        }.`,
      });
    } catch (error) {
      toast({
        title: "Email failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to email the repayment receipt.",
        variant: "destructive",
      });
    } finally {
      setIsEmailingReceipt(false);
    }
  };

  const handleExportRepaymentHistory = async (format: "csv" | "pdf") => {
    if (!historyLoan) return;
    try {
      setHistoryExportingFormat(format);
      const { blob, filename } = await exportAdminLoanRepaymentHistory(
        historyLoan._id,
        format,
      );
      triggerBlobDownload(blob, filename);
      toast({
        title: `History ${format.toUpperCase()} ready`,
        description: "Loan repayment history has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to export loan repayment history.",
        variant: "destructive",
      });
    } finally {
      setHistoryExportingFormat(null);
    }
  };

  const handleConfirmRepayment = async () => {
    if (!selectedLoan) return;

    try {
      const result = await recordRepaymentMutation.mutateAsync({
        applicationId: selectedLoan._id,
        amount: selectedAmount,
        paymentMethod: repaymentForm.paymentMethod,
        paymentReference: repaymentForm.paymentReference || null,
        receivedAt: new Date(repaymentForm.receivedAt).toISOString(),
        notes: repaymentForm.notes || null,
        receipt: repaymentForm.receipt,
      });

      closeRepaymentFlow();
      toast({
        title: "Repayment recorded",
        description: result.nextPayment?.amountDue
          ? `Next amount due: ${formatCurrency(result.nextPayment.amountDue)}.`
          : "Loan balance and repayment schedule updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Unable to record repayment",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {trackerQuery.isError && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
          {(trackerQuery.error as Error)?.message ||
            "Failed to load the loan tracker."}
        </div>
      )}

      <div className="gap-4 grid md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-300 text-sm">Active Loans</p>
              <p className="mt-1 font-semibold text-3xl">
                {summary.activeLoans}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-slate-200" />
          </div>
          <p className="mt-4 text-slate-300 text-xs">
            {summary.overdueLoans} with overdue installments
          </p>
        </div>
        <div className="bg-amber-50 p-5 border border-amber-100 rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-amber-700 text-sm">Outstanding Balance</p>
              <p className="mt-1 font-semibold text-amber-950 text-3xl">
                {formatCurrency(summary.totalOutstanding)}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-amber-600" />
          </div>
          <p className="mt-4 text-amber-700 text-xs">
            Total balance still open across tracked loans
          </p>
        </div>
        <div className="bg-emerald-50 p-5 border border-emerald-100 rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-emerald-700 text-sm">Repaid So Far</p>
              <p className="mt-1 font-semibold text-emerald-950 text-3xl">
                {formatCurrency(summary.totalRepaid)}
              </p>
            </div>
            <HandCoins className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="mt-4 text-emerald-700 text-xs">
            Completed loans: {summary.completedLoans}
          </p>
        </div>
        <div className="bg-blue-50 p-5 border border-blue-100 rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-700 text-sm">Next Due Exposure</p>
              <p className="mt-1 font-semibold text-blue-950 text-3xl">
                {formatCurrency(summary.totalNextDue)}
              </p>
            </div>
            <Clock3 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="mt-4 text-blue-700 text-xs">
            Defaulted loans in scope: {summary.defaultedLoans}
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl">
        <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4 p-4 border-gray-100 border-b">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Loan Tracker
            </h3>
            <p className="text-gray-500 text-sm">
              Track exposure, overdue installments, and manual remittances.
            </p>
          </div>
          <div className="gap-3 grid md:grid-cols-2 xl:grid-cols-4">
            <div className="relative min-w-[220px]">
              <Search className="top-3 left-3 absolute w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-9"
                placeholder="Search borrower, phone or loan code"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as TrackerStatus)}
            >
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {groupOptions.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
              <SelectTrigger className="min-w-[160px]">
                <SelectValue placeholder="Loan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All loan types</SelectItem>
                {loanTypeOptions
                  .filter((type) => type !== "all")
                  .map((type) => (
                    <SelectItem key={type} value={type}>
                      {normalizeLoanTypeLabel(type)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Loan</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackerQuery.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-gray-500 text-sm text-center"
                  >
                    Loading loan tracker...
                  </TableCell>
                </TableRow>
              )}
              {!trackerQuery.isLoading && pagedLoans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-gray-500 text-sm text-center"
                  >
                    No loans matched the current filters.
                  </TableCell>
                </TableRow>
              )}
              {pagedLoans.map((loan) => {
                const progressValue =
                  loan.totalRepayable > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (loan.repaidSoFar / loan.totalRepayable) * 100,
                        ),
                      )
                    : 0;
                const facility = getLoanFacility(String(loan.loanType || ""));
                const interestLabel = formatInterestLabel(
                  loan.interestRate,
                  loan.interestRateType ||
                    facility?.interestRateType ||
                    "annual",
                  facility?.interestRateRange,
                );

                return (
                  <TableRow key={loan._id} className="align-top">
                    <TableCell className="min-w-[220px]">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {loan.borrowerName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {loan.borrowerEmail || "-"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {loan.borrowerPhone || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {loan.loanCode || "Loan application"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {normalizeLoanTypeLabel(loan.loanType)} -{" "}
                          {loan.groupName || "Unassigned group"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatCurrency(loan.approvedAmount)} -{" "}
                          {interestLabel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {loan.nextPaymentAmount > 0
                            ? formatCurrency(loan.nextPaymentAmount)
                            : "-"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Due {formatDate(loan.nextPaymentDueDate)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Installment {loan.nextInstallmentNumber ?? "-"} -{" "}
                          {loan.overdueInstallments} overdue
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(loan.remainingBalance)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Repaid {formatCurrency(loan.repaidSoFar)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Last paid {formatDate(loan.lastPaidAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-gray-500 text-xs">
                          <span>
                            {loan.paidInstallments}/{loan.totalInstallments}{" "}
                            settled
                          </span>
                          <span>{progressValue}%</span>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{getTrackerBadge(loan.trackerStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex sm:flex-row flex-col sm:justify-end items-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setHistoryLoan(loan)}
                        >
                          <History className="mr-1.5 w-4 h-4" />
                          History
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={
                            !canManageActions ||
                            loan.trackerStatus === "completed" ||
                            loan.remainingBalance <= 0
                          }
                          onClick={() => {
                            setSelectedLoan(loan);
                            setRepaymentForm(getDefaultFormState(loan));
                            setShowRepaymentModal(true);
                          }}
                        >
                          Mark Paid
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {total > 0 && totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-gray-100 border-t">
            <p className="text-gray-500 text-sm">
              Showing {pageStart}-{pageEnd} of {total} loans
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                  />
                </PaginationItem>
                {pageItems.map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Sheet
        open={Boolean(historyLoan)}
        onOpenChange={(open) => {
          if (!open) setHistoryLoan(null);
        }}
      >
        <SheetContent side="right" className="p-0 w-full sm:max-w-2xl">
          <div className="flex flex-col h-full">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 pr-14 border-gray-100 border-b text-white">
              <SheetHeader className="space-y-3 text-left">
                <SheetTitle className="text-white">
                  Repayment History
                </SheetTitle>
                <SheetDescription className="text-slate-300">
                  Detailed repayment activity, receipt support, and balance
                  movement for this loan.
                </SheetDescription>
              </SheetHeader>
              <div className="gap-4 grid md:grid-cols-2 mt-5">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                    Borrower
                  </p>
                  <p className="mt-1 font-semibold text-lg">
                    {historyLoanSummary?.borrowerName ||
                      historyLoan?.borrowerName ||
                      "Member"}
                  </p>
                  <p className="text-slate-300 text-sm">
                    {historyLoanSummary?.borrowerEmail ||
                      historyLoan?.borrowerEmail ||
                      "No email"}
                  </p>
                  <p className="text-slate-300 text-sm">
                    {historyLoanSummary?.borrowerPhone ||
                      historyLoan?.borrowerPhone ||
                      "No phone"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.18em]">
                    Loan
                  </p>
                  <p className="mt-1 font-semibold text-lg">
                    {historyLoanSummary?.loanCode ||
                      historyLoan?.loanCode ||
                      "Loan application"}
                  </p>
                  <p className="text-slate-300 text-sm">
                    {normalizeLoanTypeLabel(
                      historyLoanSummary?.loanType || historyLoan?.loanType,
                    )}{" "}
                    -{" "}
                    {historyLoanSummary?.groupName ||
                      historyLoan?.groupName ||
                      "Unassigned group"}
                  </p>
                  <p className="text-slate-300 text-sm">
                    Outstanding{" "}
                    {formatCurrency(
                      historySummary?.remainingBalance ??
                        historyLoanSummary?.remainingBalance ??
                        historyLoan?.remainingBalance,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-6 p-6">
                {historyQuery.isError && (
                  <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-red-700 text-sm">
                    {(historyQuery.error as Error)?.message ||
                      "Unable to load repayment history."}
                  </div>
                )}

                <div className="gap-4 grid md:grid-cols-2 xl:grid-cols-4">
                  <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-2xl">
                    <p className="text-emerald-700 text-sm">Collected</p>
                    <p className="mt-1 font-semibold text-emerald-950 text-2xl">
                      {formatCurrency(historySummary?.totalCollected)}
                    </p>
                    <p className="mt-2 text-emerald-700 text-xs">
                      {historySummary?.totalRepayments ?? 0} repayment entries
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 border border-amber-100 rounded-2xl">
                    <p className="text-amber-700 text-sm">Remaining Balance</p>
                    <p className="mt-1 font-semibold text-amber-950 text-2xl">
                      {formatCurrency(historySummary?.remainingBalance)}
                    </p>
                    <p className="mt-2 text-amber-700 text-xs">
                      Repaid so far{" "}
                      {formatCurrency(historySummary?.repaidSoFar)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 border border-blue-100 rounded-2xl">
                    <p className="text-blue-700 text-sm">Next Due</p>
                    <p className="mt-1 font-semibold text-blue-950 text-2xl">
                      {formatCurrency(historySummary?.nextPaymentAmount)}
                    </p>
                    <p className="mt-2 text-blue-700 text-xs">
                      Due {formatDate(historySummary?.nextPaymentDueDate)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                    <p className="text-slate-600 text-sm">Installments</p>
                    <p className="mt-1 font-semibold text-slate-900 text-2xl">
                      {historySummary?.settledInstallments ?? 0}/
                      {historySummary?.totalInstallments ?? 0}
                    </p>
                    <p className="mt-2 text-slate-600 text-xs">
                      {historySummary?.overdueInstallments ?? 0} overdue
                    </p>
                  </div>
                </div>

                <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-2xl">
                  <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-base">
                        Repayment Ledger
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Every posted repayment on this loan, including manual
                        and self-service collections.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700">
                        Last repayment{" "}
                        {formatDateTime(historySummary?.lastRepaymentAt)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={historyExportingFormat === "csv"}
                        onClick={() => {
                          void handleExportRepaymentHistory("csv");
                        }}
                      >
                        {historyExportingFormat === "csv" ? (
                          <Loader2 className="mr-1.5 w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="mr-1.5 w-4 h-4" />
                        )}
                        Export CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={historyExportingFormat === "pdf"}
                        onClick={() => {
                          void handleExportRepaymentHistory("pdf");
                        }}
                      >
                        {historyExportingFormat === "pdf" ? (
                          <Loader2 className="mr-1.5 w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="mr-1.5 w-4 h-4" />
                        )}
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  {historyQuery.isLoading ? (
                    <div className="flex items-center gap-3 py-10 text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading repayment history...
                    </div>
                  ) : repaymentHistory.length === 0 ? (
                    <div className="bg-gray-50 px-4 py-10 border border-gray-200 border-dashed rounded-xl text-gray-500 text-sm text-center">
                      No repayments have been posted on this loan yet.
                    </div>
                  ) : (
                    <div className="space-y-4 mt-5">
                      {repaymentHistory.map((repayment) => (
                        <div
                          key={repayment.id}
                          className="bg-gray-50 p-4 border border-gray-100 rounded-2xl"
                        >
                          <div className="flex md:flex-row flex-col md:justify-between md:items-start gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900 text-lg">
                                  {formatCurrency(repayment.amount)}
                                </p>
                                <Badge
                                  className={
                                    repayment.manual
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                  }
                                >
                                  {repayment.manual ? "Manual" : "Self-service"}
                                </Badge>
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  {repayment.paymentMethod ||
                                    repayment.gateway ||
                                    "Posted"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-gray-500 text-sm">
                                Ref {repayment.reference}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    void handleDownloadRepaymentReceipt(
                                      repayment,
                                    );
                                  }}
                                >
                                  <FileText className="mr-1.5 w-4 h-4" />
                                  Download Receipt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setReceiptEmailTarget(repayment)
                                  }
                                >
                                  <Mail className="mr-1.5 w-4 h-4" />
                                  Email Receipt
                                </Button>
                              </div>
                            </div>
                            <div className="text-gray-500 text-sm md:text-right">
                              <p>
                                Received {formatDateTime(repayment.receivedAt)}
                              </p>
                              <p>
                                Recorded {formatDateTime(repayment.recordedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="gap-3 grid md:grid-cols-2 mt-4">
                            <div className="space-y-2 text-gray-600 text-sm">
                              <p>
                                Posted by{" "}
                                <span className="font-medium text-gray-900">
                                  {repayment.recordedBy?.name || "System"}
                                </span>
                              </p>
                              <p>
                                Balance after payment{" "}
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(
                                    repayment.remainingBalanceAfterPayment,
                                  )}
                                </span>
                              </p>
                              <p>
                                Settled installments{" "}
                                <span className="font-medium text-gray-900">
                                  {repayment.settledInstallmentCount}
                                </span>
                              </p>
                              {repayment.paymentReference ? (
                                <p>
                                  External reference{" "}
                                  <span className="font-medium text-gray-900">
                                    {repayment.paymentReference}
                                  </span>
                                </p>
                              ) : null}
                            </div>

                            <div className="space-y-3">
                              {repayment.receipt ? (
                                <div className="bg-white p-3 border border-gray-200 rounded-xl">
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex items-start gap-3">
                                      {repayment.receipt.type.startsWith(
                                        "image/",
                                      ) ? (
                                        <div className="bg-gray-100 border border-gray-200 rounded-lg w-12 h-12 overflow-hidden">
                                          <img
                                            src={repayment.receipt.url}
                                            alt={repayment.receipt.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex justify-center items-center bg-red-50 border border-gray-200 rounded-lg w-12 h-12 text-red-600">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium text-gray-900">
                                          {repayment.receipt.name}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                          {formatFileSize(
                                            repayment.receipt.size,
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        openExternalUrl(repayment.receipt?.url)
                                      }
                                    >
                                      <ExternalLink className="mr-1.5 w-4 h-4" />
                                      View
                                    </Button>
                                  </div>
                                </div>
                              ) : null}

                              {repayment.notes ? (
                                <div className="bg-white p-3 border border-gray-200 border-dashed rounded-xl text-gray-600 text-sm">
                                  {repayment.notes}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {repayment.allocations.length > 0 ? (
                            <div className="mt-4">
                              <p className="mb-2 font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Allocation Breakdown
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {repayment.allocations.map((allocation) => (
                                  <Badge
                                    key={`${repayment.id}-${allocation.scheduleItemId}-${allocation.installmentNumber}`}
                                    className="bg-slate-100 text-slate-700"
                                  >
                                    Inst. {allocation.installmentNumber}:{" "}
                                    {formatCurrency(allocation.appliedAmount)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={showRepaymentModal}
        onOpenChange={(open) => {
          if (!open) {
            closeRepaymentFlow();
            return;
          }
          setShowRepaymentModal(true);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Record Manual Loan Repayment</DialogTitle>
            <DialogDescription>
              Apply an offline repayment against the oldest due installments
              first. This updates the borrower&apos;s balances, repayment
              schedule, and transaction record in one step.
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-6">
              <div className="gap-4 grid md:grid-cols-3 bg-gray-50 p-4 border border-gray-100 rounded-2xl">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Borrower
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedLoan.borrowerName}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {selectedLoan.groupName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Next Due
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatCurrency(selectedLoan.nextPaymentAmount)}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Due {formatDate(selectedLoan.nextPaymentDueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    Remaining Balance
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatCurrency(selectedLoan.remainingBalance)}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Repaid {formatCurrency(selectedLoan.repaidSoFar)}
                  </p>
                </div>
              </div>

              <div className="gap-4 grid md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loan-repayment-amount">Amount</Label>
                  <Input
                    id="loan-repayment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    max={selectedLoan.remainingBalance}
                    value={repaymentForm.amount}
                    onChange={(event) =>
                      setRepaymentForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                  />
                  <p className="text-gray-500 text-xs">
                    Defaulted to the next due amount. Any amount up to{" "}
                    {formatCurrency(selectedLoan.remainingBalance)} can be
                    recorded.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan-payment-method">Payment Method</Label>
                  <Select
                    value={repaymentForm.paymentMethod}
                    onValueChange={(value) =>
                      setRepaymentForm((current) => ({
                        ...current,
                        paymentMethod: value,
                      }))
                    }
                  >
                    <SelectTrigger id="loan-payment-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan-payment-reference">
                    External Reference
                  </Label>
                  <Input
                    id="loan-payment-reference"
                    value={repaymentForm.paymentReference}
                    onChange={(event) =>
                      setRepaymentForm((current) => ({
                        ...current,
                        paymentReference: event.target.value,
                      }))
                    }
                    placeholder="Bank teller, POS slip or receipt number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan-received-at">Received At</Label>
                  <Input
                    id="loan-received-at"
                    type="datetime-local"
                    value={repaymentForm.receivedAt}
                    onChange={(event) =>
                      setRepaymentForm((current) => ({
                        ...current,
                        receivedAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 border border-gray-100 rounded-2xl">
                <div>
                  <Label htmlFor="loan-repayment-receipt">
                    Receipt Attachment
                  </Label>
                  <p className="mt-1 text-gray-500 text-xs">
                    Optional. Upload a teller, slip, or scanned payment proof as
                    an image or PDF.
                  </p>
                </div>
                <Input
                  key={receiptInputKey}
                  id="loan-repayment-receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) => {
                    void handleReceiptUpload(event);
                  }}
                />
                {isUploadingReceipt ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-gray-500 text-xs">
                      <span>Uploading receipt...</span>
                      <span>{receiptUploadProgress}%</span>
                    </div>
                    <Progress value={receiptUploadProgress} className="h-2" />
                  </div>
                ) : null}
                {receiptUploadError ? (
                  <p className="text-red-600 text-xs">{receiptUploadError}</p>
                ) : null}
                {repaymentForm.receipt ? (
                  <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-3 bg-white p-3 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      {repaymentForm.receipt.type.startsWith("image/") ? (
                        <div className="bg-gray-100 border border-gray-200 rounded-lg w-12 h-12 overflow-hidden">
                          <img
                            src={repaymentForm.receipt.url}
                            alt={repaymentForm.receipt.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex justify-center items-center bg-red-50 border border-gray-200 rounded-lg w-12 h-12 text-red-600">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {repaymentForm.receipt.name}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatFileSize(repaymentForm.receipt.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openExternalUrl(repaymentForm.receipt?.url)
                        }
                      >
                        <ExternalLink className="mr-1.5 w-4 h-4" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearReceiptAttachment}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-repayment-notes">Notes</Label>
                <Textarea
                  id="loan-repayment-notes"
                  value={repaymentForm.notes}
                  onChange={(event) =>
                    setRepaymentForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Add internal narration or collection notes."
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeRepaymentFlow}>
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={continueToConfirmation}
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(receiptEmailTarget)}
        onOpenChange={(open) => {
          if (!open) setReceiptEmailTarget(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Repayment Receipt</DialogTitle>
            <DialogDescription>
              Send the generated receipt PDF for{" "}
              <span className="font-medium text-gray-900">
                {receiptEmailTarget?.reference || "this repayment"}
              </span>{" "}
              to one or more recipients.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt-email-input">Recipients</Label>
              <Textarea
                id="receipt-email-input"
                value={receiptEmailInput}
                onChange={(event) => setReceiptEmailInput(event.target.value)}
                rows={4}
                placeholder="member@example.com, coordinator@example.com"
              />
              <p className="text-gray-500 text-xs">
                Separate multiple emails with commas, spaces, or new lines.
              </p>
            </div>

            <div className="bg-gray-50 p-4 border border-gray-100 rounded-xl text-sm">
              <p className="font-medium text-gray-900">Recipient preview</p>
              <p className="mt-2 text-gray-600">
                Valid: {validReceiptEmails.length || 0}
              </p>
              {validReceiptEmails.length > 0 ? (
                <p className="mt-1 text-gray-700 break-words">
                  {validReceiptEmails.join(", ")}
                </p>
              ) : (
                <p className="mt-1 text-gray-500">No valid recipients yet.</p>
              )}
              {invalidReceiptEmails.length > 0 ? (
                <p className="mt-3 text-red-600 break-words">
                  Invalid: {invalidReceiptEmails.join(", ")}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReceiptEmailTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  void handleEmailRepaymentReceipt();
                }}
                disabled={isEmailingReceipt}
              >
                {isEmailingReceipt ? (
                  <Loader2 className="mr-1.5 w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 w-4 h-4" />
                )}
                Send Receipt
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showConfirmationModal}
        onOpenChange={setShowConfirmationModal}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Loan Repayment</AlertDialogTitle>
            <AlertDialogDescription>
              This will post a manual repayment and recalculate the next due
              amount immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedLoan && (
            <div className="space-y-3 bg-gray-50 p-4 border border-gray-100 rounded-xl text-gray-700 text-sm">
              <div className="flex justify-between items-center">
                <span>Borrower</span>
                <span className="font-medium text-gray-900">
                  {selectedLoan.borrowerName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Loan</span>
                <span className="font-medium text-gray-900">
                  {selectedLoan.loanCode ||
                    normalizeLoanTypeLabel(selectedLoan.loanType)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Amount</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(selectedAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Payment method</span>
                <span className="font-medium text-gray-900">
                  {paymentMethodOptions.find(
                    (option) => option.value === repaymentForm.paymentMethod,
                  )?.label || repaymentForm.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Received at</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(repaymentForm.receivedAt)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Balance after payment</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(projectedBalance)}
                </span>
              </div>
              {repaymentForm.paymentReference ? (
                <div className="flex justify-between items-center gap-4">
                  <span>Reference</span>
                  <span className="font-medium text-gray-900 truncate">
                    {repaymentForm.paymentReference}
                  </span>
                </div>
              ) : null}
              {repaymentForm.receipt ? (
                <div className="flex justify-between items-center gap-4">
                  <span>Receipt</span>
                  <button
                    type="button"
                    className="font-medium text-emerald-700 hover:text-emerald-800 truncate"
                    onClick={() => openExternalUrl(repaymentForm.receipt?.url)}
                  >
                    {repaymentForm.receipt.name}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRepayment();
              }}
              disabled={recordRepaymentMutation.isPending}
            >
              {recordRepaymentMutation.isPending
                ? "Recording..."
                : "Confirm repayment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
