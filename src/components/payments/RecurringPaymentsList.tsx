import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMyRecurringPaymentsQuery } from "@/hooks/finance/useMyRecurringPaymentsQuery";
import {
  useDeleteRecurringPaymentMutation,
  useUpdateRecurringPaymentMutation,
} from "@/hooks/finance/useRecurringPaymentsMutations";
import { getContributionTypeLabel } from "@/lib/contributionPolicy";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Repeat,
  Wallet,
  CreditCard,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Loader2,
} from "lucide-react";
import RecurringPaymentModal from "./RecurringPaymentModal";

interface RecurringPayment {
  id: string;
  payment_type: "deposit" | "loan_repayment" | "group_contribution";
  amount: number;
  contribution_type?: string;
  frequency: "weekly" | "bi-weekly" | "monthly";
  start_date: string;
  next_payment_date: string;
  end_date?: string;
  group_id?: string;
  group_name?: string;
  loan_id?: string;
  loan_name?: string;
  description?: string;
  is_active: boolean;
  total_payments_made: number;
  total_amount_paid: number;
  last_payment_date?: string;
  last_payment_status?: string;
  created_at: string;
}

const paymentTypeConfig = {
  deposit: {
    label: "Savings Deposit",
    icon: Wallet,
    color: "emerald",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-600",
  },
  loan_repayment: {
    label: "Loan Repayment",
    icon: CreditCard,
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  group_contribution: {
    label: "Group Contribution",
    icon: Users,
    color: "purple",
    bgColor: "bg-purple-100",
    textColor: "text-purple-600",
  },
};

const frequencyLabels = {
  weekly: "Weekly",
  "bi-weekly": "Bi-Weekly",
  monthly: "Monthly",
};

export default function RecurringPaymentsList() {
  const { toast } = useToast();
  const paymentsQuery = useMyRecurringPaymentsQuery();
  const updatePaymentMutation = useUpdateRecurringPaymentMutation();
  const deletePaymentMutation = useDeleteRecurringPaymentMutation();
  const isLoading = paymentsQuery.isLoading;
  const isError = paymentsQuery.isError;

  const payments: RecurringPayment[] = useMemo(() => {
    const list = paymentsQuery.data ?? [];
    return list.map((p) => ({
      id: p._id,
      payment_type: p.paymentType,
      amount: Number(p.amount ?? 0),
      contribution_type: p.contributionType ?? undefined,
      frequency: p.frequency,
      start_date: p.startDate,
      next_payment_date: p.nextPaymentDate,
      end_date: p.endDate ?? undefined,
      group_id: p.groupId ?? undefined,
      group_name: p.groupName ?? undefined,
      loan_id: p.loanId ?? undefined,
      loan_name: p.loanName ?? undefined,
      description: p.description ?? undefined,
      is_active: Boolean(p.isActive),
      total_payments_made: Number(p.totalPaymentsMade ?? 0),
      total_amount_paid: Number(p.totalAmountPaid ?? 0),
      last_payment_date: p.lastPaymentDate ?? undefined,
      last_payment_status: p.lastPaymentStatus ?? undefined,
      created_at: p.createdAt ?? p.startDate,
    }));
  }, [paymentsQuery.data]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<RecurringPayment | null>(null);
  const [deletePayment, setDeletePayment] = useState<RecurringPayment | null>(
    null,
  );
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  const filteredPayments = payments.filter((payment) => {
    if (filter === "active") return payment.is_active;
    if (filter === "paused") return !payment.is_active;
    return true;
  });

  const stats = {
    totalActive: payments.filter((p) => p.is_active).length,
    totalMonthly: payments
      .filter((p) => p.is_active)
      .reduce((sum, p) => {
        const multiplier =
          p.frequency === "weekly" ? 4 : p.frequency === "bi-weekly" ? 2 : 1;
        return sum + p.amount * multiplier;
      }, 0),
    totalPaid: payments.reduce((sum, p) => sum + p.total_amount_paid, 0),
  };

  const handleToggleActive = async (payment: RecurringPayment) => {
    try {
      const newStatus = !payment.is_active;

      await updatePaymentMutation.mutateAsync({
        id: payment.id,
        patch: { isActive: newStatus },
      });

      toast({
        title: newStatus ? "Schedule Activated" : "Schedule Paused",
        description: newStatus
          ? "Your recurring payment has been activated."
          : "Your recurring payment has been paused.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (payment: RecurringPayment) => {
    setEditPayment(payment);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletePayment) return;

    try {
      await deletePaymentMutation.mutateAsync(deletePayment.id);

      toast({
        title: "Schedule Deleted",
        description: "Your recurring payment has been deleted.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to delete payment schedule",
        variant: "destructive",
      });
    } finally {
      setDeletePayment(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditPayment(null);
  };

  const getDaysUntilNextPayment = (nextDate: string) => {
    const days = differenceInDays(parseISO(nextDate), new Date());
    if (days < 0) return "Overdue";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
                <Repeat className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Schedules</p>
                <p className="font-bold text-gray-900 text-2xl">
                  {isLoading || isError ? "\u2014" : stats.totalActive}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Est. Monthly Total</p>
                <p className="font-bold text-gray-900 text-2xl">
                  {isLoading || isError
                    ? "\u2014"
                    : `₦${stats.totalMonthly.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Paid (All Time)</p>
                <p className="font-bold text-gray-900 text-2xl">
                  {isLoading || isError
                    ? "\u2014"
                    : `₦${stats.totalPaid.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Actions */}
      <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({isLoading || isError ? "\u2014" : payments.length})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
            className={
              filter === "active" ? "bg-emerald-600 hover:bg-emerald-700" : ""
            }
          >
            Active (
              {isLoading || isError
                ? "\u2014"
                : payments.filter((p) => p.is_active).length}
            )
          </Button>
          <Button
            variant={filter === "paused" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("paused")}
          >
            Paused (
              {isLoading || isError
                ? "\u2014"
                : payments.filter((p) => !p.is_active).length}
            )
          </Button>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </Button>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="mx-auto mb-4 w-12 h-12 text-emerald-600 animate-spin" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Loading Recurring Payments
              </h3>
              <p className="text-gray-500">Please wait...</p>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 w-10 h-10 text-red-500" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Couldn&apos;t load recurring payments
              </h3>
              <p className="mb-4 text-gray-500">
                Please check your connection and try again.
              </p>
              <Button
                variant="outline"
                onClick={() => paymentsQuery.refetch()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Repeat className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                No Recurring Payments
              </h3>
              <p className="mb-4 text-gray-500">
                {filter === "all"
                  ? "You haven't set up any recurring payments yet."
                  : filter === "active"
                    ? "No active recurring payments."
                    : "No paused recurring payments."}
              </p>
              {filter === "all" && (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Your First Schedule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => {
            const config = paymentTypeConfig[payment.payment_type];
            const Icon = config.icon;
            const daysUntil = getDaysUntilNextPayment(
              payment.next_payment_date,
            );
            const isOverdue = daysUntil === "Overdue";

            return (
              <Card
                key={payment.id}
                className={`transition-all ${!payment.is_active ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex lg:flex-row flex-col justify-between lg:items-center gap-4">
                    {/* Left Section - Payment Info */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`h-6 w-6 ${config.textColor}`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {config.label}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {frequencyLabels[payment.frequency]}
                          </Badge>
                          {!payment.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Paused
                            </Badge>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 text-2xl">
                          ₦{payment.amount.toLocaleString()}
                        </p>
                        {payment.group_name && (
                          <p className="text-gray-500 text-sm">
                            <Users className="inline mr-1 w-3 h-3" />
                            {payment.group_name}
                          </p>
                        )}
                        {payment.payment_type === "group_contribution" && (
                          <p className="text-gray-500 text-sm">
                            Contribution type:{" "}
                            {getContributionTypeLabel(
                              payment.contribution_type || "revolving",
                            )}
                          </p>
                        )}
                        {payment.loan_name && (
                          <p className="text-gray-500 text-sm">
                            <CreditCard className="inline mr-1 w-3 h-3" />
                            {payment.loan_name}
                          </p>
                        )}
                        {payment.description && (
                          <p className="text-gray-400 text-sm italic">
                            {payment.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle Section - Stats */}
                    <div className="gap-4 lg:gap-6 grid grid-cols-2 lg:grid-cols-3">
                      <div className="lg:text-left text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Next Payment
                        </p>
                        <p
                          className={`font-semibold ${isOverdue ? "text-red-600" : "text-gray-900"}`}
                        >
                          {payment.is_active ? (
                            <>
                              {format(
                                parseISO(payment.next_payment_date),
                                "MMM d, yyyy",
                              )}
                              <span
                                className={`block text-xs ${isOverdue ? "text-red-500" : "text-gray-500"}`}
                              >
                                {isOverdue && (
                                  <AlertCircle className="inline mr-1 w-3 h-3" />
                                )}
                                {daysUntil}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">Paused</span>
                          )}
                        </p>
                      </div>
                      <div className="lg:text-left text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Payments Made
                        </p>
                        <p className="font-semibold text-gray-900">
                          {payment.total_payments_made}
                        </p>
                      </div>
                      <div className="col-span-2 lg:col-span-1 lg:text-left text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                          Total Paid
                        </p>
                        <p className="font-semibold text-emerald-600">
                          ₦{payment.total_amount_paid.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">
                          {payment.is_active ? "Active" : "Paused"}
                        </span>
                        <Switch
                          checked={payment.is_active}
                          onCheckedChange={() => handleToggleActive(payment)}
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(payment)}>
                            <Edit className="mr-2 w-4 h-4" />
                            Edit Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(payment)}
                          >
                            {payment.is_active ? (
                              <>
                                <Pause className="mr-2 w-4 h-4" />
                                Pause Schedule
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 w-4 h-4" />
                                Resume Schedule
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletePayment(payment)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 w-4 h-4" />
                            Delete Schedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Last Payment Status */}
                  {payment.last_payment_date && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t text-gray-500 text-sm">
                      {payment.last_payment_status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>
                        Last payment:{" "}
                        {format(
                          parseISO(payment.last_payment_date),
                          "MMM d, yyyy",
                        )}{" "}
                        -{" "}
                        <span
                          className={
                            payment.last_payment_status === "success"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }
                        >
                          {payment.last_payment_status === "success"
                            ? "Successful"
                            : "Failed"}
                        </span>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modals */}
      <RecurringPaymentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editPayment={editPayment}
        onSuccess={() => {
          paymentsQuery.refetch();
          handleModalClose();
        }}
      />

      <AlertDialog
        open={!!deletePayment}
        onOpenChange={() => setDeletePayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring payment schedule?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
