import { useState } from 'react';
import { Check, X, Eye, Clock, User, Mail, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  groupName: string;
  applicationDate: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

interface MemberApprovalPanelProps {
  applicants: Applicant[];
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
}

export default function MemberApprovalPanel({ applicants, onApprove, onReject }: MemberApprovalPanelProps) {
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  const pendingApplicants = applicants.filter(a => a.status === 'pending');

  const handleReview = (applicant: Applicant, action: 'approve' | 'reject') => {
    setSelectedApplicant(applicant);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const confirmReview = () => {
    if (selectedApplicant && reviewAction) {
      if (reviewAction === 'approve') {
        onApprove(selectedApplicant.id, reviewNotes);
      } else {
        onReject(selectedApplicant.id, reviewNotes);
      }
      setShowReviewModal(false);
      setSelectedApplicant(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Member Approvals</h3>
            <p className="text-sm text-gray-500">{pendingApplicants.length} pending applications</p>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            {pendingApplicants.length} Pending
          </Badge>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {pendingApplicants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Check className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p>All applications have been reviewed</p>
          </div>
        ) : (
          pendingApplicants.map((applicant) => (
            <div key={applicant.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{applicant.name}</h4>
                    <p className="text-sm text-emerald-600">{applicant.groupName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {applicant.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {applicant.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      Applied: {new Date(applicant.applicationDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => handleReview(applicant, 'approve')}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReview(applicant, 'reject')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Confirmation Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedApplicant && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedApplicant.name}</p>
                <p className="text-sm text-gray-600">{selectedApplicant.email}</p>
                <p className="text-sm text-emerald-600">{selectedApplicant.groupName}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Notes (Optional)
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                rows={3}
              />
            </div>
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
    </div>
  );
}
