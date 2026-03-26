import React, { useState } from 'react';
import { X, Check, AlertCircle, Calendar, DollarSign, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContributionTypeOptions,
  normalizeContributionType,
  validateContributionAmount,
} from '@/lib/contributionPolicy';

interface ContributionRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContributionData) => void;
  groupId: string;
  groupName: string;
  memberName?: string;
  memberId?: string;
  existingContribution?: {
    id: string;
    amount: number;
    month: number;
    year: number;
    contribution_type: string;
    status: string;
    payment_reference?: string;
    notes?: string;
  };
}

interface ContributionData {
  memberId: string;
  memberName: string;
  groupId: string;
  amount: number;
  month: number;
  year: number;
  contributionType: string;
  paymentReference: string;
  paymentMethod: string;
  notes: string;
  status: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card Payment' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'paystack', label: 'Paystack' },
];

const ContributionRecordModal: React.FC<ContributionRecordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupId,
  groupName,
  memberName = '',
  memberId = '',
  existingContribution,
}) => {
  const currentDate = new Date();
  const [formData, setFormData] = useState({
    memberName: memberName,
    memberId: memberId,
    amount: existingContribution?.amount?.toString() || '10000',
    month: existingContribution?.month?.toString() || (currentDate.getMonth() + 1).toString(),
    year: existingContribution?.year?.toString() || currentDate.getFullYear().toString(),
    contributionType: normalizeContributionType(existingContribution?.contribution_type) || 'revolving',
    paymentReference: existingContribution?.payment_reference || '',
    paymentMethod: 'bank_transfer',
    notes: existingContribution?.notes || '',
    status: existingContribution?.status || 'completed',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.memberName.trim()) {
      newErrors.memberName = 'Member name is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.month) {
      newErrors.month = 'Month is required';
    }
    if (!formData.year) {
      newErrors.year = 'Year is required';
    }
    if (formData.amount) {
      const validation = validateContributionAmount(
        formData.contributionType as 'revolving' | 'special' | 'endwell' | 'festive',
        parseFloat(formData.amount),
      );
      if (!validation.valid) {
        newErrors.amount = validation.message || 'Invalid amount for this contribution type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit({
      memberId: formData.memberId,
      memberName: formData.memberName,
      groupId,
      amount: parseFloat(formData.amount),
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      contributionType: formData.contributionType,
      paymentReference: formData.paymentReference,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      status: formData.status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {existingContribution ? 'Edit Contribution' : 'Record Contribution'}
            </h2>
            <p className="text-sm text-gray-500">{groupName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Member Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Member Name
            </label>
            <Input
              value={formData.memberName}
              onChange={(e) => setFormData(prev => ({ ...prev, memberName: e.target.value }))}
              placeholder="Enter member name"
              className={errors.memberName ? 'border-red-500' : ''}
            />
            {errors.memberName && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.memberName}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Amount (₦)
            </label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Month and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Month
              </label>
              <Select
                value={formData.month}
                onValueChange={(value) => setFormData(prev => ({ ...prev, month: value }))}
              >
                <SelectTrigger className={errors.month ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <Select
                value={formData.year}
                onValueChange={(value) => setFormData(prev => ({ ...prev, year: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contribution Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contribution Type
            </label>
            <Select
              value={formData.contributionType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, contributionType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ContributionTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Payment Reference (Optional)
            </label>
            <Input
              value={formData.paymentReference}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
              placeholder="e.g., Transaction ID, Receipt number"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {['pending', 'completed', 'verified'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status }))}
                  className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                    formData.status === status
                      ? status === 'verified'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : status === 'completed'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-gray-100 border-gray-500 text-gray-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {existingContribution ? 'Update' : 'Record'} Contribution
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributionRecordModal;
