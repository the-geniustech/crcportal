import React, { useState } from 'react';
import { 
  CheckCircle, 
  FileText, 
  Users, 
  Calendar, 
  DollarSign, 
  Target, 
  AlertCircle,
  Edit2,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

interface Guarantor {
  id: string;
  type: 'member' | 'external';
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  address: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'uploaded' | 'error';
}

interface LoanReviewSubmitProps {
  loanAmount: number;
  purpose: string;
  purposeDescription: string;
  repaymentTerm: number;
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  documents: Document[];
  guarantors: Guarantor[];
  groupName: string;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
  isSubmitting: boolean;
}

const purposeLabels: { [key: string]: string } = {
  business: 'Business Expansion',
  education: 'Education',
  medical: 'Medical Emergency',
  home: 'Home Improvement',
  vehicle: 'Vehicle Purchase',
  equipment: 'Equipment/Tools',
  personal: 'Personal Needs',
  other: 'Other'
};

export default function LoanReviewSubmit({
  loanAmount,
  purpose,
  purposeDescription,
  repaymentTerm,
  interestRate,
  monthlyPayment,
  totalInterest,
  totalPayment,
  documents,
  guarantors,
  groupName,
  onSubmit,
  onBack,
  onEditStep,
  isSubmitting
}: LoanReviewSubmitProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'documents', 'guarantors']);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDeductions, setAgreedToDeductions] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isSectionExpanded = (section: string) => expandedSections.includes(section);

  const canSubmit = agreedToTerms && agreedToDeductions && !isSubmitting;

  const getMonthName = (monthOffset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Application Summary Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Review Your Application</h3>
            <p className="text-emerald-100">Please review all details before submitting</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Loan Amount</p>
            <p className="text-2xl font-bold">₦{loanAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Monthly Payment</p>
            <p className="text-2xl font-bold">₦{monthlyPayment.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Repayment Term</p>
            <p className="text-2xl font-bold">{repaymentTerm} months</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-emerald-100 text-sm">Interest Rate</p>
            <p className="text-2xl font-bold">{interestRate}%</p>
          </div>
        </div>
      </div>

      {/* Loan Details Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Loan Details</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEditStep(1); }}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
            {isSectionExpanded('summary') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded('summary') && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Loan Purpose</p>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <p className="font-semibold text-gray-900">{purposeLabels[purpose] || purpose}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Borrowing From</p>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-gray-900">{groupName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">Purpose Description</p>
              <p className="text-gray-700">{purposeDescription}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-600 mb-1">Total Interest</p>
                <p className="text-xl font-bold text-blue-900">₦{totalInterest.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm text-emerald-600 mb-1">Total Repayment</p>
                <p className="text-xl font-bold text-emerald-900">₦{totalPayment.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-sm text-purple-600 mb-1">First Payment</p>
                <p className="text-lg font-bold text-purple-900">{getMonthName(1)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-600 mb-1">Final Payment</p>
                <p className="text-lg font-bold text-amber-900">{getMonthName(repaymentTerm)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('documents')}
          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">Uploaded Documents</h4>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                {documents.filter(d => d.status === 'uploaded').length} files
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEditStep(3); }}
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-amber-600" />
            </button>
            {isSectionExpanded('documents') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded('documents') && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.filter(d => d.status === 'uploaded').map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Guarantors Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('guarantors')}
          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">Guarantors</h4>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                {guarantors.length} guarantor{guarantors.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEditStep(4); }}
              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-indigo-600" />
            </button>
            {isSectionExpanded('guarantors') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded('guarantors') && (
          <div className="p-6 space-y-4">
            {guarantors.map((guarantor, index) => (
              <div key={guarantor.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      guarantor.type === 'member' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      <span className={`text-lg font-semibold ${
                        guarantor.type === 'member' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {guarantor.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">{guarantor.name}</h5>
                      <p className="text-sm text-gray-500">
                        {guarantor.type === 'member' ? 'Group Member' : 'External'} • {guarantor.relationship}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">Guarantor {index + 1}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{guarantor.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{guarantor.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Occupation</p>
                    <p className="font-medium text-gray-900">{guarantor.occupation}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium text-gray-900 truncate">{guarantor.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Terms and Conditions</h4>
        
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">
              I agree to the <a href="#" className="text-emerald-600 hover:underline">Loan Terms and Conditions</a>. 
              I understand that failure to repay the loan will result in penalties and may affect my credit score 
              and standing in the cooperative group.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToDeductions}
              onChange={(e) => setAgreedToDeductions(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">
              I authorize the cooperative to deduct monthly repayments of ₦{monthlyPayment.toLocaleString()} 
              from my savings account or any other payment method I have registered. I also authorize my 
              guarantors to be contacted for verification.
            </span>
          </label>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">Before You Submit</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Your application will be reviewed within 2-3 business days</li>
              <li>• You will receive an email notification once a decision is made</li>
              <li>• Your guarantors will be contacted for verification</li>
              <li>• If approved, funds will be disbursed within 24 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            canSubmit
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Submit Application
            </>
          )}
        </button>
      </div>
    </div>
  );
}
