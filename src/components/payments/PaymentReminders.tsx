import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePaymentRemindersQuery } from '@/hooks/finance/usePaymentRemindersQuery';
import { useNotificationPreferencesQuery } from '@/hooks/profile/useNotificationPreferencesQuery';
import { useUpdateNotificationPreferencesMutation } from '@/hooks/profile/useUpdateNotificationPreferencesMutation';
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  Users, 
  AlertTriangle, 
  Clock,
  ChevronRight,
  Settings
} from 'lucide-react';
import type { BackendPaymentReminder } from '@/lib/finance';
import type { NotificationPreferences } from '@/lib/notificationPreferences';

type Reminder = BackendPaymentReminder;

interface PaymentRemindersProps {
  onPayNow: (reminder: Reminder) => void;
  onPayBulk?: (reminders: Reminder[]) => void;
}

export default function PaymentReminders({
  onPayNow,
  onPayBulk,
}: PaymentRemindersProps) {
  const { toast } = useToast();
  const remindersQuery = usePaymentRemindersQuery();
  const preferencesQuery = useNotificationPreferencesQuery();
  const updatePreferencesMutation = useUpdateNotificationPreferencesMutation();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (preferencesQuery.data) {
      setPreferences(preferencesQuery.data);
    }
  }, [preferencesQuery.data]);

  const reminders = remindersQuery.data?.reminders ?? [];
  const summary = remindersQuery.data?.summary;
  const isLoading = remindersQuery.isLoading;
  const isError = remindersQuery.isError;

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  }, [reminders]);

  const overdueCount = summary?.overdueCount ?? reminders.filter(r => r.isOverdue).length;
  const upcomingCount = summary?.upcomingCount ?? reminders.filter(r => !r.isOverdue && r.daysUntilDue <= 7).length;
  const totalDue = summary?.totalDue ?? reminders.reduce((sum, r) => sum + r.amount, 0);

  const overdueReminders = reminders.filter(r => r.isOverdue);
  const overdueTotal = overdueReminders.reduce((sum, r) => sum + r.amount, 0);
  const overdueTypes = new Set(overdueReminders.map(r => r.type));

  const emailNotifications = preferences?.emailNotifications ?? false;
  const smsNotifications = preferences?.smsNotifications ?? false;

  const handlePreferenceUpdate = async (
    key: 'emailNotifications' | 'smsNotifications',
    value: boolean,
  ) => {
    if (!preferences) return;
    const previous = preferences;
    const next = { ...previous, [key]: value };
    setPreferences(next);
    try {
      await updatePreferencesMutation.mutateAsync(next);
      toast({
        title: 'Preferences Updated',
        description: 'Notification preferences saved successfully.',
      });
    } catch (error: unknown) {
      setPreferences(previous);
      toast({
        title: 'Update Failed',
        description:
          (error as Error).message ||
          'Could not update notification preferences.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDueBadge = (reminder: Reminder) => {
    if (reminder.isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-700">
          {Math.abs(reminder.daysUntilDue)} days overdue
        </Badge>
      );
    }
    if (reminder.daysUntilDue <= 3) {
      return (
        <Badge className="bg-orange-100 text-orange-700">
          Due in {reminder.daysUntilDue} day{reminder.daysUntilDue !== 1 ? 's' : ''}
        </Badge>
      );
    }
    if (reminder.daysUntilDue <= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700">
          Due in {reminder.daysUntilDue} days
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700">
        Due in {reminder.daysUntilDue} days
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-600" />
            Payment Reminders
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Settings */}
        {showSettings && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-gray-900">Notification Preferences</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive reminders via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(value) => handlePreferenceUpdate('emailNotifications', value)}
                disabled={!preferences || updatePreferencesMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">SMS Notifications</p>
                <p className="text-xs text-gray-500">Receive reminders via SMS</p>
              </div>
              <Switch
                checked={smsNotifications}
                onCheckedChange={(value) => handlePreferenceUpdate('smsNotifications', value)}
                disabled={!preferences || updatePreferencesMutation.isPending}
              />
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">
              {isLoading || isError ? '\u2014' : overdueCount}
            </p>
            <p className="text-xs text-red-600">Overdue</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">
              {isLoading || isError ? '\u2014' : upcomingCount}
            </p>
            <p className="text-xs text-orange-600">Due This Week</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <CreditCard className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-600">
              {isLoading || isError ? '\u2014' : `\u20A6${(totalDue / 1000).toFixed(0)}K`}
            </p>
            <p className="text-xs text-emerald-600">Total Due</p>
          </div>
        </div>

        {/* Reminder List */}
        <div className="space-y-3">
          {isError && (
            <div className="text-sm text-red-600 text-center py-4">
              Failed to load payment reminders. Please refresh.
            </div>
          )}
          {isLoading && (
            <div className="text-sm text-gray-500 text-center py-6">
              Loading payment reminders...
            </div>
          )}
          {!isLoading && !isError && sortedReminders.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6">
              You have no upcoming payment reminders.
            </div>
          )}
          {!isLoading &&
            !isError &&
            sortedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md ${
                  reminder.isOverdue
                    ? 'bg-red-50 border-red-200'
                    : reminder.daysUntilDue <= 3
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    reminder.type === 'loan_repayment' 
                      ? 'bg-blue-100' 
                      : 'bg-purple-100'
                  }`}>
                    {reminder.type === 'loan_repayment' ? (
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Users className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{reminder.title}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(reminder.dueDate)}</span>
                      {reminder.groupName && (
                        <span className="text-purple-600">{`\u2022 ${reminder.groupName}`}</span>
                      )}
                      {reminder.loanName && (
                        <span className="text-blue-600">{`\u2022 ${reminder.loanName}`}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      {getDueBadge(reminder)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {`\u20A6${reminder.amount.toLocaleString()}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onPayNow(reminder)}
                    className={reminder.isOverdue 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                    }
                  >
                    Pay Now
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {/* Quick Pay All */}
        {overdueReminders.length > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Clear All Overdue Payments</h4>
                <p className="text-sm text-red-100">
                  Pay all {overdueReminders.length} overdue payment{overdueReminders.length !== 1 ? 's' : ''} at once
                </p>
              </div>
              <Button
                variant="secondary"
                className="bg-white text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (onPayBulk) {
                    onPayBulk(overdueReminders);
                    return;
                  }
                  if (overdueTypes.size === 1) {
                    const type = Array.from(overdueTypes)[0];
                    onPayNow({
                      id: 'bulk-overdue',
                      type,
                      title: 'Overdue Payments',
                      amount: overdueTotal,
                      dueDate: new Date().toISOString(),
                      isOverdue: true,
                      daysUntilDue: -1,
                    } as Reminder);
                  } else {
                    toast({
                      title: 'Multiple Payment Types',
                      description:
                        'Please pay each overdue item individually.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                {`Pay \u20A6${overdueTotal.toLocaleString()}`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
