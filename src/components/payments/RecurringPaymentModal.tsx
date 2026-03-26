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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useMyLoanApplicationsQuery } from "@/hooks/loans/useMyLoanApplicationsQuery";
import {
  useCreateRecurringPaymentMutation,
  useUpdateRecurringPaymentMutation,
} from "@/hooks/finance/useRecurringPaymentsMutations";
import {
  ContributionTypeOptions,
  getContributionTypeConfig,
  normalizeContributionType,
  validateContributionAmount,
} from "@/lib/contributionPolicy";
import { format, addWeeks, addMonths } from "date-fns";
import {
  CalendarIcon,
  Repeat,
  CreditCard,
  Users,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringPayment {
  id?: string;
  payment_type: "deposit" | "loan_repayment" | "group_contribution";
  amount: number;
  frequency: "weekly" | "bi-weekly" | "monthly";
  start_date: string;
  end_date?: string;
  contribution_type?: string;
  group_id?: string;
  group_name?: string;
  loan_id?: string;
  loan_name?: string;
  description?: string;
  is_active?: boolean;
}

interface RecurringPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editPayment?: RecurringPayment | null;
}

const paymentTypes = [
  {
    value: "loan_repayment",
    label: "Loan Repayment",
    icon: CreditCard,
    color: "blue",
  },
  {
    value: "group_contribution",
    label: "Group Contribution",
    icon: Users,
    color: "purple",
  },
];

const frequencies = [
  { value: "weekly", label: "Weekly", description: "Every week" },
  { value: "bi-weekly", label: "Bi-Weekly", description: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", description: "Once a month" },
];

export default function RecurringPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  editPayment,
}: RecurringPaymentModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<string>(
    editPayment?.payment_type || "",
  );
  const [amount, setAmount] = useState(editPayment?.amount?.toString() || "");
  const [frequency, setFrequency] = useState<string>(
    editPayment?.frequency || "monthly",
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    editPayment?.start_date ? new Date(editPayment.start_date) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    editPayment?.end_date ? new Date(editPayment.end_date) : undefined,
  );
  const [selectedGroup, setSelectedGroup] = useState(
    editPayment?.group_id || "",
  );
  const [selectedLoan, setSelectedLoan] = useState(editPayment?.loan_id || "");
  const [contributionType, setContributionType] = useState("revolving");
  const [description, setDescription] = useState(
    editPayment?.description || "",
  );
  const [hasEndDate, setHasEndDate] = useState(!!editPayment?.end_date);

  const quickAmounts = [5000, 10000, 25000, 50000];

  const groupMembershipsQuery = useMyGroupMembershipsQuery();
  const loanApplicationsQuery = useMyLoanApplicationsQuery();
  const createRecurringPaymentMutation = useCreateRecurringPaymentMutation();
  const updateRecurringPaymentMutation = useUpdateRecurringPaymentMutation();

  const groups = useMemo(() => {
    const memberships = groupMembershipsQuery.data ?? [];
    return memberships
      .map((m) => {
        const g: unknown =
          typeof m.groupId === "string" ? null : (m.groupId as unknown);
        const id = typeof m.groupId === "string" ? m.groupId : g?._id;
        const name = g?.groupName ?? null;
        if (!id || !name) return null;
        return { id: String(id), name: String(name) };
      })
      .filter(Boolean) as { id: string; name: string }[];
  }, [groupMembershipsQuery.data]);

  const loans = useMemo(() => {
    const apps = loanApplicationsQuery.data ?? [];
    return apps
      .filter((a) => ["disbursed", "defaulted"].includes(String(a.status)))
      .map((a) => {
        const amountLabel = Number(a.approvedAmount ?? a.loanAmount ?? 0);
        const code = String(a.loanCode ?? a._id);
        return {
          id: a._id,
          name: `${code} - ₦${amountLabel.toLocaleString()}`,
          monthlyPayment: Number(a.monthlyPayment ?? 0),
        };
      });
  }, [loanApplicationsQuery.data]);

  useEffect(() => {
    if (editPayment) {
      setPaymentType(editPayment.payment_type);
      setAmount(editPayment.amount.toString());
      setFrequency(editPayment.frequency);
      setStartDate(new Date(editPayment.start_date));
      setEndDate(
        editPayment.end_date ? new Date(editPayment.end_date) : undefined,
      );
      setSelectedGroup(editPayment.group_id || "");
      setSelectedLoan(editPayment.loan_id || "");
      setDescription(editPayment.description || "");
      setHasEndDate(!!editPayment.end_date);
      const canonicalType = normalizeContributionType(
        editPayment.contribution_type,
      );
      setContributionType(canonicalType || "revolving");
    }
  }, [editPayment]);

  const calculateNextPaymentDate = (start: Date, freq: string): Date => {
    const today = new Date();
    let nextDate = new Date(start);

    while (nextDate <= today) {
      switch (freq) {
        case "weekly":
          nextDate = addWeeks(nextDate, 1);
          break;
        case "bi-weekly":
          nextDate = addWeeks(nextDate, 2);
          break;
        case "monthly":
          nextDate = addMonths(nextDate, 1);
          break;
      }
    }

    return nextDate;
  };

  const handleSubmit = async () => {
    if (
      !paymentType ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !frequency ||
      !startDate
    ) {
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

    if (paymentType === "deposit") {
      toast({
        title: "Deposits Suspended",
        description: "Savings deposits are temporarily suspended.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const groupName = groups.find((g) => g.id === selectedGroup)?.name;
      const loanName = loans.find((l) => l.id === selectedLoan)?.name;
      const nextPaymentDate = calculateNextPaymentDate(startDate, frequency);

      const paymentData = {
        paymentType: paymentType,
        amount: parseFloat(amount),
        contributionType:
          paymentType === "group_contribution" ? contributionType : null,
        frequency: frequency,
        startDate: format(startDate, "yyyy-MM-dd"),
        nextPaymentDate: format(nextPaymentDate, "yyyy-MM-dd"),
        endDate: hasEndDate && endDate ? format(endDate, "yyyy-MM-dd") : null,
        groupId: selectedGroup || null,
        groupName: groupName || null,
        loanId: selectedLoan || null,
        loanName: loanName || null,
        description: description || null,
        isActive: true,
      };

      if (editPayment?.id) {
        await updateRecurringPaymentMutation.mutateAsync({
          id: editPayment.id,
          patch: paymentData,
        });

        toast({
          title: "Schedule Updated",
          description: "Your recurring payment has been updated successfully.",
        });
      } else {
        await createRecurringPaymentMutation.mutateAsync(paymentData);

        toast({
          title: "Schedule Created",
          description: "Your recurring payment has been set up successfully.",
        });
      }

      onSuccess?.();
      handleClose();
    } catch (error: unknown) {
      console.error("Error saving recurring payment:", error);
      toast({
        title: "Error",
        description:
          (error as Error).message || "Failed to save recurring payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPaymentType("");
    setAmount("");
    setFrequency("monthly");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedGroup("");
    setSelectedLoan("");
    setContributionType("revolving");
    setDescription("");
    setHasEndDate(false);
    onClose();
  };

  const selectedPaymentType = paymentTypes.find((t) => t.value === paymentType);
  const selectedFrequency = frequencies.find((f) => f.value === frequency);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-emerald-600" />
            {editPayment
              ? "Edit Recurring Payment"
              : "Set Up Recurring Payment"}
          </DialogTitle>
          <DialogDescription>
            Automate your contributions and loan repayments with scheduled payments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {paymentType === "deposit" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 text-sm">
              Savings deposits are temporarily suspended. Please choose loan repayment or group contribution.
            </div>
          )}
          {/* Payment Type Selection */}
          <div className="space-y-3">
            <Label>Payment Type</Label>
            <div className="gap-2 grid grid-cols-1">
              {paymentTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = paymentType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setPaymentType(type.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-all",
                      isSelected
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    style={{
                      borderColor: isSelected
                        ? type.color === "emerald"
                          ? "#10b981"
                          : type.color === "blue"
                            ? "#3b82f6"
                            : "#8b5cf6"
                        : undefined,
                      backgroundColor: isSelected
                        ? type.color === "emerald"
                          ? "#ecfdf5"
                          : type.color === "blue"
                            ? "#eff6ff"
                            : "#f5f3ff"
                        : undefined,
                    }}
                  >
                    <div
                      className={cn("p-2 rounded-lg")}
                      style={{
                        backgroundColor: isSelected
                          ? type.color === "emerald"
                            ? "#10b981"
                            : type.color === "blue"
                              ? "#3b82f6"
                              : "#8b5cf6"
                          : "#f3f4f6",
                        color: isSelected ? "white" : "#6b7280",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-gray-900">
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Selection */}
          {paymentType === "group_contribution" && (
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
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
          )}

          {paymentType === "group_contribution" && (
            <div className="space-y-2">
              <Label>Contribution Type</Label>
              <Select
                value={contributionType}
                onValueChange={setContributionType}
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
                <p className="text-xs text-gray-500">
                  {getContributionTypeConfig(contributionType)?.description}
                </p>
              )}
            </div>
          )}

          {/* Loan Selection */}
          {paymentType === "loan_repayment" && (
            <div className="space-y-2">
              <Label>Select Loan</Label>
              <Select
                value={selectedLoan}
                onValueChange={(value) => {
                  setSelectedLoan(value);
                  const loan = loans.find((l) => l.id === value);
                  if (loan) setAmount(loan.monthlyPayment.toString());
                }}
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
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              className="font-semibold text-lg"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className={
                    amount === quickAmount.toString()
                      ? "border-emerald-500 bg-emerald-50"
                      : ""
                  }
                >
                  ₦{quickAmount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Frequency Selection */}
          <div className="space-y-2">
            <Label>Payment Frequency</Label>
            <div className="gap-2 grid grid-cols-3">
              {frequencies.map((freq) => (
                <button
                  key={freq.value}
                  onClick={() => setFrequency(freq.value)}
                  className={cn(
                    "p-3 border-2 rounded-lg text-center transition-all",
                    frequency === freq.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <p className="font-medium text-gray-900 text-sm">
                    {freq.label}
                  </p>
                  <p className="text-gray-500 text-xs">{freq.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start w-full font-normal text-left",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 w-4 h-4" />
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasEndDate"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="border-gray-300 rounded"
              />
              <Label htmlFor="hasEndDate" className="cursor-pointer">
                Set an end date (optional)
              </Label>
            </div>
            {hasEndDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start w-full font-normal text-left",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 w-4 h-4" />
                    {endDate ? format(endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Add a note for this recurring payment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary */}
          {paymentType && amount && frequency && startDate && (
            <div className="space-y-3 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-200 rounded-lg">
              <h4 className="flex items-center gap-2 font-semibold text-gray-900">
                <Clock className="w-4 h-4 text-emerald-600" />
                Payment Schedule Summary
              </h4>
              <div className="gap-3 grid grid-cols-2 text-sm">
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium">{selectedPaymentType?.label}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-bold text-emerald-600">
                    ₦{parseFloat(amount || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Frequency</p>
                  <p className="font-medium">{selectedFrequency?.label}</p>
                </div>
                <div>
                  <p className="text-gray-500">First Payment</p>
                  <p className="font-medium">
                    {format(startDate, "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              {selectedGroup && (
                <div className="pt-2 border-emerald-200 border-t">
                  <p className="text-gray-500 text-sm">Group</p>
                  <p className="font-medium">
                    {groups.find((g) => g.id === selectedGroup)?.name}
                  </p>
                </div>
              )}
              {selectedLoan && (
                <div className="pt-2 border-emerald-200 border-t">
                  <p className="text-gray-500 text-sm">Loan</p>
                  <p className="font-medium">
                    {loans.find((l) => l.id === selectedLoan)?.name}
                  </p>
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
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={
                !paymentType ||
                paymentType === "deposit" ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !frequency ||
                !startDate ||
                isLoading
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : editPayment ? (
                "Update Schedule"
              ) : (
                "Create Schedule"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
