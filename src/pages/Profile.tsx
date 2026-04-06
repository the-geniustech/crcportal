import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import ProfilePhotoUpload from "@/components/profile/ProfilePhotoUpload";
import BankingDetails from "@/components/profile/BankingDetails";
import ContactChangeDialog from "@/components/profile/ContactChangeDialog";
import FinancialReportExport from "@/components/reports/FinancialReportExport";
import { useUpdateProfileMutation } from "@/hooks/profile/useUpdateProfileMutation";
import { useSavingsSummaryQuery } from "@/hooks/finance/useSavingsSummaryQuery";
import { useMyTransactionsQuery } from "@/hooks/finance/useMyTransactionsQuery";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useMyBankAccountsQuery } from "@/hooks/finance/useMyBankAccountsQuery";
import { downloadMyStatement } from "@/lib/finance";
import {
  useCreateMyBankAccountMutation,
  useDeleteMyBankAccountMutation,
  useUpdateMyBankAccountMutation,
} from "@/hooks/finance/useBankAccountMutations";
import {
  User,
  CreditCard,
  FileText,
  Download,
  Edit2,
  Mail,
  Phone,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
} from "lucide-react";

interface RawTransaction {
  _id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  reference: string;
  groupName?: string;
}

interface RawBankAccount {
  _id: string;
  bankName: string;
  bankCode?: string | null;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

type TransactionType =
  | "deposit"
  | "withdrawal"
  | "contribution"
  | "loan_repayment";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: string;
  description: string;
  reference: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  bankCode?: string | null;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ProfileContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile, refreshSession } = useAuth();
  const { toast } = useToast();
  const updateProfileMutation = useUpdateProfileMutation(user?.id);
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<
    TransactionType | "all"
  >("all");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: formatDateInputValue(startOfMonth),
      end: formatDateInputValue(now),
    };
  });
  const [statementFormat, setStatementFormat] = useState<"pdf" | "csv">("pdf");
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);

  const savingsSummaryQuery = useSavingsSummaryQuery();
  const myGroupsQuery = useMyGroupMembershipsQuery();
  const myTransactionsQuery = useMyTransactionsQuery({ limit: 200 });
  const myBankAccountsQuery = useMyBankAccountsQuery();

  const createBankAccountMutation = useCreateMyBankAccountMutation();
  const updateBankAccountMutation = useUpdateMyBankAccountMutation();
  const deleteBankAccountMutation = useDeleteMyBankAccountMutation();

  const transactions: Transaction[] = useMemo(() => {
    const list: RawTransaction[] = myTransactionsQuery.data?.transactions ?? [];
    return list.map((t) => ({
      id: t._id,
      type: (t.type === "group_contribution"
        ? "contribution"
        : t.type) as TransactionType,
      amount: Number(t.amount ?? 0),
      date: t.date,
      status: t.status === "success" ? "completed" : t.status,
      description:
        t.type === "group_contribution"
          ? t.groupName || t.description
          : t.description,
      reference: t.reference,
    }));
  }, [myTransactionsQuery.data?.transactions]);

  const bankAccounts: BankAccount[] = useMemo(() => {
    const list: RawBankAccount[] = myBankAccountsQuery.data ?? [];
    return list.map((a) => ({
      id: a._id,
      bankName: a.bankName,
      bankCode: a.bankCode ?? null,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      isPrimary: Boolean(a.isPrimary),
    }));
  }, [myBankAccountsQuery.data]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const personalInfo = {
    fullName: profile?.full_name || "",
    email: user.email || "",
    phone: profile?.phone || user.phone || "",
    dateOfBirth: profile?.date_of_birth || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    occupation: profile?.occupation || "",
    employer: profile?.employer || "",
    nextOfKinName: profile?.next_of_kin_name || "",
    nextOfKinPhone: profile?.next_of_kin_phone || "",
    nextOfKinRelationship: profile?.next_of_kin_relationship || "",
  };

  const handleSavePersonalInfo = async (data: typeof personalInfo) => {
    const emptyToNull = (v: string) => (v.trim() ? v.trim() : null);
    try {
      await updateProfileMutation.mutateAsync({
        full_name: emptyToNull(data.fullName),
        date_of_birth: emptyToNull(data.dateOfBirth),
        address: emptyToNull(data.address),
        city: emptyToNull(data.city),
        state: emptyToNull(data.state),
        occupation: emptyToNull(data.occupation),
        employer: emptyToNull(data.employer),
        next_of_kin_name: emptyToNull(data.nextOfKinName),
        next_of_kin_phone: emptyToNull(data.nextOfKinPhone),
        next_of_kin_relationship: emptyToNull(data.nextOfKinRelationship),
      });

      await refreshProfile();
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your personal information has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactRefresh = async () => {
    await refreshSession();
    await refreshProfile();
  };

  const handlePhotoUpdate = (url: string) => {
    refreshProfile();
  };

  const handleAddBankAccount = (
    account: Omit<(typeof bankAccounts)[0], "id">,
  ) => {
    void (async () => {
      try {
        await createBankAccountMutation.mutateAsync({
          bankName: account.bankName,
          bankCode: account.bankCode || "",
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          isPrimary: Boolean(account.isPrimary),
        });
        toast({
          title: "Account Added",
          description: "Bank account has been added successfully.",
        });
      } catch (error: unknown) {
        toast({
          title: "Add Failed",
          description:
            (error as Error)?.message ||
            "Failed to add bank account. Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  const handleUpdateBankAccount = (
    id: string,
    updates: Partial<(typeof bankAccounts)[0]>,
  ) => {
    void (async () => {
      try {
        await updateBankAccountMutation.mutateAsync({
          id,
          patch: {
            bankName: updates.bankName,
            bankCode: updates.bankCode,
            accountNumber: updates.accountNumber,
            accountName: updates.accountName,
            isPrimary: updates.isPrimary,
          },
        });
        toast({
          title: "Account Updated",
          description: "Bank account has been updated successfully.",
        });
      } catch (error: unknown) {
        toast({
          title: "Update Failed",
          description:
            (error as Error)?.message ||
            "Failed to update bank account. Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  const handleDeleteBankAccount = (id: string) => {
    void (async () => {
      try {
        await deleteBankAccountMutation.mutateAsync(id);
        toast({
          title: "Account Removed",
          description: "Bank account has been removed.",
        });
      } catch (error: unknown) {
        toast({
          title: "Remove Failed",
          description:
            (error as Error)?.message ||
            "Failed to remove bank account. Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  const handleSetPrimaryAccount = (id: string) => {
    void (async () => {
      try {
        await Promise.all(
          bankAccounts.map((acc) =>
            updateBankAccountMutation.mutateAsync({
              id: acc.id,
              patch: { isPrimary: acc.id === id },
            }),
          ),
        );
        toast({
          title: "Primary Account Set",
          description: "Primary bank account has been updated.",
        });
      } catch (error: unknown) {
        toast({
          title: "Update Failed",
          description:
            (error as Error)?.message ||
            "Failed to set primary account. Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  const filteredTransactions = transactions.filter((t) => {
    if (transactionFilter !== "all" && t.type !== transactionFilter)
      return false;
    if (dateRange.start && new Date(t.date) < new Date(dateRange.start))
      return false;
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(t.date) > endDate) return false;
    }
    return true;
  });

  const downloadStatement = async () => {
    setIsDownloadingStatement(true);
    try {
      const { blob, filename } = await downloadMyStatement({
        format: statementFormat,
        type: transactionFilter === "all" ? undefined : transactionFilter,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fallbackName = `statement-${new Date().toISOString().split("T")[0]}.${statementFormat}`;
      a.download = filename || fallbackName;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Statement Downloaded",
        description: `Your ${statementFormat.toUpperCase()} statement has been downloaded.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Download Failed",
        description:
          (error as Error)?.message ||
          "Unable to download statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingStatement(false);
    }
  };

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "banking", label: "Banking", icon: CreditCard },
    { id: "transactions", label: "Transactions", icon: FileText },
    { id: "reports", label: "Reports", icon: Download },
  ];
  //
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case "withdrawal":
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case "contribution":
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case "loan_repayment":
        return <Wallet className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case "deposit":
        return "text-green-600";
      case "withdrawal":
        return "text-red-600";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 mb-8 p-6 rounded-2xl text-white">
          <div className="flex md:flex-row flex-col items-center gap-6">
            <ProfilePhotoUpload
              currentPhotoUrl={profile?.avatar_url || null}
              userId={user.id}
              onPhotoUpdate={handlePhotoUpdate}
            />
            <div className="flex-1 md:text-left text-center">
              <h1 className="font-bold text-2xl">
                {profile?.full_name || "Member"}
              </h1>
              <p className="text-emerald-100">{user.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                <div className="bg-white/20 px-4 py-2 rounded-lg">
                  <p className="text-emerald-100 text-xs">Member Since</p>
                  <p className="font-semibold">January 2024</p>
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-lg">
                  <p className="text-emerald-100 text-xs">Total Savings</p>
                  <p className="font-semibold">
                    ₦
                    {Number(
                      savingsSummaryQuery.data?.ledgerBalance ?? 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-lg">
                  <p className="text-emerald-100 text-xs">Groups</p>
                  <p className="font-semibold">
                    {Number(myGroupsQuery.data?.length ?? 0)} Active
                  </p>
                </div>
              </div>
            </div>
            {activeTab === "personal" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
                <button
                  onClick={() => setEmailDialogOpen(true)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Change Email
                </button>
                <button
                  onClick={() => setPhoneDialogOpen(true)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Change Phone
                </button>
              </div>
            )}
          </div>
        </div>

        <ContactChangeDialog
          open={emailDialogOpen}
          mode="email"
          currentValue={user.email}
          onOpenChange={setEmailDialogOpen}
          onSuccess={handleContactRefresh}
        />
        <ContactChangeDialog
          open={phoneDialogOpen}
          mode="phone"
          currentValue={profile?.phone || user.phone || ""}
          onOpenChange={setPhoneDialogOpen}
          onSuccess={handleContactRefresh}
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 pb-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "personal" && (
            <PersonalInfoForm
              initialData={personalInfo}
              onSave={handleSavePersonalInfo}
              isEditing={isEditing}
              onEditToggle={() => setIsEditing(!isEditing)}
            />
          )}

          {activeTab === "banking" && (
            <BankingDetails
              accounts={bankAccounts}
              onAddAccount={handleAddBankAccount}
              onUpdateAccount={handleUpdateBankAccount}
              onDeleteAccount={handleDeleteBankAccount}
              onSetPrimary={handleSetPrimaryAccount}
            />
          )}

          {activeTab === "transactions" && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-4 border border-gray-200 rounded-xl">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 text-sm">
                      Type
                    </label>
                    <select
                      value={transactionFilter}
                      onChange={(e) =>
                        setTransactionFilter(
                          e.target.value as TransactionType | "all",
                        )
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">All Types</option>
                      <option value="deposit">Deposits</option>
                      <option value="withdrawal">Withdrawals</option>
                      <option value="contribution">Contributions</option>
                      <option value="loan_repayment">Loan Repayments</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 text-sm">
                      From
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 text-sm">
                      To
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 text-sm">
                      Format
                    </label>
                    <select
                      value={statementFormat}
                      onChange={(e) =>
                        setStatementFormat(e.target.value as "pdf" | "csv")
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={downloadStatement}
                      disabled={isDownloadingStatement}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {isDownloadingStatement ? "Downloading..." : "Download Statement"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction List */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-gray-200 border-b">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                          Description
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase">
                          Reference
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.type)}
                              <span className="text-sm capitalize">
                                {transaction.type.replace("_", " ")}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-500 text-sm">
                            {transaction.reference}
                          </td>
                          <td
                            className={`px-6 py-4 text-right text-sm font-semibold ${getTransactionColor(transaction.type)}`}
                          >
                            {transaction.type === "withdrawal" ? "-" : "+"}₦
                            {transaction.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full font-medium text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3" />
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="bg-white p-6 border border-gray-200 rounded-xl">
              <FinancialReportExport
                memberId={user.id}
                memberName={profile?.full_name || "Member"}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const Profile: React.FC = () => {
  return (
    <AuthProvider>
      <ProfileContent />
    </AuthProvider>
  );
};

export default Profile;

