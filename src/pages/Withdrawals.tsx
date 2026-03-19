import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WithdrawalRequestForm from '@/components/withdrawals/WithdrawalRequestForm';
import WithdrawalHistory from '@/components/withdrawals/WithdrawalHistory';
import { useSavingsSummaryQuery } from "@/hooks/finance/useSavingsSummaryQuery";
import {
  ArrowLeft,
  ArrowDownRight,
  History,
  Info,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function Withdrawals() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('request');

  const savingsSummaryQuery = useSavingsSummaryQuery();
  const availableBalance = savingsSummaryQuery.data?.availableBalance ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">Withdrawals</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Withdraw Funds</h2>
          <p className="text-gray-600 mt-1">
            Request to withdraw funds from your savings account
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white border mb-6">
                <TabsTrigger value="request" className="gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  New Request
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="request">
                <WithdrawalRequestForm
                  availableBalance={availableBalance}
                  onSuccess={() => setActiveTab('history')}
                />
              </TabsContent>

              <TabsContent value="history">
                <WithdrawalHistory />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Processing Times */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-emerald-600" />
                Processing Times
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Up to ₦50,000</p>
                    <p className="text-sm text-gray-500">1-2 hours (Standard)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">₦50,001 - ₦500,000</p>
                    <p className="text-sm text-gray-500">24-48 hours (Requires approval)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Above ₦500,000</p>
                    <p className="text-sm text-gray-500">3-5 business days (Admin approval)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-4">
                <Info className="h-5 w-5" />
                Important Information
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  Minimum withdrawal amount is ₦1,000
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  Withdrawals are processed on business days only
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  You will receive SMS and email notifications for status updates
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  Ensure your bank details are correct before submitting
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  Contact support if your withdrawal is delayed beyond the estimated time
                </li>
              </ul>
            </div>

            {/* Security Notice */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
              <h3 className="font-semibold text-emerald-900 flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5" />
                Security Notice
              </h3>
              <p className="text-sm text-emerald-800">
                For your security, withdrawals can only be made to bank accounts that have been
                verified and linked to your profile. If you need to add a new bank account,
                please visit your profile settings.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                onClick={() => navigate('/profile')}
              >
                Manage Bank Accounts
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
