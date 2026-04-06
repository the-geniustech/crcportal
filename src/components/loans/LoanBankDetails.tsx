import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateMyBankAccountMutation } from "@/hooks/finance/useBankAccountMutations";
import { usePaystackBanksQuery } from "@/hooks/finance/usePaystackBanksQuery";

interface BankAccount {
  id: string;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

interface LoanBankDetailsProps {
  bankAccounts: BankAccount[];
  bankAccountsLoading?: boolean;
  bankAccountsError?: boolean;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function LoanBankDetails({
  bankAccounts,
  bankAccountsLoading,
  bankAccountsError,
  selectedAccountId,
  onSelectAccount,
  onContinue,
  onBack,
}: LoanBankDetailsProps) {
  const { toast } = useToast();
  const createBankAccountMutation = useCreateMyBankAccountMutation();
  const banksQuery = usePaystackBanksQuery();
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

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    if (selectedAccountId) return;
    if (bankAccounts.length === 0) return;
    const primary = bankAccounts.find((acc) => acc.isPrimary);
    onSelectAccount(primary?.id || bankAccounts[0].id);
  }, [bankAccounts, selectedAccountId, onSelectAccount]);

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
        description: "Bank account has been saved for disbursement.",
      });

      setShowAddAccount(false);
      setNewAccount({
        bankName: "",
        bankCode: "",
        accountNumber: "",
        accountName: "",
      });

      if (created?._id) {
        onSelectAccount(String(created._id));
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

  const canContinue = Boolean(selectedAccountId);
  const bankListLoading = banksQuery.isLoading;
  const bankListError = banksQuery.isError;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Bank Details for Disbursement
            </h3>
            <p className="text-gray-500 text-sm">
              Select the account you want the loan disbursed into.
            </p>
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

          {bankAccountsLoading ? (
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
                  onClick={() => onSelectAccount(account.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAccountId === account.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          selectedAccountId === account.id
                            ? "bg-emerald-500"
                            : "bg-gray-200"
                        }`}
                      >
                        <Building2
                          className={`h-5 w-5 ${
                            selectedAccountId === account.id
                              ? "text-white"
                              : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {account.bankName}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {account.accountNumber} - {account.accountName}
                        </p>
                      </div>
                    </div>
                    {account.isPrimary && (
                      <span className="bg-emerald-100 px-2 py-1 rounded-full font-medium text-emerald-700 text-xs">
                        Primary
                      </span>
                    )}
                    {selectedAccountId === account.id && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showAddAccount && (
            <Card className="border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between">
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
                      const bank = bankOptions.find(
                        (item) => item.code === value,
                      );
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
                    disabled={
                      savingAccount ||
                      bankListLoading ||
                      bankOptions.length === 0
                    }
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

          {bankAccountsError && (
            <p className="text-red-500 text-sm">
              Unable to load bank accounts right now. Please refresh.
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-blue-700 text-sm">
            This account will be used for disbursement if your loan is approved.
            Ensure the details are correct and match your bank records.
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            canContinue
              ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}
