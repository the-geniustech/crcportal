import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { useMyBankAccountsQuery } from "@/hooks/finance/useMyBankAccountsQuery";
import { useCreateWithdrawalMutation } from "@/hooks/finance/useCreateWithdrawalMutation";
import {
  ArrowDownRight,
  Wallet,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
} from "lucide-react";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
}

interface WithdrawalRequestFormProps {
  availableBalance: number;
  onSuccess?: () => void;
}

export default function WithdrawalRequestForm({
  availableBalance,
  onSuccess,
}: WithdrawalRequestFormProps) {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bankAccountsQuery = useMyBankAccountsQuery();
  const createWithdrawalMutation = useCreateWithdrawalMutation();
  const loadingAccounts = bankAccountsQuery.isLoading;

  useEffect(() => {
    const data = (bankAccountsQuery.data ?? []).map((acc: unknown) => ({
      id: String(acc._id),
      bank_name: String(acc.bankName),
      account_number: String(acc.accountNumber),
      account_name: String(acc.accountName),
      is_primary: Boolean(acc.isPrimary),
    }));

    setBankAccounts(data);

    const primaryAccount = data.find((acc) => acc.is_primary);
    if (primaryAccount) {
      setSelectedAccount(primaryAccount.id);
    } else if (data.length > 0) {
      setSelectedAccount(data[0].id);
    }
  }, [bankAccountsQuery.data]);

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

    if (!selectedAccount) {
      toast({
        title: "Select Bank Account",
        description: "Please select a bank account for withdrawal",
        variant: "destructive",
      });
      return;
    }

    const selectedBankAccount = bankAccounts.find(
      (acc) => acc.id === selectedAccount,
    );
    if (!selectedBankAccount) return;

    setIsSubmitting(true);
    try {
      await createWithdrawalMutation.mutateAsync({
        amount: getNumericAmount(),
        bankAccountId: selectedAccount,
        reason: reason || null,
      });

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your request for ₦${getNumericAmount().toLocaleString()} has been submitted for processing.`,
      });

      // Reset form
      setAmount("");
      setReason("");
      onSuccess?.();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-emerald-600" />
          Request Withdrawal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Available Balance */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex justify-center items-center bg-emerald-500 rounded-full w-10 h-10">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-emerald-700 text-sm">Available Balance</p>
                  <p className="font-bold text-emerald-800 text-2xl">
                    ₦{availableBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
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
            <div className="flex gap-2 mt-2">
              {[10000, 25000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  disabled={preset > availableBalance}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    preset > availableBalance
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-emerald-100 hover:border-emerald-300 text-gray-700"
                  }`}
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Bank Account Selection */}
          <div className="space-y-2">
            <Label>Select Bank Account</Label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading accounts...
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg">
                <p className="flex items-center gap-2 text-amber-800 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  No bank accounts found. Please add a bank account in your
                  profile settings.
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
          </div>

          {/* Reason (Optional) */}
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

          {/* Processing Time Estimate */}
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

          {/* Important Notice */}
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

          {/* Submit Button */}
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 w-full"
            disabled={
              isSubmitting ||
              !validation.valid ||
              !selectedAccount ||
              bankAccounts.length === 0
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
        </form>
      </CardContent>
    </Card>
  );
}
