import { useState } from 'react';
import { CreditCard, Clock, CheckCircle, XCircle, Eye, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateLoanSummary } from "@/lib/loanMath";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";

interface LoanApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  groupName: string;
  loanType?: string | null;
  loanAmount: number;
  loanPurpose: string;
  repaymentPeriod: number;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  approvedInterestRate?: number | null;
  monthlyIncome: number;
  guarantorName: string;
  guarantorPhone: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
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

export default function LoanReviewPanel({ applications, onApprove, onReject, onStartReview, onDisburse }: LoanReviewPanelProps) {
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [repaymentStartDate, setRepaymentStartDate] = useState('');
  const [approvedRateInput, setApprovedRateInput] = useState('');

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const underReviewCount = applications.filter(a => a.status === 'under_review').length;
  const approvedCount = applications.filter(a => a.status === 'approved' || a.status === 'disbursed').length;
  const totalRequested = applications.filter(a => a.status === 'pending' || a.status === 'under_review')
    .reduce((sum, a) => sum + a.loanAmount, 0);

  const filteredApplications = applications.filter(a => 
    statusFilter === 'all' || a.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'disbursed':
        return <Badge className="bg-purple-100 text-purple-700"><CreditCard className="w-3 h-3 mr-1" />Disbursed</Badge>;
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
  const selectedMonthlyPayment =
    selectedLoan && selectedRateInfo
      ? calculateLoanSummary({
          principal: selectedLoan.loanAmount,
          rate: selectedRateInfo.rate,
          rateType: selectedRateInfo.rateType,
          months: selectedLoan.repaymentPeriod,
        }).monthlyPayment
      : 0;
  const selectedInterestLabel = selectedRateInfo
    ? formatInterestLabel(
        selectedRateInfo.rate,
        selectedRateInfo.rateType,
        selectedRateInfo.facility?.interestRateRange,
      )
    : "";

  const calculateMonthlyPayment = (
    amount: number,
    months: number,
    rate: number,
    rateType: "annual" | "monthly" | "total",
  ) => {
    return calculateLoanSummary({
      principal: amount,
      rate,
      rateType,
      months,
    }).monthlyPayment;
  };

  const handleViewDetails = (loan: LoanApplication) => {
    setSelectedLoan(loan);
    setShowDetailModal(true);
  };

  const handleReview = (loan: LoanApplication, action: 'approve' | 'reject') => {
    setSelectedLoan(loan);
    setReviewAction(action);
    setReviewNotes('');
    const facility = getLoanFacility(loan.loanType || "");
    const defaultRate =
      loan.approvedInterestRate ??
      loan.interestRate ??
      facility?.interestRate ??
      facility?.interestRateRange?.min ??
      0;
    setApprovedRateInput(defaultRate ? String(defaultRate) : '');
    setShowReviewModal(true);
  };

  const handleDisburse = (loan: LoanApplication) => {
    setSelectedLoan(loan);
    setRepaymentStartDate('');
    setShowDisburseModal(true);
  };

  const confirmReview = () => {
    if (selectedLoan && reviewAction) {
      if (reviewAction === 'approve') {
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{underReviewCount}</p>
              <p className="text-sm text-gray-500">Under Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">â‚¦{(totalRequested / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-gray-500">Total Requested</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Loan Applications</h3>
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
            <div key={loan.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{loan.applicantName}</h4>
                    <p className="text-sm text-emerald-600">{loan.groupName}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="font-medium text-gray-900">â‚¦{loan.loanAmount.toLocaleString()}</span>
                      <span>{loan.repaymentPeriod} months</span>
                      <span>{loan.loanPurpose}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>{facilityLabel}</span>
                      <span>{interestLabel}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
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
                  {loan.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200"
                      onClick={() => onStartReview(loan.id)}
                    >
                      Start Review
                    </Button>
                  )}
                  {loan.status === 'under_review' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleReview(loan, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200"
                        onClick={() => handleReview(loan, 'reject')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {loan.status === 'approved' && (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Application Details</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Applicant</p>
                  <p className="font-medium">{selectedLoan.applicantName}</p>
                  <p className="text-sm text-gray-600">{selectedLoan.applicantEmail}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Group</p>
                  <p className="font-medium">{selectedLoan.groupName}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-500">Loan Amount</p>
                  <p className="text-2xl font-bold text-emerald-600">â‚¦{selectedLoan.loanAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Repayment Period</p>
                  <p className="font-medium">{selectedLoan.repaymentPeriod} months</p>
                  <p className="text-sm text-emerald-600">
                    â‚¦{selectedMonthlyPayment.toLocaleString()}/month
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Interest</p>
                  <p className="font-medium">{selectedInterestLabel}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-sm text-gray-500">Purpose</p>
                  <p className="font-medium">{selectedLoan.loanPurpose}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Monthly Income</p>
                  <p className="font-medium">â‚¦{selectedLoan.monthlyIncome.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Debt-to-Income Ratio</p>
                  <p className="font-medium">
                    {((selectedMonthlyPayment / selectedLoan.monthlyIncome) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-sm text-gray-500">Guarantor</p>
                  <p className="font-medium">{selectedLoan.guarantorName}</p>
                  <p className="text-sm text-gray-600">{selectedLoan.guarantorPhone}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Loan Application' : 'Reject Loan Application'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLoan && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedLoan.applicantName}</p>
                <p className="text-lg font-bold text-emerald-600">â‚¦{selectedLoan.loanAmount.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{selectedLoan.loanPurpose}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
              />
            </div>
            {reviewAction === 'approve' && selectedLoan && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
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
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Allowed range: {selectedRateInfo.facility.interestRateRange.min}-{selectedRateInfo.facility.interestRateRange.max}% monthly
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
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
                  reviewAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={confirmReview}
              >
                {reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
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
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedLoan.applicantName}</p>
                <p className="text-lg font-bold text-purple-600">Ã¢â€šÂ¦{selectedLoan.loanAmount.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{selectedLoan.loanPurpose}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Repayment Start Date (optional)
              </label>
              <input
                type="date"
                value={repaymentStartDate}
                onChange={(e) => setRepaymentStartDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500">
                Leave empty to start next month. Guarantors must have accepted 100% liability before disbursement.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDisburseModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={confirmDisburse}>
                Confirm Disbursement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
