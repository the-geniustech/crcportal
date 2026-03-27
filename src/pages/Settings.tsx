import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import NotificationSettings from "@/components/profile/NotificationSettings";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useNotificationPreferencesQuery } from "@/hooks/profile/useNotificationPreferencesQuery";
import { useUpdateNotificationPreferencesMutation } from "@/hooks/profile/useUpdateNotificationPreferencesMutation";
import { useContributionSettingsQuery } from "@/hooks/profile/useContributionSettingsQuery";
import { useUpdateContributionSettingsMutation } from "@/hooks/profile/useUpdateContributionSettingsMutation";
import { useTwoFactorStatusQuery } from "@/hooks/auth/useTwoFactorStatusQuery";
import { useTwoFactorSetupMutation } from "@/hooks/auth/useTwoFactorSetupMutation";
import { useEnableTwoFactorMutation } from "@/hooks/auth/useEnableTwoFactorMutation";
import { useDisableTwoFactorMutation } from "@/hooks/auth/useDisableTwoFactorMutation";
import { useLoginHistoryQuery } from "@/hooks/auth/useLoginHistoryQuery";
import { useAccountDeletionStatusQuery } from "@/hooks/auth/useAccountDeletionStatusQuery";
import { useRequestAccountDeletionMutation } from "@/hooks/auth/useRequestAccountDeletionMutation";
import { useCancelAccountDeletionMutation } from "@/hooks/auth/useCancelAccountDeletionMutation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Shield, Coins } from "lucide-react";

const SettingsContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "notifications" | "security" | "contribution"
  >("notifications");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isTwoFactorSetupOpen, setIsTwoFactorSetupOpen] = useState(false);
  const [isTwoFactorDisableOpen, setIsTwoFactorDisableOpen] = useState(false);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isCancelDeletionOpen, setIsCancelDeletionOpen] = useState(false);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState("");
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelCode, setCancelCode] = useState("");
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    secret: string;
    otpauthUrl?: string | null;
    qrCodeDataUrl?: string | null;
  } | null>(null);
  const [contributionUnits, setContributionUnits] = useState("");
  const [contributionUnitsError, setContributionUnitsError] =
    useState<string | null>(null);

  const notificationPreferencesQuery = useNotificationPreferencesQuery();
  const updateNotificationPreferencesMutation =
    useUpdateNotificationPreferencesMutation();
  const contributionSettingsQuery = useContributionSettingsQuery();
  const updateContributionSettingsMutation =
    useUpdateContributionSettingsMutation();
  const twoFactorStatusQuery = useTwoFactorStatusQuery();
  const twoFactorSetupMutation = useTwoFactorSetupMutation();
  const enableTwoFactorMutation = useEnableTwoFactorMutation();
  const disableTwoFactorMutation = useDisableTwoFactorMutation();
  const loginHistoryQuery = useLoginHistoryQuery(
    { page: 1, limit: 20 },
    isLoginHistoryOpen,
  );
  const accountDeletionStatusQuery = useAccountDeletionStatusQuery();
  const requestDeletionMutation = useRequestAccountDeletionMutation();
  const cancelDeletionMutation = useCancelAccountDeletionMutation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!contributionSettingsQuery.data) return;
    const units = contributionSettingsQuery.data.units;
    setContributionUnits(units ? String(units) : "");
    setContributionUnitsError(null);
  }, [contributionSettingsQuery.data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const notificationPreferences =
    notificationPreferencesQuery.data ?? {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      paymentReminders: true,
      groupUpdates: true,
      loanUpdates: true,
      meetingReminders: true,
      marketingEmails: false,
    };

  const currentYear = new Date().getFullYear();
  const contributionSettings =
    contributionSettingsQuery.data ?? {
      year: currentYear,
      units: null,
      updatedAt: null,
      canEdit: true,
      window: { startMonth: 1, endMonth: 2 },
    };
  const contributionSettingsLoading =
    contributionSettingsQuery.isLoading || updateContributionSettingsMutation.isPending;

  const handleSaveNotifications = async (
    prefs: typeof notificationPreferences,
  ) => {
    try {
      await updateNotificationPreferencesMutation.mutateAsync(prefs);
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSaveContributionSettings = async () => {
    const unitsValue = Number(contributionUnits);
    if (!Number.isFinite(unitsValue)) {
      setContributionUnitsError("Enter a valid number of units.");
      return;
    }
    if (unitsValue < 5 || unitsValue % 5 !== 0) {
      setContributionUnitsError("Units must be at least 5 and in multiples of 5.");
      return;
    }
    if (!contributionSettings.canEdit) {
      toast({
        title: "Update Locked",
        description:
          "Contribution settings can only be updated between January and February.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateContributionSettingsMutation.mutateAsync({
        units: unitsValue,
        year: contributionSettings.year,
      });
      setContributionUnitsError(null);
      toast({
        title: "Contribution Settings Saved",
        description: `Your ${contributionSettings.year} contribution plan has been updated.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to update contribution settings.",
        variant: "destructive",
      });
    }
  };

  const twoFactorEnabled = Boolean(twoFactorStatusQuery.data?.enabled);
  const deletionStatus = accountDeletionStatusQuery.data;
  const scheduledDeletionLabel = deletionStatus?.scheduledFor
    ? new Date(deletionStatus.scheduledFor).toLocaleDateString()
    : "soon";

  const handleStartTwoFactorSetup = async () => {
    setIsTwoFactorSetupOpen(true);
    setTwoFactorSetupCode("");
    setTwoFactorSetupData(null);
    try {
      const data = await twoFactorSetupMutation.mutateAsync();
      setTwoFactorSetupData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start 2FA setup.";
      toast({
        title: "Setup Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEnableTwoFactor = async () => {
    try {
      await enableTwoFactorMutation.mutateAsync(twoFactorSetupCode);
      toast({
        title: "Two-Factor Enabled",
        description: "Two-factor authentication is now active.",
      });
      setIsTwoFactorSetupOpen(false);
      setTwoFactorSetupCode("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enable 2FA.";
      toast({
        title: "Enable Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      await disableTwoFactorMutation.mutateAsync({
        password: twoFactorDisablePassword,
        code: twoFactorDisableCode,
      });
      toast({
        title: "Two-Factor Disabled",
        description: "Two-factor authentication has been disabled.",
      });
      setIsTwoFactorDisableOpen(false);
      setTwoFactorDisablePassword("");
      setTwoFactorDisableCode("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to disable 2FA.";
      toast({
        title: "Disable Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRequestDeletion = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      toast({
        title: "Confirmation Required",
        description: "Type DELETE to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      await requestDeletionMutation.mutateAsync({
        password: deletePassword,
        code: deleteCode || undefined,
      });
      toast({
        title: "Deletion Scheduled",
        description:
          "Your account is scheduled for deletion. You can cancel before the deadline.",
      });
      setIsDeleteAccountOpen(false);
      setDeletePassword("");
      setDeleteCode("");
      setDeleteConfirm("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to schedule deletion.";
      toast({
        title: "Request Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelDeletionMutation.mutateAsync({
        password: cancelPassword,
        code: cancelCode || undefined,
      });
      toast({
        title: "Deletion Cancelled",
        description: "Your account deletion request has been cancelled.",
      });
      setIsCancelDeletionOpen(false);
      setCancelPassword("");
      setCancelCode("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel deletion.";
      toast({
        title: "Cancel Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const tabs = [
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "contribution" as const, label: "Contribution", icon: Coins },
    { id: "security" as const, label: "Security", icon: Shield },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 mb-8 p-6 rounded-2xl text-white">
          <div className="flex md:flex-row flex-col items-start md:items-center gap-4">
            <div className="flex-1">
              <h1 className="font-bold text-2xl">Settings</h1>
              <p className="text-emerald-100">
                Manage your notifications, security, and account preferences.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-emerald-100">
                <span className="bg-white/15 px-3 py-1 rounded-full">
                  {profile?.full_name || "Member"}
                </span>
                {user.email && (
                  <span className="bg-white/15 px-3 py-1 rounded-full">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white/15 px-4 py-2 rounded-xl text-sm">
              <p className="text-emerald-100">Account Status</p>
              <p className="font-semibold">Active</p>
            </div>
          </div>
        </div>

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

        <div className="space-y-6">
          {activeTab === "notifications" && (
            <NotificationSettings
              preferences={notificationPreferences}
              onSave={handleSaveNotifications}
            />
          )}

          {activeTab === "contribution" && (
            <div className="bg-white p-6 border border-gray-200 rounded-xl">
              <h3 className="flex items-center gap-2 mb-2 font-semibold text-gray-900 text-lg">
                <Coins className="w-5 h-5 text-emerald-600" />
                Contribution Settings
              </h3>
              <p className="text-gray-500 text-sm">
                Set your planned monthly contribution units for {contributionSettings.year}.
                Updates are expected within January and February.
              </p>

              <div className="gap-6 grid md:grid-cols-2 mt-6">
                <div>
                  <Label htmlFor="contribution-units">Planned Units</Label>
                  <Input
                    id="contribution-units"
                    type="number"
                    min={5}
                    step={5}
                    value={contributionUnits}
                    onChange={(event) => {
                      setContributionUnits(event.target.value);
                      setContributionUnitsError(null);
                    }}
                    disabled={contributionSettingsLoading || !contributionSettings.canEdit}
                    className="mt-2"
                    placeholder="e.g. 10"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Minimum 5 units, in multiples of 5.
                  </p>
                  {contributionUnitsError && (
                    <p className="mt-2 text-xs text-rose-600">
                      {contributionUnitsError}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Planning Window
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    Jan {contributionSettings.year} to Feb {contributionSettings.year}
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      contributionSettings.canEdit
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {contributionSettings.canEdit ? "Open for updates" : "Locked for the year"}
                  </p>
                  {contributionSettings.updatedAt && (
                    <p className="mt-2 text-xs text-gray-500">
                      Last updated{" "}
                      {new Date(contributionSettings.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end items-center gap-3 mt-6">
                <Button
                  onClick={handleSaveContributionSettings}
                  disabled={
                    contributionSettingsLoading || !contributionSettings.canEdit
                  }
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {contributionSettingsLoading ? "Saving..." : "Save Plan"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl">
                <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-900 text-lg">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Security Settings
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-4 border-gray-100 border-b">
                    <div>
                      <p className="font-medium text-gray-900">
                        Change Password
                      </p>
                      <p className="text-gray-500 text-sm">
                        Update your account password
                      </p>
                    </div>
                    <button
                      onClick={() => setIsChangePasswordOpen(true)}
                      className="hover:bg-emerald-50 px-4 py-2 rounded-lg font-medium text-emerald-600 transition-colors"
                    >
                      Update
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-4 border-gray-100 border-b">
                    <div>
                      <p className="font-medium text-gray-900">
                        Two-Factor Authentication
                      </p>
                      <p className="text-gray-500 text-sm">
                        {twoFactorEnabled
                          ? "Your account is protected with 2FA"
                          : "Add an extra layer of security"}
                      </p>
                    </div>
                    {twoFactorEnabled ? (
                      <button
                        onClick={() => setIsTwoFactorDisableOpen(true)}
                        className="hover:bg-emerald-50 px-4 py-2 rounded-lg font-medium text-emerald-600 transition-colors"
                      >
                        Manage
                      </button>
                    ) : (
                      <button
                        onClick={handleStartTwoFactorSetup}
                        disabled={twoFactorSetupMutation.isPending}
                        className="hover:bg-emerald-50 px-4 py-2 rounded-lg font-medium text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Enable
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-center py-4 border-gray-100 border-b">
                    <div>
                      <p className="font-medium text-gray-900">Login History</p>
                      <p className="text-gray-500 text-sm">
                        View recent login activity
                      </p>
                    </div>
                    <button
                      onClick={() => setIsLoginHistoryOpen(true)}
                      className="hover:bg-emerald-50 px-4 py-2 rounded-lg font-medium text-emerald-600 transition-colors"
                    >
                      View
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-4">
                    <div>
                      <p className="font-medium text-red-600">Delete Account</p>
                      <p className="text-gray-500 text-sm">
                        {deletionStatus?.isPending
                          ? `Deletion scheduled for ${scheduledDeletionLabel}`
                          : "Permanently delete your account and data"}
                      </p>
                    </div>
                    {deletionStatus?.isPending ? (
                      <button
                        onClick={() => setIsCancelDeletionOpen(true)}
                        className="hover:bg-emerald-50 px-4 py-2 rounded-lg font-medium text-emerald-600 transition-colors"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsDeleteAccountOpen(true)}
                        className="hover:bg-red-50 px-4 py-2 rounded-lg font-medium text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <ChangePasswordDialog
          open={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        />

        {/* Two-Factor Setup Modal */}
        <Dialog
          open={isTwoFactorSetupOpen}
          onOpenChange={(next) => {
            setIsTwoFactorSetupOpen(next);
            if (!next) {
              setTwoFactorSetupCode("");
              setTwoFactorSetupData(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with Google Authenticator or Authy, then enter
                the 6-digit code to confirm.
              </DialogDescription>
            </DialogHeader>

            {twoFactorSetupMutation.isPending && !twoFactorSetupData ? (
              <div className="text-sm text-gray-500">Preparing 2FA setup…</div>
            ) : (
              <div className="space-y-4">
                {twoFactorSetupData?.qrCodeDataUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={twoFactorSetupData.qrCodeDataUrl}
                      alt="2FA QR code"
                      className="border border-gray-200 rounded-lg w-40 h-40"
                    />
                  </div>
                ) : null}

                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                  Manual code:{" "}
                  <span className="font-semibold text-gray-900">
                    {twoFactorSetupData?.secret || "—"}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">Authenticator code</Label>
                  <Input
                    id="twoFactorCode"
                    placeholder="123456"
                    value={twoFactorSetupCode}
                    onChange={(e) => setTwoFactorSetupCode(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTwoFactorSetupOpen(false)}
                disabled={twoFactorSetupMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEnableTwoFactor}
                disabled={
                  enableTwoFactorMutation.isPending ||
                  !twoFactorSetupCode.trim()
                }
              >
                {enableTwoFactorMutation.isPending ? "Enabling..." : "Enable"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Two-Factor Disable Modal */}
        <Dialog
          open={isTwoFactorDisableOpen}
          onOpenChange={(next) => {
            setIsTwoFactorDisableOpen(next);
            if (!next) {
              setTwoFactorDisablePassword("");
              setTwoFactorDisableCode("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Confirm your password and 2FA code to disable protection.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFactorDisablePassword">Password</Label>
                <Input
                  id="twoFactorDisablePassword"
                  type="password"
                  value={twoFactorDisablePassword}
                  onChange={(e) => setTwoFactorDisablePassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twoFactorDisableCode">2FA Code</Label>
                <Input
                  id="twoFactorDisableCode"
                  placeholder="123456"
                  value={twoFactorDisableCode}
                  onChange={(e) => setTwoFactorDisableCode(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTwoFactorDisableOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDisableTwoFactor}
                disabled={
                  disableTwoFactorMutation.isPending ||
                  !twoFactorDisablePassword ||
                  !twoFactorDisableCode
                }
              >
                {disableTwoFactorMutation.isPending
                  ? "Disabling..."
                  : "Disable"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Login History Modal */}
        <Dialog
          open={isLoginHistoryOpen}
          onOpenChange={(next) => setIsLoginHistoryOpen(next)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login History</DialogTitle>
              <DialogDescription>
                Recent sign-ins to your account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {loginHistoryQuery.isLoading && (
                <p className="text-sm text-gray-500">Loading history…</p>
              )}
              {loginHistoryQuery.isError && (
                <p className="text-sm text-red-500">
                  Unable to load login history. Please try again.
                </p>
              )}
              {!loginHistoryQuery.isLoading &&
                (loginHistoryQuery.data?.history ?? []).map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-gray-900 capitalize">
                        {item.method.replace("_", " ")}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      IP: {item.ip || "Unknown"} •{" "}
                      {item.userAgent || "Unknown device"}
                    </p>
                  </div>
                ))}

              {!loginHistoryQuery.isLoading &&
                (loginHistoryQuery.data?.history ?? []).length === 0 && (
                  <p className="text-sm text-gray-500">
                    No login history available yet.
                  </p>
                )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLoginHistoryOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Account Deletion Modal */}
        <Dialog
          open={isDeleteAccountOpen}
          onOpenChange={(next) => {
            setIsDeleteAccountOpen(next);
            if (!next) {
              setDeletePassword("");
              setDeleteCode("");
              setDeleteConfirm("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This action is irreversible. Your account will be scheduled for
                deletion with a short recovery window.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                <ul className="list-disc ml-5 space-y-1">
                  <li>Your data will be queued for deletion.</li>
                  <li>You can cancel before the scheduled date.</li>
                  <li>After that, recovery requires support.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deletePassword">Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>

              {twoFactorEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="deleteCode">2FA Code</Label>
                  <Input
                    id="deleteCode"
                    placeholder="123456"
                    value={deleteCode}
                    onChange={(e) => setDeleteCode(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deleteConfirm">
                  Type <span className="font-semibold">DELETE</span> to confirm
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteAccountOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRequestDeletion}
                disabled={
                  requestDeletionMutation.isPending ||
                  !deletePassword ||
                  (twoFactorEnabled && !deleteCode)
                }
              >
                {requestDeletionMutation.isPending
                  ? "Scheduling..."
                  : "Schedule Deletion"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Deletion Modal */}
        <Dialog
          open={isCancelDeletionOpen}
          onOpenChange={(next) => {
            setIsCancelDeletionOpen(next);
            if (!next) {
              setCancelPassword("");
              setCancelCode("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Account Deletion</DialogTitle>
              <DialogDescription>
                Confirm your password to keep your account active.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancelPassword">Password</Label>
                <Input
                  id="cancelPassword"
                  type="password"
                  value={cancelPassword}
                  onChange={(e) => setCancelPassword(e.target.value)}
                />
              </div>

              {twoFactorEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="cancelCode">2FA Code</Label>
                  <Input
                    id="cancelCode"
                    placeholder="123456"
                    value={cancelCode}
                    onChange={(e) => setCancelCode(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelDeletionOpen(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleCancelDeletion}
                disabled={
                  cancelDeletionMutation.isPending ||
                  !cancelPassword ||
                  (twoFactorEnabled && !cancelCode)
                }
              >
                {cancelDeletionMutation.isPending
                  ? "Cancelling..."
                  : "Cancel Deletion"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

const Settings: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsContent />
    </AuthProvider>
  );
};

export default Settings;
