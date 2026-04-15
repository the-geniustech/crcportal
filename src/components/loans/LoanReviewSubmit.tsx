import React, { useState } from "react";
import {
  CheckCircle,
  FileText,
  Users,
  Calendar,
  Building2,
  DollarSign,
  Target,
  AlertCircle,
  Edit2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CircleCheck,
} from "lucide-react";
import { formatInterestLabel, getLoanFacility } from "@/lib/loanPolicy";
import LoanTermsModal from "@/components/loans/LoanTermsModal";

interface Guarantor {
  id: string;
  type: "member" | "external";
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  address: string;
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    signedAt?: string | null;
  } | null;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "uploading" | "uploaded" | "error";
}

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isPrimary?: boolean;
}

interface LoanReviewSubmitProps {
  loanAmount: number;
  loanType: string;
  purpose: string;
  purposeDescription: string;
  repaymentTerm: number;
  interestRate: number;
  interestRateType: "annual" | "monthly" | "total";
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  documents: Document[];
  guarantors: Guarantor[];
  bankAccount?: BankAccount | null;
  groupName: string;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  requireBankAccount?: boolean;
}

const purposeLabels: { [key: string]: string } = {
  business: "Business Expansion",
  education: "Education",
  medical: "Medical Emergency",
  home: "Home Improvement",
  vehicle: "Vehicle Purchase",
  equipment: "Equipment/Tools",
  personal: "Personal Needs",
  other: "Other",
};

export default function LoanReviewSubmit({
  loanAmount,
  loanType,
  purpose,
  purposeDescription,
  repaymentTerm,
  interestRate,
  interestRateType,
  monthlyPayment,
  totalInterest,
  totalPayment,
  documents,
  guarantors,
  bankAccount,
  groupName,
  onSubmit,
  onBack,
  onEditStep,
  isSubmitting,
  submitLabel,
  requireBankAccount = true,
}: LoanReviewSubmitProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "summary",
    "documents",
    "guarantors",
    "bank",
  ]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showLoanTerms, setShowLoanTerms] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const isSectionExpanded = (section: string) =>
    expandedSections.includes(section);

  const canSubmit =
    agreedToTerms &&
    (!requireBankAccount || Boolean(bankAccount)) &&
    !isSubmitting;
  const facility = getLoanFacility(loanType);
  const interestLabel = formatInterestLabel(
    interestRate,
    interestRateType,
    facility?.interestRateRange,
  );

  const getMonthName = (monthOffset: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Application Summary Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 rounded-2xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-xl">Review Your Application</h3>
            <p className="text-emerald-100">
              Please review all details before submitting
            </p>
          </div>
        </div>

        <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mt-6">
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-emerald-100 text-sm">Loan Amount</p>
            <p className="font-bold text-2xl">₦{loanAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-emerald-100 text-sm">Monthly Payment</p>
            <p className="font-bold text-2xl">
              ₦{monthlyPayment.toLocaleString()}
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-emerald-100 text-sm">Repayment Term</p>
            <p className="font-bold text-2xl">{repaymentTerm} months</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-emerald-100 text-sm">Interest Rate</p>
            <p className="font-bold text-2xl">{interestLabel}</p>
          </div>
        </div>
      </div>

      {/* Loan Details Section */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("summary")}
          className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-4 w-full transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Loan Details</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(1);
              }}
              className="hover:bg-blue-100 p-2 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </button>
            {isSectionExpanded("summary") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded("summary") && (
          <div className="space-y-4 p-6">
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="mb-1 text-gray-500 text-sm">Loan Purpose</p>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <p className="font-semibold text-gray-900">
                    {purposeLabels[purpose] || purpose}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="mb-1 text-gray-500 text-sm">Borrowing From</p>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-gray-900">{groupName}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="mb-1 text-gray-500 text-sm">Loan Type</p>
                <p className="font-semibold text-gray-900">
                  {facility?.name || loanType}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="mb-2 text-gray-500 text-sm">Purpose Description</p>
              <p className="text-gray-700">{purposeDescription}</p>
            </div>

            <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
              <div className="bg-blue-50 p-4 border border-blue-100 rounded-xl">
                <p className="mb-1 text-blue-600 text-sm">Total Interest</p>
                <p className="font-bold text-blue-900 text-xl">
                  ₦{totalInterest.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-xl">
                <p className="mb-1 text-emerald-600 text-sm">Total Repayment</p>
                <p className="font-bold text-emerald-900 text-xl">
                  ₦{totalPayment.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 border border-purple-100 rounded-xl">
                <p className="mb-1 text-purple-600 text-sm">First Payment</p>
                <p className="font-bold text-purple-900 text-lg">
                  {getMonthName(1)}
                </p>
              </div>
              <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl">
                <p className="mb-1 text-amber-600 text-sm">Final Payment</p>
                <p className="font-bold text-amber-900 text-lg">
                  {getMonthName(repaymentTerm)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("documents")}
          className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-4 w-full transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">
                Uploaded Documents
              </h4>
              <span className="bg-emerald-100 px-2 py-0.5 rounded-full font-medium text-emerald-700 text-xs">
                {documents.filter((d) => d.status === "uploaded").length} files
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(3);
              }}
              className="hover:bg-amber-100 p-2 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-amber-600" />
            </button>
            {isSectionExpanded("documents") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded("documents") && (
          <div className="p-6">
            <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
              {documents
                .filter((d) => d.status === "uploaded")
                .map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl"
                  >
                    <div className="bg-white p-2 border border-gray-200 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {doc.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {(doc.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <CheckCircle className="flex-shrink-0 w-5 h-5 text-emerald-500" />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Guarantors Section */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("guarantors")}
          className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-4 w-full transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">Guarantors</h4>
              <span className="bg-indigo-100 px-2 py-0.5 rounded-full font-medium text-indigo-700 text-xs">
                {guarantors.length} guarantor
                {guarantors.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(4);
              }}
              className="hover:bg-indigo-100 p-2 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-indigo-600" />
            </button>
            {isSectionExpanded("guarantors") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded("guarantors") && (
          <div className="space-y-4 p-6">
            {guarantors.map((guarantor, index) => (
              <div key={guarantor.id} className="bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        guarantor.type === "member"
                          ? "bg-emerald-100"
                          : "bg-amber-100"
                      }`}
                    >
                      <span
                        className={`text-lg font-semibold ${
                          guarantor.type === "member"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {guarantor.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">
                        {guarantor.name}
                      </h5>
                      <p className="text-gray-500 text-sm">
                        {guarantor.type === "member"
                          ? "Group Member"
                          : "External"}{" "}
                        • {guarantor.relationship}
                      </p>
                    </div>
                  </div>
                  <span className="text-gray-500 text-xs">
                    Guarantor {index + 1}
                  </span>
                </div>
                <div className="gap-4 grid grid-cols-2 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">
                      {guarantor.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">
                      {guarantor.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Occupation</p>
                    <p className="font-medium text-gray-900">
                      {guarantor.occupation}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium text-gray-900 truncate">
                      {guarantor.address}
                    </p>
                  </div>
                </div>
                {guarantor.type === "external" && (
                  <div className="mt-3 pt-3 border-gray-200 border-t">
                    <p className="text-gray-500 text-xs">Signature</p>
                    {guarantor.signature ? (
                      guarantor.signature.method === "text" ? (
                        <p
                          className="text-gray-800 text-xl"
                          style={{
                            fontFamily: guarantor.signature.font || "cursive",
                          }}
                        >
                          {guarantor.signature.text}
                        </p>
                      ) : (
                        guarantor.signature.imageUrl && (
                          <img
                            src={guarantor.signature.imageUrl}
                            alt="Guarantor signature"
                            className="w-auto h-14 object-contain"
                          />
                        )
                      )
                    ) : (
                      <p className="text-amber-600 text-xs">
                        Signature pending
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disbursement Account Section */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => toggleSection("bank")}
          className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-4 w-full transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">
                Disbursement Account
              </h4>
              {bankAccount && (
                <span className="bg-emerald-100 px-2 py-0.5 rounded-full font-medium text-emerald-700 text-xs">
                  Selected
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(5);
              }}
              className="hover:bg-emerald-100 p-2 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4 text-emerald-600" />
            </button>
            {isSectionExpanded("bank") ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {isSectionExpanded("bank") && (
          <div className="p-6">
            {bankAccount ? (
              <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-xl">
                <p className="font-semibold text-emerald-900">
                  {bankAccount.bankName}
                </p>
                <p className="text-emerald-700 text-sm">
                  {bankAccount.accountNumber} • {bankAccount.accountName}
                </p>
                {bankAccount.isPrimary && (
                  <span className="inline-block bg-emerald-100 mt-2 px-2 py-0.5 rounded-full font-medium text-emerald-700 text-xs">
                    Primary
                  </span>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl text-amber-700 text-sm">
                No bank account selected. Please add or select a bank account.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <h4 className="mb-4 font-semibold text-gray-900">
          Terms and Conditions
        </h4>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 border-gray-300 rounded focus:ring-emerald-500 w-5 h-5 text-emerald-500"
            />
            <span className="text-gray-600 text-sm">
              I agree to the{" "}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowLoanTerms(true);
                }}
                className="text-emerald-600 hover:underline"
              >
                Loan Terms and Conditions
              </button>
              , including paying contributions between the 27th and 4th, keeping
              repayments current, and meeting repayment deadlines (October for
              general loans, January for bridging loans). I understand that
              missed repayments can result in penalties and may affect my
              standing in the Contributions group.
            </span>
          </label>
        </div>
      </div>

      <LoanTermsModal open={showLoanTerms} onOpenChange={setShowLoanTerms} />

      {/* Important Notice */}
      <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5 w-5 h-5 text-amber-600" />
          <div>
            <h4 className="mb-1 font-medium text-amber-900">
              Before You Submit
            </h4>
            <ul className="space-y-1 text-amber-700 text-sm">
              <li className="flex items-start gap-2">
                <CircleCheck /> Loan approval is subject to availability of
                funds and management discretion
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck /> Your application will be reviewed within 2-3
                business days
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck /> You will receive an email notification once a
                decision is made
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck /> Your guarantors will be contacted for
                verification
              </li>
              <li className="flex items-start gap-2">
                <CircleCheck /> If approved, funds will be disbursed within 24
                hours
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold text-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
            canSubmit
              ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
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
              {submitLabel ?? "Submit Application"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

