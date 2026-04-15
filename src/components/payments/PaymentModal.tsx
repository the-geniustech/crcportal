import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import { useInitializePaystackPaymentMutation } from "@/hooks/payments/useInitializePaystackPaymentMutation";
import { useInitializePaystackBulkPaymentMutation } from "@/hooks/payments/useInitializePaystackBulkPaymentMutation";
import {
  ContributionTypeOptions,
  getContributionTypeConfig,
  getContributionTypeLabel,
  normalizeContributionType,
  validateContributionAmount,
} from "@/lib/contributionPolicy";
import {
  CreditCard,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { BulkPaymentItem } from "@/lib/payments";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transaction: unknown) => void;
  preselectedType?: "loan_repayment" | "group_contribution";
  preselectedAmount?: number;
  preselectedGroup?: { id: string; name: string };
  preselectedLoan?: { id: string; name: string };
  bulkItems?: BulkPaymentItem[];
}

const paymentTypes = [
  {
    value: "loan_repayment",
    label: "Loan Repayment",
    icon: CreditCard,
    description: "Pay your loan installment",
  },
  {
    value: "group_contribution",
    label: "Group Contribution",
    icon: Users,
    description: "Contribute to your Contributions group",
  },
];

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedType,
  preselectedAmount,
  preselectedGroup,
  preselectedLoan,
  bulkItems,
}: PaymentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">(
    "form",
  );
  const [paymentType, setPaymentType] = useState<
    "loan_repayment" | "group_contribution" | ""
  >(preselectedType || "");
  const [amount, setAmount] = useState(preselectedAmount?.toString() || "");
  const [amountTouched, setAmountTouched] = useState(
    Boolean(preselectedAmount),
  );
  const [selectedGroup, setSelectedGroup] = useState(
    preselectedGroup?.id || "",
  );
  const [selectedLoan, setSelectedLoan] = useState(preselectedLoan?.id || "");
  const [contributionType, setContributionType] = useState("revolving");
  const [contributionMonth, setContributionMonth] = useState(
    new Date().getMonth() + 1,
  );
  const [contributionYear, setContributionYear] = useState(
    new Date().getFullYear(),
  );
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("member@crc.org");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const formatCurrency = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(safe);
  };

  const groupMembershipsQuery = useMyGroupMembershipsQuery();
  const loanApplicationsQuery = useMyLoanApplicationsQuery();

  const initializePaystackMutation = useInitializePaystackPaymentMutation();
  const initializePaystackBulkMutation =
    useInitializePaystackBulkPaymentMutation();

  const isBulk = Boolean(bulkItems && bulkItems.length > 0);
  const bulkCount = bulkItems?.length ?? 0;
  const bulkTotal = useMemo(
    () =>
      (bulkItems ?? []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
    [bulkItems],
  );

  useEffect(() => {
    if (!isBulk) return;
    const bulkType = bulkItems?.[0]?.type;
    if (bulkType) {
      setPaymentType(bulkType);
    }
    if (bulkTotal > 0) {
      setAmount(bulkTotal.toString());
    }

    if (bulkType === "group_contribution") {
      const firstType = normalizeContributionType(
        bulkItems?.[0]?.contributionType,
      );
      if (firstType) setContributionType(firstType);
    }
  }, [isBulk, bulkItems, bulkTotal]);

  const groups = useMemo(() => {
    const memberships = groupMembershipsQuery.data ?? [];
    return memberships
      .map((m) => {
        const g: unknown =
          typeof m.groupId === "string" ? null : (m.groupId as unknown);
        const id =
          typeof m.groupId === "string"
            ? m.groupId
            : (g as { _id?: string })?._id;
        const name = (g as { groupName?: string })?.groupName ?? null;
        const monthlyRaw =
          (g as { monthlyContribution?: unknown })?.monthlyContribution ?? null;
        const monthlyContribution = Number.isFinite(Number(monthlyRaw))
          ? Number(monthlyRaw)
          : null;
        const expectedRaw = (m as { expectedMonthlyContribution?: unknown })
          .expectedMonthlyContribution;
        const expectedMonthlyContribution = Number.isFinite(Number(expectedRaw))
          ? Number(expectedRaw)
          : null;
        if (!id || !name) return null;
        return {
          id: String(id),
          name: String(name),
          monthlyContribution:
            typeof monthlyContribution === "number"
              ? monthlyContribution
              : null,
          expectedMonthlyContribution:
            typeof expectedMonthlyContribution === "number"
              ? expectedMonthlyContribution
              : null,
        };
      })
      .filter(Boolean) as {
      id: string;
      name: string;
      monthlyContribution: number | null;
      expectedMonthlyContribution: number | null;
    }[];
  }, [groupMembershipsQuery.data]);

  const selectedGroupInfo = useMemo(
    () => groups.find((group) => group.id === selectedGroup) ?? null,
    [groups, selectedGroup],
  );

  const expectedMonthlyAmount = useMemo(() => {
    if (!selectedGroupInfo) return null;
    const config = getContributionTypeConfig("revolving");
    const minAmount = Number(config?.minAmount ?? 0);
    const baseMonthly = Math.max(
      minAmount,
      Number(selectedGroupInfo.monthlyContribution ?? 0),
    );
    const raw = selectedGroupInfo.expectedMonthlyContribution ?? baseMonthly;
    const value = Number(raw ?? 0);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [selectedGroupInfo]);

  useEffect(() => {
    if (isBulk) return;
    if (paymentType !== "group_contribution") return;
    if (!selectedGroupInfo || !expectedMonthlyAmount) return;
    if (amountTouched) return;
    setAmount(expectedMonthlyAmount.toString());
  }, [
    isBulk,
    paymentType,
    selectedGroupInfo,
    expectedMonthlyAmount,
    amountTouched,
  ]);

  const quickAmounts = useMemo(() => {
    if (paymentType === "group_contribution") {
      const config = getContributionTypeConfig(contributionType);
      const step = config?.stepAmount ?? config?.unitAmount ?? 1000;
      const base = Math.max(step, config?.minAmount ?? step);
      const baseList = [
        base,
        base * 2,
        base * 3,
        base * 5,
        base * 10,
        base * 20,
      ];
      const recommended =
        contributionType === "revolving" ? expectedMonthlyAmount : null;
      const merged = recommended ? [recommended, ...baseList] : baseList;
      const seen = new Set<number>();
      return merged.filter((value) => {
        const num = Math.round(Number(value));
        if (!Number.isFinite(num) || num <= 0) return false;
        if (seen.has(num)) return false;
        seen.add(num);
        return true;
      });
    }
    return [1000, 5000, 10000, 25000, 50000, 100000];
  }, [paymentType, contributionType, expectedMonthlyAmount]);

  const loans = useMemo(() => {
    const apps = loanApplicationsQuery.data ?? [];
    return apps
      .filter((a) => ["disbursed", "defaulted"].includes(String(a.status)))
      .map((a) => {
        const amountLabel = Number(a.approvedAmount ?? a.loanAmount ?? 0);
        const code = String(a.loanCode ?? a._id);
        return {
          id: a._id,
          name: `${code} - NGN ${amountLabel.toLocaleString()}`,
          monthlyPayment: Number(a.monthlyPayment ?? 0),
        };
      });
  }, [loanApplicationsQuery.data]);

  const handleInitializePayment = async () => {
    if (isBulk) {
      if (!email) {
        toast({
          title: "Validation Error",
          description: "Please enter your email address",
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);
      setStep("processing");

      try {
        const init = await initializePaystackBulkMutation.mutateAsync({
          items: bulkItems ?? [],
          email,
          description: description || `Bulk payment for ${bulkCount} item(s)`,
          callbackUrl: `${window.location.origin}/payments`,
        });

        if (!init?.authorizationUrl) {
          throw new Error("Failed to initialize Paystack payment");
        }

        setTransactionRef(init.reference);
        window.location.href = init.authorizationUrl;
      } catch (error: unknown) {
        console.error("Bulk payment initialization error:", error);
        setErrorMessage(
          (error as Error).message || "Failed to process payment",
        );
        setStep("error");
        setIsLoading(false);
      }
      return;
    }

    if (!paymentType || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (paymentType === "group_contribution" && !selectedGroup) {
      toast({
        title: "Validation Error",
        description: "Please select a group",
        variant: "destructive",
      });
      return;
    }

    if (paymentType === "loan_repayment" && !selectedLoan) {
      toast({
        title: "Validation Error",
        description: "Please select a loan",
        variant: "destructive",
      });
      return;
    }

    if (paymentType === "group_contribution") {
      const validation = validateContributionAmount(
        contributionType as "revolving" | "special" | "endwell" | "festive",
        parseFloat(amount),
      );
      if (!validation.valid) {
        toast({
          title: "Invalid Amount",
          description: validation.message || "Please enter a valid amount.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    setStep("processing");

    try {
      const paymentTypeLabel =
        paymentTypes.find((t) => t.value === paymentType)?.label || paymentType;

      const parsedAmount = parseFloat(amount);

      const init = await initializePaystackMutation.mutateAsync({
        amount: parsedAmount,
        email,
        paymentType: paymentType as "loan_repayment" | "group_contribution",
        groupId: paymentType === "group_contribution" ? selectedGroup : null,
        loanApplicationId:
          paymentType === "loan_repayment" ? selectedLoan : null,
        contributionType:
          paymentType === "group_contribution" ? contributionType : null,
        month: paymentType === "group_contribution" ? contributionMonth : null,
        year: paymentType === "group_contribution" ? contributionYear : null,
        description: description || paymentTypeLabel,
        callbackUrl: `${window.location.origin}/payments`,
      });

      if (!init?.authorizationUrl) {
        throw new Error("Failed to initialize Paystack payment");
      }

      setTransactionRef(init.reference);

      // Redirect to Paystack hosted checkout
      window.location.href = init.authorizationUrl;
    } catch (error: unknown) {
      console.error("Payment initialization error:", error);
      setErrorMessage((error as Error).message || "Failed to process payment");
      setStep("error");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setPaymentType(preselectedType || "");
    setAmount(preselectedAmount?.toString() || "");
    setAmountTouched(Boolean(preselectedAmount));
    setSelectedGroup(preselectedGroup?.id || "");
    setSelectedLoan(preselectedLoan?.id || "");
    setContributionType("revolving");
    setContributionMonth(new Date().getMonth() + 1);
    setContributionYear(new Date().getFullYear());
    setDescription("");
    setErrorMessage("");
    onClose();
  };

  const selectedPaymentType = paymentTypes.find((t) => t.value === paymentType);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Make a Payment
          </DialogTitle>
          <DialogDescription>
            Process secure payments via Paystack
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6 py-4">
            {/* Payment Type Selection */}
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <div className="gap-3 grid grid-cols-1">
                {paymentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() =>
                        !isBulk &&
                        setPaymentType(
                          type.value as
                            | ""
                            | "loan_repayment"
                            | "group_contribution",
                        )
                      }
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                        paymentType === type.value
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                      disabled={isBulk}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          paymentType === type.value
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {type.label}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group Selection for Group Contribution */}
            {paymentType === "group_contribution" && (
              <>
                <div className="space-y-2">
                  <Label>Select Group</Label>
                  <Select
                    value={selectedGroup}
                    onValueChange={setSelectedGroup}
                    disabled={isBulk}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contribution Type</Label>
                  <Select
                    value={contributionType}
                    onValueChange={setContributionType}
                    disabled={isBulk}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contribution type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ContributionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getContributionTypeConfig(contributionType)?.description && (
                    <p className="text-gray-500 text-xs">
                      {getContributionTypeConfig(contributionType)?.description}
                    </p>
                  )}
                  {contributionType === "revolving" &&
                    expectedMonthlyAmount &&
                    selectedGroupInfo && (
                      <p className="text-emerald-600 text-xs">
                        Expected monthly for {selectedGroupInfo.name}:{" "}
                        {formatCurrency(expectedMonthlyAmount)}
                      </p>
                    )}
                </div>
                <div className="space-y-2">
                  <Label>Contribution Month</Label>
                  <div className="gap-3 grid grid-cols-2">
                    <Select
                      value={String(contributionMonth)}
                      onValueChange={(value) =>
                        setContributionMonth(Number(value))
                      }
                      disabled={isBulk}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "January",
                          "February",
                          "March",
                          "April",
                          "May",
                          "June",
                          "July",
                          "August",
                          "September",
                          "October",
                          "November",
                          "December",
                        ].map((label, idx) => (
                          <SelectItem key={label} value={String(idx + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(contributionYear)}
                      onValueChange={(value) =>
                        setContributionYear(Number(value))
                      }
                      disabled={isBulk}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const year = new Date().getFullYear() - 2 + idx;
                          return (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Loan Selection for Loan Repayment */}
            {paymentType === "loan_repayment" && (
              <div className="space-y-2">
                <Label>Select Loan</Label>
                <Select
                  value={selectedLoan}
                  onValueChange={(value) => {
                    setSelectedLoan(value);
                    const loan = loans.find((l) => l.id === value);
                    if (loan) {
                      setAmount(loan.monthlyPayment.toString());
                      setAmountTouched(true);
                    }
                  }}
                  disabled={isBulk}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {loans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        {loan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount (NGN)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountTouched(true);
                }}
                min="100"
                className="font-semibold text-lg"
                disabled={isBulk}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAmount(quickAmount.toString());
                      setAmountTouched(true);
                    }}
                    className={
                      amount === quickAmount.toString()
                        ? "border-emerald-500 bg-emerald-50"
                        : ""
                    }
                    disabled={isBulk}
                  >
                    NGN {quickAmount.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Add a note for this payment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Summary */}
            {paymentType && amount && (
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">Payment Summary</h4>
                {isBulk && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Bulk items:</span>
                    <span className="font-medium">{bulkCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">
                    {selectedPaymentType?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-emerald-600">
                    NGN {parseFloat(amount || "0").toLocaleString()}
                  </span>
                </div>
                {paymentType === "group_contribution" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Contribution Type:</span>
                    <span className="font-medium">
                      {getContributionTypeLabel(contributionType)}
                    </span>
                  </div>
                )}
                {paymentType === "group_contribution" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Contribution Month:</span>
                    <span className="font-medium">
                      {new Date(
                        contributionYear,
                        contributionMonth - 1,
                        1,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {selectedGroup && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Group:</span>
                    <span className="font-medium">
                      {groups.find((g) => g.id === selectedGroup)?.name}
                    </span>
                  </div>
                )}
                {selectedLoan && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Loan:</span>
                    <span className="font-medium">
                      {loans.find((l) => l.id === selectedLoan)?.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInitializePayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!paymentType || !amount || parseFloat(amount) <= 0}
              >
                Pay NGN {parseFloat(amount || "0").toLocaleString()}
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 py-12 text-center">
            <Loader2 className="mx-auto w-12 h-12 text-emerald-600 animate-spin" />
            <h3 className="font-semibold text-lg">Processing Payment</h3>
            <p className="text-gray-600">Redirecting to Paystack...</p>
            <p className="text-gray-500 text-sm">Reference: {transactionRef}</p>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 py-12 text-center">
            <div className="flex justify-center items-center bg-emerald-100 mx-auto rounded-full w-16 h-16">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-emerald-600 text-lg">
              Payment Successful!
            </h3>
            <p className="text-gray-600">
              Your payment has been processed successfully.
            </p>
            <p className="text-gray-500 text-sm">Reference: {transactionRef}</p>
            <Button
              onClick={handleClose}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Close
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4 py-12 text-center">
            <div className="flex justify-center items-center bg-red-100 mx-auto rounded-full w-16 h-16">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="font-semibold text-red-600 text-lg">
              Payment Failed
            </h3>
            <p className="text-gray-600">{errorMessage}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("form")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
