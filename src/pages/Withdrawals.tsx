import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import WithdrawalRequestForm from "@/components/withdrawals/WithdrawalRequestForm";
import WithdrawalHistory from "@/components/withdrawals/WithdrawalHistory";
import { useWithdrawalBalanceQuery } from "@/hooks/finance/useWithdrawalBalanceQuery";
import {
  ArrowDownRight,
  Info,
  Shield,
  Clock,
  CheckCircle,
  ListCheckIcon,
  CircleCheck,
} from "lucide-react";

export default function Withdrawals() {
  const navigate = useNavigate();
  const [requestOpen, setRequestOpen] = useState(false);

  const withdrawalBalanceQuery = useWithdrawalBalanceQuery();
  const availableBalance = withdrawalBalanceQuery.data?.availableBalance ?? 0;
  const balanceLoading = withdrawalBalanceQuery.isLoading;
  const balanceError = withdrawalBalanceQuery.isError;

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-bold text-gray-900 text-2xl">Withdrawals</h1>
            <p className="mt-1 text-gray-600">
              Initiate withdrawals, track requests, and manage payout details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-4 py-2 border rounded-xl">
              <p className="text-gray-500 text-xs">Available Balance</p>
              <p className="font-semibold text-gray-900">
                {balanceLoading
                  ? "Loading..."
                  : balanceError
                    ? "Unavailable"
                    : `₦${availableBalance.toLocaleString()}`}
              </p>
            </div>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setRequestOpen(true)}
            >
              <ArrowDownRight className="w-4 h-4" />
              New Withdrawal
            </Button>
          </div>
        </div>

        <div className="gap-8 grid lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <WithdrawalHistory />
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 border rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
                <Clock className="w-5 h-5 text-emerald-600" />
                Processing Times
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-shrink-0 justify-center items-center bg-emerald-100 rounded-full w-8 h-8">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Up to ₦50,000</p>
                    <p className="text-gray-500 text-sm">
                      1-2 hours (Standard)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-shrink-0 justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      ₦50,001 - ₦500,000
                    </p>
                    <p className="text-gray-500 text-sm">
                      24-48 hours (Requires approval)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-shrink-0 justify-center items-center bg-purple-100 rounded-full w-8 h-8">
                    <Shield className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Above ₦500,000</p>
                    <p className="text-gray-500 text-sm">
                      3-5 business days (Admin approval)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 border border-blue-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-blue-900">
                <Info className="w-5 h-5" />
                Important Information
              </h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-500">
                    <CircleCheck />
                  </span>
                  Minimum withdrawal amount is ₦1,000
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-500">
                    <CircleCheck />
                  </span>
                  Withdrawals are processed on business days only
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-500">
                    <CircleCheck />
                  </span>
                  You will receive SMS and email notifications for status
                  updates
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-500">
                    <CircleCheck />
                  </span>
                  Ensure your bank details are correct before submitting
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-500">
                    <CircleCheck />
                  </span>
                  Contact support if your withdrawal is delayed beyond the
                  estimated time
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 p-6 border border-emerald-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-emerald-900">
                <Shield className="w-5 h-5" />
                Security Notice
              </h3>
              <p className="text-emerald-800 text-sm">
                For your security, withdrawals can only be made to bank accounts
                that have been verified and linked to your profile. If you need
                to add a new bank account, you can do so during the withdrawal
                request or from your profile settings.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-emerald-100 mt-4 border-emerald-300 text-emerald-700"
                onClick={() => navigate("/profile")}
              >
                Manage Bank Accounts
              </Button>
            </div>
          </div>
        </div>
      </main>

      <WithdrawalRequestForm
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSuccess={() => setRequestOpen(false)}
      />
    </div>
  );
}
