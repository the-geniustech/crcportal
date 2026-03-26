import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LoanEligibilityCheck from "@/components/loans/LoanEligibilityCheck";
import LoanAmountSelector from "@/components/loans/LoanAmountSelector";
import LoanRepaymentTerms from "@/components/loans/LoanRepaymentTerms";
import LoanDocumentUpload from "@/components/loans/LoanDocumentUpload";
import LoanGuarantorInfo from "@/components/loans/LoanGuarantorInfo";
import LoanReviewSubmit from "@/components/loans/LoanReviewSubmit";
import { useLoanEligibilityQuery } from "@/hooks/loans/useLoanEligibilityQuery";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useGroupMembersQuery } from "@/hooks/groups/useGroupMembersQuery";
import { useCreateLoanApplicationMutation } from "@/hooks/loans/useCreateLoanApplicationMutation";
import { calculateLoanSummary } from "@/lib/loanMath";
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

interface Document {
  id: string;
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
    name: "Review & Submit",
    shortName: "Submit",
    description: "Review and submit application",
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

  // Get pre-filled data from calculator
  const prefilledData = location.state as {
    amount?: number;
    term?: number;
    loanType?: LoanFacilityKey;
  } | null;

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loanType, setLoanType] = useState<LoanFacilityKey>(
    prefilledData?.loanType || "revolving",
  );
  const [loanAmount, setLoanAmount] = useState(prefilledData?.amount || 100000);
  const [purpose, setPurpose] = useState("");
  const [purposeDescription, setPurposeDescription] = useState("");
  const [repaymentTerm, setRepaymentTerm] = useState(prefilledData?.term || 12);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrefilledNotice, setShowPrefilledNotice] =
    useState(!!prefilledData);

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
  const totalContributions = Number(eligibilityQuery.data?.totalContributions ?? 0);
  const baseMaxLoanAmount = selectedGroupData?.maxLoanAmount || 500000;
  const maxLoanAmount =
    loanType === "revolving" && totalContributions > 0
      ? totalContributions
      : baseMaxLoanAmount;
  const minLoanAmount = 50000;
  const loanFacility = getLoanFacility(loanType);
  const interestRateType =
    loanFacility?.interestRateType || "annual";
  const interestRate =
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
    const unique = new Set(baseOptions);
    unique.add(12);
    return Array.from(unique).sort((a, b) => a - b);
  })();

  const groupMembersQuery = useGroupMembersQuery(selectedGroup || undefined);
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

  // Check if coming from calculator with pre-filled data
  useEffect(() => {
    if (prefilledData?.amount || prefilledData?.term) {
      toast({
        title: "Calculator Data Applied",
        description: `Loan amount: ₦${(prefilledData.amount || 100000).toLocaleString()}, Term: ${prefilledData.term || 12} months`,
      });
    }
  }, []);

  useEffect(() => {
    if (termOptions.length === 0) return;
    if (!termOptions.includes(repaymentTerm)) {
      setRepaymentTerm(termOptions[0]);
    }
  }, [loanType, termOptions.join(","), repaymentTerm]);

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
    if (step >= 0 && step <= 5) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const requiredGuarantors = loanAmount >= 500000 ? 2 : 1;
      const selectedGuarantors = guarantors.slice(0, requiredGuarantors);
      const perPct = Math.floor(100 / Math.max(1, selectedGuarantors.length));

      const backendGuarantors: BackendGuarantor[] = selectedGuarantors.map(
        (g, idx) => ({
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
            idx === selectedGuarantors.length - 1
              ? 100 - perPct * (selectedGuarantors.length - 1)
              : perPct,
          requestMessage: null,
        }),
      );

      await createLoanApplicationMutation.mutateAsync({
        groupId: selectedGroup || null,
        groupName: selectedGroupData?.name || null,
        loanType,
        loanAmount,
        loanPurpose: purpose,
        purposeDescription,
        repaymentPeriod: repaymentTerm,
        interestRate,
        interestRateType,
        documents: documents.map((d) => ({
          name: d.name,
          type: d.type,
          size: d.size,
          status: d.status,
          url: d.url,
        })),
        guarantors: backendGuarantors,
      });

      toast({
        title: "Application Submitted!",
        description:
          "Your loan application has been submitted successfully. Guarantor requests have been sent.",
      });

      navigate("/loans");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || eligibilityQuery.isLoading || myGroupsQuery.isLoading) {
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
          <h1 className="font-bold text-gray-900 text-3xl">Apply for a Loan</h1>
          <p className="mt-2 text-gray-600">
            Complete the application form below to request a loan from your
            cooperative group
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
                  {prefilledData.term || 12} months
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">
              Application Progress
            </h2>
            <span className="text-gray-500 text-sm">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 mb-6 rounded-full h-2">
            <div
              className="bg-emerald-500 rounded-full h-2 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
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
                {index < steps.length - 1 && (
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
                {steps[currentStep].description}
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 0 && (
            <LoanEligibilityCheck
              eligibilityData={
                eligibilityQuery.data ?? {
                  savingsBalance: 0,
                  totalContributions: 0,
                  membershipDuration: 0,
                  groupsJoined: 0,
                  attendanceRate: 0,
                  contributionStreak: 0,
                  previousLoans: 0,
                  defaultedLoans: 0,
                  overdueContributions: 0,
                  overdueRepayments: 0,
                  contributionWindow: { startDay: 27, endDay: 4, isOpen: false },
                  creditScore: 0,
                }
              }
              selectedGroup={selectedGroup}
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
              loanAmount={loanAmount}
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
              groupName={selectedGroupData?.name || ""}
              onSubmit={handleSubmit}
              onBack={() => goToStep(4)}
              onEditStep={goToStep}
              isSubmitting={isSubmitting}
            />
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
              <p className="mb-4 text-blue-100 text-sm">
                If you have questions about the loan application process, our
                support team is here to help.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/loans")}
                  className="bg-white hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-blue-600 text-sm transition-colors"
                >
                  Use Loan Calculator
                </button>
                <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors">
                  View FAQ
                </button>
              </div>
            </div>
          </div>
        </div>
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
