import React, { useEffect, useState } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Save,
  CreditCard,
  Users,
  Calendar,
  Megaphone,
} from "lucide-react";

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  paymentReminders: boolean;
  groupUpdates: boolean;
  loanUpdates: boolean;
  meetingReminders: boolean;
  marketingEmails: boolean;
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => Promise<void> | void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onSave,
}) => {
  const [settings, setSettings] =
    useState<NotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(preferences);
    setHasChanges(false);
  }, [preferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await Promise.resolve(onSave(settings));
      setHasChanges(false);
    } catch {
      setHasChanges(true);
    }
  };

  const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void }> = ({
    enabled,
    onToggle,
  }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? "bg-emerald-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl">
        <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-900 text-lg">
          <Bell className="w-5 h-5 text-emerald-600" />
          Notification Channels
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-gray-500 text-sm">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.emailNotifications}
              onToggle={() => handleToggle("emailNotifications")}
            />
          </div>

          <div className="flex justify-between items-center py-3 border-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-green-100 rounded-lg w-10 h-10">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">SMS Notifications</p>
                <p className="text-gray-500 text-sm">
                  Receive notifications via SMS
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.smsNotifications}
              onToggle={() => handleToggle("smsNotifications")}
            />
          </div>

          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-gray-500 text-sm">
                  Receive push notifications on your device
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.pushNotifications}
              onToggle={() => handleToggle("pushNotifications")}
            />
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white p-6 border border-gray-200 rounded-xl">
        <h3 className="mb-4 font-semibold text-gray-900 text-lg">
          Notification Types
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Payment Reminders</p>
                <p className="text-gray-500 text-sm">
                  Reminders for upcoming contributions and loan payments
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.paymentReminders}
              onToggle={() => handleToggle("paymentReminders")}
            />
          </div>

          <div className="flex justify-between items-center py-3 border-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-indigo-100 rounded-lg w-10 h-10">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Group Updates</p>
                <p className="text-gray-500 text-sm">
                  Updates from your Contributions groups
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.groupUpdates}
              onToggle={() => handleToggle("groupUpdates")}
            />
          </div>

          <div className="flex justify-between items-center py-3 border-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-rose-100 rounded-lg w-10 h-10">
                <CreditCard className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Loan Updates</p>
                <p className="text-gray-500 text-sm">
                  Updates on loan applications and repayments
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.loanUpdates}
              onToggle={() => handleToggle("loanUpdates")}
            />
          </div>

          <div className="flex justify-between items-center py-3 border-gray-100 border-b">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-cyan-100 rounded-lg w-10 h-10">
                <Calendar className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Meeting Reminders</p>
                <p className="text-gray-500 text-sm">
                  Reminders for upcoming group meetings
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.meetingReminders}
              onToggle={() => handleToggle("meetingReminders")}
            />
          </div>

          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-gray-100 rounded-lg w-10 h-10">
                <Megaphone className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Marketing Emails</p>
                <p className="text-gray-500 text-sm">
                  Promotional content and newsletters
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.marketingEmails}
              onToggle={() => handleToggle("marketingEmails")}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 rounded-lg font-medium text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
