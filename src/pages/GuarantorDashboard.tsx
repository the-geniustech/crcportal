import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGuarantorRequestsQuery } from "@/hooks/loans/useGuarantorRequestsQuery";
import { useGuarantorCommitmentsQuery } from "@/hooks/loans/useGuarantorCommitmentsQuery";
import { useGuarantorNotificationsQuery } from "@/hooks/loans/useGuarantorNotificationsQuery";
import { useRespondToGuarantorRequestMutation } from "@/hooks/loans/useRespondToGuarantorRequestMutation";
import { useMarkGuarantorNotificationReadMutation } from "@/hooks/loans/useMarkGuarantorNotificationReadMutation";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Wallet,
  TrendingUp,
  Bell,
  Eye,
  MessageSquare,
  Loader2,
  ChevronRight,
  Calendar,
  Phone,
  Mail,
  BanknoteIcon,
} from "lucide-react";

interface GuarantorRequest {
  id: string;
  loanId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  loanAmount: number;
  liabilityPercentage: number;
  liabilityAmount: number;
  requestMessage: string;
  requestDate: string;
  status: "pending" | "accepted" | "rejected";
  loanPurpose: string;
  repaymentTerm: number;
}

interface ActiveCommitment {
  id: string;
  loanId: string;
  borrowerName: string;
  loanAmount: number;
  liabilityAmount: number;
  liabilityPercentage: number;
  loanStatus: "active" | "completed" | "defaulted";
  disbursedDate: string;
  remainingBalance: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  missedPayments: number;
  totalPaid: number;
  progressPercentage: number;
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  date: string;
  read: boolean;
}

interface RawGuarantorRequest {
  guarantorId?: string;
  id?: string;
  loanId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  loanAmount: number;
  liabilityPercentage: number;
  liabilityAmount: number;
  requestMessage: string;
  requestDate: string;
  status: string;
  loanPurpose: string;
  repaymentTerm: number;
}

interface RawActiveCommitment {
  guarantorId?: string;
  id?: string;
  loanId: string;
  borrowerName: string;
  loanAmount: number;
  liabilityAmount: number;
  liabilityPercentage: number;
  loanStatus: string;
  disbursedDate: string;
  remainingBalance: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  missedPayments: number;
  totalPaid: number;
  progressPercentage: number;
}

interface RawNotificationItem {
  _id?: string;
  id?: string;
  notificationType?: string;
  type?: string;
  message: string;
  createdAt?: string;
  date?: string;
  readAt?: boolean;
  read?: boolean;
}

interface NotificationsData {
  notifications: RawNotificationItem[];
  unread: number;
}

/*
// Sample data
const sampleRequests: GuarantorRequest[] = [
  {
    id: '1',
    loanId: 'L001',
    borrowerName: 'Adebayo Johnson',
    borrowerEmail: 'adebayo@email.com',
    borrowerPhone: '08012345678',
    loanAmount: 500000,
    liabilityPercentage: 50,
    liabilityAmount: 250000,
    requestMessage: 'Hi, I need this loan to expand my business. I promise to repay on time.',
    requestDate: '2025-12-24',
    status: 'pending',
    loanPurpose: 'Business Expansion',
    repaymentTerm: 12,
  },
  {
    id: '2',
    loanId: 'L002',
    borrowerName: 'Fatima Bello',
    borrowerEmail: 'fatima@email.com',
    borrowerPhone: '08045678901',
    loanAmount: 300000,
    liabilityPercentage: 100,
    liabilityAmount: 300000,
    requestMessage: 'I need funds for my children\'s school fees. Will repay from my salary.',
    requestDate: '2025-12-23',
    status: 'pending',
    loanPurpose: 'Education',
    repaymentTerm: 6,
  },
];

const sampleCommitments: ActiveCommitment[] = [
  {
    id: '1',
    loanId: 'L003',
    borrowerName: 'Chioma Okonkwo',
    loanAmount: 750000,
    liabilityAmount: 375000,
    liabilityPercentage: 50,
    loanStatus: 'active',
    disbursedDate: '2025-10-15',
    remainingBalance: 450000,
    nextPaymentDate: '2026-01-15',
    nextPaymentAmount: 68750,
    missedPayments: 0,
    totalPaid: 300000,
    progressPercentage: 40,
  },
  {
    id: '2',
    loanId: 'L004',
    borrowerName: 'Emeka Nnamdi',
    loanAmount: 400000,
    liabilityAmount: 200000,
    liabilityPercentage: 50,
    loanStatus: 'active',
    disbursedDate: '2025-09-01',
    remainingBalance: 120000,
    nextPaymentDate: '2026-01-01',
    nextPaymentAmount: 40000,
    missedPayments: 1,
    totalPaid: 280000,
    progressPercentage: 70,
  },
  {
    id: '3',
    loanId: 'L005',
    borrowerName: 'Grace Adeleke',
    loanAmount: 200000,
    liabilityAmount: 200000,
    liabilityPercentage: 100,
    loanStatus: 'completed',
    disbursedDate: '2025-06-01',
    remainingBalance: 0,
    nextPaymentDate: '',
    nextPaymentAmount: 0,
    missedPayments: 0,
    totalPaid: 220000,
    progressPercentage: 100,
  },
];

const sampleNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'missed_payment',
    message: 'Emeka Nnamdi missed their loan payment due on Dec 15, 2025',
    date: '2025-12-16',
    read: false,
  },
  {
    id: '2',
    type: 'payment_received',
    message: 'Chioma Okonkwo made their monthly payment of ₦68,750',
    date: '2025-12-15',
    read: true,
  },
  {
    id: '3',
    type: 'new_request',
    message: 'You have a new guarantor request from Adebayo Johnson',
    date: '2025-12-24',
    read: false,
  },
];
*/

function GuarantorDashboardContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const requestsQuery = useGuarantorRequestsQuery();
  const commitmentsQuery = useGuarantorCommitmentsQuery();
  const notificationsQuery = useGuarantorNotificationsQuery();
  const respondMutation = useRespondToGuarantorRequestMutation();
  const markReadMutation = useMarkGuarantorNotificationReadMutation();

  const [activeTab, setActiveTab] = useState<
    "requests" | "commitments" | "notifications"
  >("requests");
  const [selectedRequest, setSelectedRequest] =
    useState<GuarantorRequest | null>(null);
  const [responseComment, setResponseComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commitmentFilter, setCommitmentFilter] = useState<
    "all" | "active" | "completed"
  >("all");

  const requests: GuarantorRequest[] = (requestsQuery.data ?? []).map(
    (r: RawGuarantorRequest) => ({
      id: String(r.guarantorId || r.id),
      loanId: String(r.loanId),
      borrowerName: String(r.borrowerName || ""),
      borrowerEmail: String(r.borrowerEmail || ""),
      borrowerPhone: String(r.borrowerPhone || ""),
      loanAmount: Number(r.loanAmount || 0),
      liabilityPercentage: Number(r.liabilityPercentage || 0),
      liabilityAmount: Number(r.liabilityAmount || 0),
      requestMessage: String(r.requestMessage || ""),
      requestDate: String(r.requestDate || "").slice(0, 10),
      status: (r.status as GuarantorRequest["status"]) || "pending",
      loanPurpose: String(r.loanPurpose || ""),
      repaymentTerm: Number(r.repaymentTerm || 0),
    }),
  );

  const commitments: ActiveCommitment[] = (commitmentsQuery.data ?? []).map(
    (c: RawActiveCommitment) => ({
      id: String(c.guarantorId || c.id),
      loanId: String(c.loanId),
      borrowerName: String(c.borrowerName || ""),
      loanAmount: Number(c.loanAmount || 0),
      liabilityAmount: Number(c.liabilityAmount || 0),
      liabilityPercentage: Number(c.liabilityPercentage || 0),
      loanStatus: (c.loanStatus || "active") as
        | "active"
        | "completed"
        | "defaulted",
      disbursedDate: String(c.disbursedDate || "").slice(0, 10),
      remainingBalance: Number(c.remainingBalance || 0),
      nextPaymentDate: String(c.nextPaymentDate || "").slice(0, 10),
      nextPaymentAmount: Number(c.nextPaymentAmount || 0),
      missedPayments: Number(c.missedPayments || 0),
      totalPaid: Number(c.totalPaid || 0),
      progressPercentage: Number(c.progressPercentage || 0),
    }),
  );

  const notifications: NotificationItem[] = (
    (notificationsQuery.data as unknown as NotificationsData)?.notifications ??
    []
  ).map((n: RawNotificationItem) => ({
    id: String(n._id || n.id),
    type: String(n.notificationType || n.type || ""),
    message: String(n.message || ""),
    date: String(n.createdAt || n.date || "").slice(0, 10),
    read: Boolean(n.readAt || n.read),
  }));

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const activeCommitments = commitments.filter(
    (c) => commitmentFilter === "all" || c.loanStatus === commitmentFilter,
  );
  const unreadNotifications = Number(
    (notificationsQuery.data as unknown as NotificationsData)?.unread ??
      notifications.filter((n) => !n.read).length,
  );
  const notificationError =
    notificationsQuery.error instanceof Error
      ? notificationsQuery.error.message
      : null;
  const totalLiability = commitments
    .filter((c) => c.loanStatus === "active")
    .reduce((sum, c) => sum + c.liabilityAmount, 0);
  const atRiskAmount = commitments
    .filter((c) => c.missedPayments > 0)
    .reduce((sum, c) => sum + c.liabilityAmount, 0);

  const handleAcceptRequest = async (request: GuarantorRequest) => {
    setIsProcessing(true);
    try {
      await respondMutation.mutateAsync({
        guarantorId: request.id,
        status: "accepted",
        responseComment,
      });

      toast({
        title: "Request Accepted",
        description: `You are now a guarantor for ${request.borrowerName}'s loan`,
      });

      setSelectedRequest(null);
      setResponseComment("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to accept request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async (request: GuarantorRequest) => {
    setIsProcessing(true);
    try {
      await respondMutation.mutateAsync({
        guarantorId: request.id,
        status: "rejected",
        responseComment,
      });

      toast({
        title: "Request Declined",
        description: `You have declined to guarantee ${request.borrowerName}'s loan`,
      });

      setSelectedRequest(null);
      setResponseComment("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to decline request",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeGuarantee = async (commitment: ActiveCommitment) => {
    // Only allow revocation before disbursement
    toast({
      title: "Cannot Revoke",
      description: "Guarantees can only be revoked before loan disbursement",
      variant: "destructive",
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-emerald-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 font-bold text-gray-900 text-3xl">
            <Shield className="w-8 h-8 text-emerald-600" />
            Guarantor Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your loan guarantor requests and monitor guaranteed loans
          </p>
        </div>

        {/* Stats Cards */}
        <div className="gap-4 grid grid-cols-1 md:grid-cols-4 mb-8">
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-amber-100 rounded-xl w-12 h-12">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {pendingRequests.length}
                </p>
                <p className="text-gray-500 text-sm">Pending Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-emerald-100 rounded-xl w-12 h-12">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {commitments.filter((c) => c.loanStatus === "active").length}
                </p>
                <p className="text-gray-500 text-sm">Active Guarantees</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-xl w-12 h-12">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  ₦{(totalLiability / 1000).toFixed(0)}K
                </p>
                <p className="text-gray-500 text-sm">Total Liability</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-red-100 rounded-xl w-12 h-12">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  ₦{(atRiskAmount / 1000).toFixed(0)}K
                </p>
                <p className="text-gray-500 text-sm">At Risk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors whitespace-nowrap ${
              activeTab === "requests"
                ? "bg-emerald-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("commitments")}
            className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors whitespace-nowrap ${
              activeTab === "commitments"
                ? "bg-emerald-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border"
            }`}
          >
            <Shield className="w-4 h-4" />
            My Commitments
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors whitespace-nowrap ${
              activeTab === "notifications"
                ? "bg-emerald-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border"
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unreadNotifications > 0 && (
              <span className="bg-red-500 px-2 py-0.5 rounded-full text-white text-sm">
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="gap-8 grid lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Pending Requests */}
            {activeTab === "requests" && (
              <div className="space-y-4">
                {pendingRequests.length === 0 ? (
                  <div className="bg-white p-12 border rounded-xl text-center">
                    <Clock className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                    <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                      No Pending Requests
                    </h3>
                    <p className="text-gray-500">
                      You don't have any guarantor requests at the moment
                    </p>
                  </div>
                ) : (
                  pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white p-6 border rounded-xl"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex justify-center items-center bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full w-14 h-14 font-bold text-white text-xl">
                            {request.borrowerName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {request.borrowerName}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              Requested on {request.requestDate}
                            </p>
                          </div>
                        </div>
                        <span className="bg-amber-100 px-3 py-1 rounded-full font-medium text-amber-700 text-sm">
                          Pending
                        </span>
                      </div>

                      <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Loan Amount</p>
                          <p className="font-semibold text-gray-900">
                            ₦{request.loanAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">
                            Your Liability
                          </p>
                          <p className="font-semibold text-emerald-600">
                            ₦{request.liabilityAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Liability %</p>
                          <p className="font-semibold text-gray-900">
                            {request.liabilityPercentage}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">
                            Repayment Term
                          </p>
                          <p className="font-semibold text-gray-900">
                            {request.repaymentTerm} months
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 mb-4 p-4 rounded-lg">
                        <p className="text-blue-800 text-sm">
                          <span className="font-medium">Purpose:</span>{" "}
                          {request.loanPurpose}
                        </p>
                        {request.requestMessage && (
                          <p className="mt-2 text-blue-700 text-sm italic">
                            "{request.requestMessage}"
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setSelectedRequest(request)}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Review Details
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            handleAcceptRequest(request);
                          }}
                          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            handleRejectRequest(request);
                          }}
                          variant="destructive"
                          className="flex-1 gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Active Commitments */}
            {activeTab === "commitments" && (
              <div className="space-y-4">
                {/* Filter */}
                <div className="flex gap-2 mb-4">
                  {(["all", "active", "completed"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setCommitmentFilter(filter)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                        commitmentFilter === filter
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-white text-gray-600 hover:bg-gray-50 border"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {activeCommitments.length === 0 ? (
                  <div className="bg-white p-12 border rounded-xl text-center">
                    <Shield className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                    <h3 className="mb-2 font-semibold text-gray-900 text-xl">
                      No Commitments
                    </h3>
                    <p className="text-gray-500">
                      You haven't guaranteed any loans yet
                    </p>
                  </div>
                ) : (
                  activeCommitments.map((commitment) => (
                    <div
                      key={commitment.id}
                      className="bg-white p-6 border rounded-xl"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex justify-center items-center bg-gradient-to-br from-blue-400 to-blue-600 rounded-full w-14 h-14 font-bold text-white text-xl">
                            {commitment.borrowerName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {commitment.borrowerName}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              Loan ID: {commitment.loanId}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${
                            commitment.loanStatus === "active"
                              ? commitment.missedPayments > 0
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {commitment.loanStatus === "active" &&
                          commitment.missedPayments > 0
                            ? `${commitment.missedPayments} Missed Payment${commitment.missedPayments > 1 ? "s" : ""}`
                            : commitment.loanStatus.charAt(0).toUpperCase() +
                              commitment.loanStatus.slice(1)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2 text-sm">
                          <span className="text-gray-600">
                            Repayment Progress
                          </span>
                          <span className="font-medium text-gray-900">
                            {commitment.progressPercentage}%
                          </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              commitment.loanStatus === "completed"
                                ? "bg-emerald-500"
                                : commitment.missedPayments > 0
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                            }`}
                            style={{
                              width: `${commitment.progressPercentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Loan Amount</p>
                          <p className="font-semibold text-gray-900">
                            ₦{commitment.loanAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">
                            Your Liability
                          </p>
                          <p className="font-semibold text-emerald-600">
                            ₦{commitment.liabilityAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">
                            Remaining Balance
                          </p>
                          <p className="font-semibold text-gray-900">
                            ₦{commitment.remainingBalance.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500 text-xs">Total Paid</p>
                          <p className="font-semibold text-emerald-600">
                            ₦{commitment.totalPaid.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {commitment.loanStatus === "active" && (
                        <div
                          className={`p-4 rounded-lg mb-4 ${
                            commitment.missedPayments > 0
                              ? "bg-red-50"
                              : "bg-blue-50"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p
                                className={`text-sm font-medium ${
                                  commitment.missedPayments > 0
                                    ? "text-red-800"
                                    : "text-blue-800"
                                }`}
                              >
                                Next Payment Due
                              </p>
                              <p
                                className={`text-lg font-bold ${
                                  commitment.missedPayments > 0
                                    ? "text-red-900"
                                    : "text-blue-900"
                                }`}
                              >
                                ₦{commitment.nextPaymentAmount.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm ${
                                  commitment.missedPayments > 0
                                    ? "text-red-700"
                                    : "text-blue-700"
                                }`}
                              >
                                {commitment.nextPaymentDate}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 gap-2">
                          <Eye className="w-4 h-4" />
                          View Loan Details
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2">
                          <Phone className="w-4 h-4" />
                          Contact Borrower
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <div className="space-y-3">
                {notificationsQuery.isLoading ? (
                  <div className="bg-white p-6 border rounded-xl text-center">
                    <div className="mx-auto mb-3 border-2 border-emerald-500 border-t-transparent rounded-full w-10 h-10 animate-spin"></div>
                    <p className="text-gray-500 text-sm">
                      Loading notifications...
                    </p>
                  </div>
                ) : notificationError ? (
                  <div className="bg-white p-6 border rounded-xl text-center">
                    <p className="text-gray-500 text-sm">
                      Unable to load notifications.
                    </p>
                    <p className="mt-1 text-gray-400 text-xs">
                      {notificationError}
                    </p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="bg-white p-6 border rounded-xl text-center">
                    <p className="text-gray-500 text-sm">
                      No notifications yet.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.read) {
                          markReadMutation.mutate(notification.id);
                        }
                      }}
                      className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${
                        !notification.read
                          ? "border-l-4 border-l-emerald-500"
                          : ""
                      }`}
                    >
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.type === "missed_payment"
                            ? "bg-red-100"
                            : notification.type === "payment_received"
                              ? "bg-emerald-100"
                              : "bg-blue-100"
                        }`}
                      >
                        {notification.type === "missed_payment" ? (
                          <AlertTriangle className={`h-5 w-5 text-red-600`} />
                        ) : notification.type === "payment_received" ? (
                          <CheckCircle className={`h-5 w-5 text-emerald-600`} />
                        ) : (
                          <Bell className={`h-5 w-5 text-blue-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-gray-900 ${!notification.read ? "font-medium" : ""}`}
                        >
                          {notification.message}
                        </p>
                        <p className="mt-1 text-gray-500 text-sm">
                          {notification.date}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="bg-emerald-500 rounded-full w-2 h-2" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Liability Summary */}
            <div className="bg-white p-6 border rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Liability Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Total Active Liability</span>
                  <span className="font-bold text-gray-900">
                    ₦{totalLiability.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">At Risk Amount</span>
                  <span className="font-bold text-red-600">
                    ₦{atRiskAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Completed Guarantees</span>
                  <span className="font-bold text-emerald-600">
                    {
                      commitments.filter((c) => c.loanStatus === "completed")
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Guarantor Terms */}
            <div className="bg-amber-50 p-6 border border-amber-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-amber-900">
                <AlertTriangle className="w-5 h-5" />
                Guarantor Terms
              </h3>
              <ul className="space-y-3 text-amber-800 text-sm">
                <li className="flex items-start gap-2">
                  <ChevronRight className="flex-shrink-0 mt-0.5 w-4 h-4" />
                  <span>
                    You are liable for the specified percentage of the loan if
                    the borrower defaults
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="flex-shrink-0 mt-0.5 w-4 h-4" />
                  <span>
                    Your savings may be used to cover defaulted payments
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="flex-shrink-0 mt-0.5 w-4 h-4" />
                  <span>
                    You will be notified of any missed payments via SMS and
                    WhatsApp
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="flex-shrink-0 mt-0.5 w-4 h-4" />
                  <span>
                    Guarantees can only be revoked before loan disbursement
                  </span>
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 border rounded-xl">
              <h3 className="mb-4 font-semibold text-gray-900">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="justify-start gap-3 w-full"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 w-full"
                >
                  <BanknoteIcon className="w-4 h-4" />
                  View My Savings
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 w-full"
                >
                  <Users className="w-4 h-4" />
                  View Group Members
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="font-bold text-gray-900 text-xl">
                Review Guarantor Request
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex justify-center items-center bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full w-16 h-16 font-bold text-white text-2xl">
                  {selectedRequest.borrowerName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedRequest.borrowerName}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {selectedRequest.borrowerEmail}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {selectedRequest.borrowerPhone}
                  </p>
                </div>
              </div>

              <div className="gap-4 grid grid-cols-2">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">Loan Amount</p>
                  <p className="font-bold text-gray-900 text-xl">
                    ₦{selectedRequest.loanAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-emerald-700 text-sm">Your Liability</p>
                  <p className="font-bold text-emerald-700 text-xl">
                    ₦{selectedRequest.liabilityAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Your Response (Optional)
                </label>
                <Textarea
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder="Add a comment to your response..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 bg-gray-50 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleRejectRequest(selectedRequest)}
                variant="destructive"
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Decline"
                )}
              </Button>
              <Button
                onClick={() => handleAcceptRequest(selectedRequest)}
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Accept"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuarantorDashboard() {
  return (
    <AuthProvider>
      <GuarantorDashboardContent />
    </AuthProvider>
  );
}
