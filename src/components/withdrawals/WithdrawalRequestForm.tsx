import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMyBankAccountsQuery } from "@/hooks/finance/useMyBankAccountsQuery";
import { useCreateWithdrawalMutation } from "@/hooks/finance/useCreateWithdrawalMutation";
import { useCreateMyBankAccountMutation } from "@/hooks/finance/useBankAccountMutations";
import { useWithdrawalBalanceQuery } from "@/hooks/finance/useWithdrawalBalanceQuery";
import { usePaystackBanksQuery } from "@/hooks/finance/usePaystackBanksQuery";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import {
  ContributionTypeOptions,
  getContributionTypeDescription,
} from "@/lib/contributionPolicy";
import {
  ArrowDownRight,
  Wallet,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Plus,
  X,
} from "lucide-react";

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
}

interface WithdrawalRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function WithdrawalRequestForm({
  open,
  onOpenChange,
  onSuccess,
}: WithdrawalRequestFormProps) {
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [contributionType, setContributionType] = useState(
    ContributionTypeOptions[0]?.value ?? "revolving",
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const bankAccountsQuery = useMyBankAccountsQuery();
  const createWithdrawalMutation = useCreateWithdrawalMutation();
  const createBankAccountMutation = useCreateMyBankAccountMutation();
  const membershipsQuery = useMyGroupMembershipsQuery();
  const withdrawalBalanceQuery = useWithdrawalBalanceQuery({
    groupId: selectedGroupId || null,
    contributionType,
    enabled: open,
  });
  const banksQuery = usePaystackBanksQuery({ enabled: open });
  const availableBalance = withdrawalBalanceQuery.data?.availableBalance ?? 0;
  const balanceLoading = withdrawalBalanceQuery.isLoading;
  const balanceError = withdrawalBalanceQuery.isError;
  const bankListLoading = banksQuery.isLoading;
  const bankListError = banksQuery.isError;

  const bankAccounts: BankAccount[] = useMemo(() => {
    const data = bankAccountsQuery.data ?? [];
    return data.map((acc: unknown) => ({
      id: String(acc._id),
      bank_name: String(acc.bankName),
      bank_code: acc.bankCode ? String(acc.bankCode) : undefined,
      account_number: String(acc.accountNumber),
      account_name: String(acc.accountName),
      is_primary: Boolean(acc.isPrimary),
    }));
  }, [bankAccountsQuery.data]);

  const groups = useMemo(() => {
    const memberships = membershipsQuery.data ?? [];
    return memberships
      .map((membership: any) => {
        const rawGroup =
          typeof membership.groupId === "object" ? membership.groupId : null;
        const id = rawGroup?._id
          ? String(rawGroup._id)
          : typeof membership.groupId === "string"
            ? String(membership.groupId)
            : "";
        if (!id) return null;
        return {
          id,
          name: rawGroup?.groupName ? String(rawGroup.groupName) : "Group",
        };
      })
      .filter(Boolean) as { id: string; name: string }[];
  }, [membershipsQuery.data]);

  const bankOptions = useMemo(() => {
    const list = banksQuery.data ?? [];
    return list
      .filter((bank: any) => bank && bank.is_deleted !== true)
      .filter((bank: any) => bank && bank.active !== false)
      .map((bank: any) => ({
        name: String(bank.name),
        code: String(bank.code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [banksQuery.data]);

  useEffect(() => {
    if (!open) return;
    if (selectedAccount) return;
    if (bankAccounts.length === 0) return;
    const primaryAccount = bankAccounts.find((acc) => acc.is_primary);
    if (primaryAccount) {
      setSelectedAccount(primaryAccount.id);
    } else if (bankAccounts.length > 0) {
      setSelectedAccount(bankAccounts[0].id);
    }
  }, [open, bankAccounts, selectedAccount]);

  useEffect(() => {
    if (!open) return;
    if (selectedGroupId) return;
    if (groups.length === 1) {
      setSelectedGroupId(groups[0].id);
    }
  }, [open, groups, selectedGroupId]);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setReason("");
      setSelectedAccount("");
      setSelectedGroupId("");
      setContributionType(ContributionTypeOptions[0]?.value ?? "revolving");
      setShowAddAccount(false);
      setNewAccount({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });
    }
  }, [open]);

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setAmount(numericValue);
  };

  const getNumericAmount = () => {
    return parseInt(amount) || 0;
  };

  const validateAmount = () => {
    const numAmount = getNumericAmount();
    if (numAmount < 1000) {
      return { valid: false, message: "Minimum withdrawal amount is ₦1,000" };
    }
    if (withdrawalBalanceQuery.isLoading) {
      return { valid: false, message: "Balance is still loading" };
    }
    if (withdrawalBalanceQuery.isError) {
      return { valid: false, message: "Unable to load balance" };
    }
    if (numAmount > availableBalance) {
      return { valid: false, message: "Amount exceeds available balance" };
    }
    return { valid: true, message: "" };
  };

  const getProcessingTime = () => {
    const numAmount = getNumericAmount();
    if (numAmount <= 50000) {
      return { time: "1-2 hours", description: "Standard processing" };
    } else if (numAmount <= 500000) {
      return { time: "24-48 hours", description: "Requires approval" };
    } else {
      return {
        time: "3-5 business days",
        description: "Requires admin approval",
      };
    }
  };

  const handleAddAccount = async () => {
    if (
      !newAccount.bankName ||
      !newAccount.bankCode ||
      !newAccount.accountNumber ||
      !newAccount.accountName
    ) {
      toast({
        title: "Missing Details",
        description: "Please complete all bank account fields.",
        variant: "destructive",
      });
      return;
    }

    const accountNumber = newAccount.accountNumber
      .replace(/\D/g, "")
      .slice(0, 10);
    if (accountNumber.length < 10) {
      toast({
        title: "Invalid Account Number",
        description: "Account number must be 10 digits.",
        variant: "destructive",
      });
      return;
    }

    setSavingAccount(true);
    try {
      const created = await createBankAccountMutation.mutateAsync({
        bankName: newAccount.bankName,
        bankCode: newAccount.bankCode,
        accountNumber,
        accountName: newAccount.accountName,
        isPrimary: bankAccounts.length === 0,
      });

      toast({
        title: "Account Added",
        description: "Bank account has been saved for withdrawals.",
      });

      setShowAddAccount(false);
      setNewAccount({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });
      if (created?._id) {
        setSelectedAccount(String(created._id));
      }
    } catch (error: unknown) {
      toast({
        title: "Add Failed",
        description:
          (error as Error)?.message ||
          "Failed to add bank account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateAmount();
    if (!validation.valid) {
      toast({
        title: "Invalid Amount",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    if (groups.length > 0 && !selectedGroupId) {
      toast({
        title: "Select Contribution Group",
        description: "Please choose the group contribution source.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAccount) {
      toast({
        title: "Select Bank Account",
        description: "Please select a bank account for withdrawal",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createWithdrawalMutation.mutateAsync({
        amount: getNumericAmount(),
        bankAccountId: selectedAccount,
        contributionType,
        groupId: selectedGroupId || null,
        reason: reason || null,
      });

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your request for ₦${getNumericAmount().toLocaleString()} has been submitted for processing.`,
      });

      setAmount("");
      setReason("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: "Submission Failed",
        description:
          (error as Error)?.message || "Failed to submit withdrawal request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validation = validateAmount();
  const processingTime = getProcessingTime();
  const loadingAccounts = bankAccountsQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            Request Withdrawal
          </DialogTitle>
          <DialogDescription>
            Choose your contribution source, bank account, and withdrawal
            amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-emerald-700 text-sm">Available Balance</p>
                  <p className="font-bold text-emerald-800 text-2xl">
                    {balanceLoading
                      ? "Loading..."
                      : balanceError
                        ? "Unavailable"
                        : `₦${availableBalance.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="gap-4 grid md:grid-cols-2">
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
              <p className="text-gray-500 text-xs">
                {getContributionTypeDescription(contributionType)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Contribution Group</Label>
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
                disabled={groups.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      groups.length === 0 ? "No active groups" : "Select group"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {groups.length === 0 && (
                <p className="text-gray-500 text-xs">
                  You do not have an active group contribution to select.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount</Label>
            <div className="relative">
              <span className="top-1/2 left-3 absolute font-medium text-gray-500 -translate-y-1/2">
                ₦
              </span>
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={amount ? parseInt(amount).toLocaleString() : ""}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-8 font-semibold text-lg"
              />
            </div>
            {amount && !validation.valid && (
              <p className="flex items-center gap-1 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {validation.message}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {[10000, 25000, 50000, 100000].map((preset) => {
                const presetDisabled =
                  balanceLoading || balanceError || preset > availableBalance;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    disabled={presetDisabled}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      presetDisabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-100 hover:bg-emerald-100 hover:border-emerald-300 text-gray-700"
                    }`}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Select Bank Account</Label>
              {!showAddAccount && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAccount(true)}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add new
                </Button>
              )}
            </div>

            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading accounts...
              </div>
            ) : bankAccounts.length === 0 && !showAddAccount ? (
              <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg">
                <p className="flex items-center gap-2 text-amber-800 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  No bank accounts found. Add one to continue.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccount(account.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedAccount === account.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            selectedAccount === account.id
                              ? "bg-emerald-500"
                              : "bg-gray-200"
                          }`}
                        >
                          <Building2
                            className={`h-5 w-5 ${
                              selectedAccount === account.id
                                ? "text-white"
                                : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {account.bank_name}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {account.account_number} - {account.account_name}
                          </p>
                        </div>
                      </div>
                      {account.is_primary && (
                        <span className="bg-emerald-100 px-2 py-1 rounded-full font-medium text-emerald-700 text-xs">
                          Primary
                        </span>
                      )}
                      {selectedAccount === account.id && (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showAddAccount && (
              <Card className="border-emerald-200">
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="text-base">New Bank Account</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddAccount(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Select
                      value={newAccount.bankCode}
                      onValueChange={(value) => {
                        const bank = bankOptions.find((item) => item.code === value);
                        setNewAccount((prev) => ({
                          ...prev,
                          bankCode: value,
                          bankName: bank?.name || "",
                        }));
                      }}
                      disabled={bankListLoading || bankOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankOptions.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(bankListLoading || bankOptions.length === 0) && (
                      <p className="text-gray-500 text-xs">
                        {bankListLoading
                          ? "Loading bank list..."
                          : bankListError
                            ? "Unable to load bank list right now."
                            : "Bank list is unavailable right now. Please try again shortly."}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={newAccount.accountNumber}
                      onChange={(e) =>
                        setNewAccount((prev) => ({
                          ...prev,
                          accountNumber: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        }))
                      }
                      placeholder="0123456789"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      value={newAccount.accountName}
                      onChange={(e) =>
                        setNewAccount((prev) => ({
                          ...prev,
                          accountName: e.target.value,
                        }))
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddAccount(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleAddAccount}
                      disabled={savingAccount || bankListLoading || bankOptions.length === 0}
                    >
                      {savingAccount ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        "Save Account"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Withdrawal (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Emergency expenses, Business investment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {amount && validation.valid && (
            <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">
                    Estimated Processing Time
                  </p>
                  <p className="mt-1 text-blue-600 text-sm">
                    <span className="font-semibold">{processingTime.time}</span>{" "}
                    - {processingTime.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 w-5 h-5 text-gray-500" />
              <div className="text-gray-600 text-sm">
                <p className="mb-1 font-medium text-gray-700">
                  Important Information
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Minimum withdrawal amount is ₦1,000</li>
                  <li>Withdrawals above ₦50,000 require admin approval</li>
                  <li>
                    Funds will be transferred to your selected bank account
                  </li>
                  <li>
                    You will receive SMS and email notifications on status
                    updates
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={
                isSubmitting ||
                !validation.valid ||
                !selectedAccount ||
                (groups.length > 0 && !selectedGroupId)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <ArrowDownRight className="mr-2 w-4 h-4" />
                  Submit Withdrawal Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
