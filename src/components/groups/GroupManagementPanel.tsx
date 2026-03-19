import React, { useMemo, useState, useEffect } from "react";
import {
  Plus,
  UserPlus,
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  Vote,
  Bell,
  Clock,
  MapPin,
  Video,
  FileText,
} from "lucide-react";
import { useForm } from "react-hook-form";

import ContributionTracker from "@/components/groups/ContributionTracker";
import { useToast } from "@/hooks/use-toast";
import { useGroupVotesQuery } from "@/hooks/groups/useGroupVotesQuery";
import { useGroupReminderSettingsQuery } from "@/hooks/groups/useGroupReminderSettingsQuery";
import { useUpdateGroupReminderSettingsMutation } from "@/hooks/groups/useUpdateGroupReminderSettingsMutation";
import { useSendGroupReminderMutation } from "@/hooks/groups/useSendGroupReminderMutation";
import { useGroupLoansQuery } from "@/hooks/groups/useGroupLoansQuery";
import { useCreateGroupVoteMutation } from "@/hooks/groups/useCreateGroupVoteMutation";
import { useCreateGroupMeetingMutation } from "@/hooks/groups/useCreateGroupMeetingMutation";
import { useUpdateGroupMeetingMutation } from "@/hooks/groups/useUpdateGroupMeetingMutation";

export type GroupManagementSummary = {
  id: string;
  name: string;
  monthlyContribution: number;
  memberCount: number;
  totalSavings: number;
};

export type GroupManagementMember = {
  id: string;
  name: string;
  avatar: string;
};

export type GroupManagementContribution = {
  memberId: string;
  month: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  paidDate?: string;
};

export type GroupManagementMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  isVirtual: boolean;
  meetingType?: "physical" | "zoom" | "google_meet";
  scheduledDate?: string;
  durationMinutes?: number;
  description?: string;
  status?: "scheduled" | "completed" | "cancelled";
  meetingLink?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
};

type GroupManagementPanelProps = {
  open: boolean;
  group: GroupManagementSummary | null;
  members: GroupManagementMember[];
  contributions: GroupManagementContribution[];
  meetings: GroupManagementMeeting[];
  membersLoading?: boolean;
  contributionsLoading?: boolean;
  meetingsLoading?: boolean;
  onClose: () => void;
  onInviteMembers: () => void;
};

const DEFAULT_REMINDER_SETTINGS = {
  autoReminders: true,
  daysBeforeDue: 3,
  overdueReminders: true,
  meetingReminders: true,
};

type MeetingFormValues = {
  title: string;
  description: string;
  meetingType: "physical" | "zoom" | "google_meet";
  location: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
};

type VoteFormValues = {
  title: string;
  description: string;
  endsAt: string;
};

const GroupManagementPanel: React.FC<GroupManagementPanelProps> = ({
  open,
  group,
  members,
  contributions,
  meetings,
  membersLoading,
  contributionsLoading,
  meetingsLoading,
  onClose,
  onInviteMembers,
}) => {
  const { toast } = useToast();
  const [managementTab, setManagementTab] = useState<
    "contributions" | "reports" | "meetings" | "votes" | "reminders"
  >("contributions");
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingModalMode, setMeetingModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [activeMeeting, setActiveMeeting] =
    useState<GroupManagementMeeting | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [cancelingMeetingId, setCancelingMeetingId] = useState<string | null>(
    null,
  );

  const groupId = group?.id;
  const votesQuery = useGroupVotesQuery(groupId);
  const reminderSettingsQuery = useGroupReminderSettingsQuery(groupId);
  const updateReminderSettingsMutation =
    useUpdateGroupReminderSettingsMutation();
  const sendReminderMutation = useSendGroupReminderMutation();
  const groupLoansQuery = useGroupLoansQuery(groupId);
  const createVoteMutation = useCreateGroupVoteMutation(groupId);
  const createMeetingMutation = useCreateGroupMeetingMutation(groupId);
  const updateMeetingMutation = useUpdateGroupMeetingMutation(groupId);

  const formatCurrency = (value: number) => {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `₦${amount.toLocaleString()}`;
  };

  const nowInfo = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return {
      year: now.getFullYear(),
      month,
      key: `${now.getFullYear()}-${String(month).padStart(2, "0")}`,
    };
  }, []);

  const monthlyExpected =
    Number(group?.monthlyContribution || 0) * Number(group?.memberCount || 0);
  const trendMonths = useMemo(() => {
    const base = new Date(nowInfo.year, nowInfo.month - 1, 1);
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    return months;
  }, [nowInfo.month, nowInfo.year]);

  const paidByMonth = useMemo(() => {
    const map = new Map<string, number>();
    contributions.forEach((c) => {
      if (c.status !== "paid") return;
      const total = map.get(c.month) ?? 0;
      map.set(c.month, total + Number(c.amount || 0));
    });
    return map;
  }, [contributions]);

  const trendData = trendMonths.map((month) => {
    const collected = paidByMonth.get(month.key) ?? 0;
    const ratio = monthlyExpected > 0 ? collected / monthlyExpected : 0;
    return {
      ...month,
      collected,
      ratio: Math.min(1, Math.max(0, ratio)),
    };
  });

  const loans = groupLoansQuery.data ?? [];
  const activeLoans = useMemo(
    () =>
      loans.filter((loan) =>
        ["disbursed", "defaulted"].includes(String(loan.status)),
      ),
    [loans],
  );
  const activeLoanAmount = useMemo(
    () =>
      activeLoans.reduce(
        (sum, loan) =>
          sum +
          Number(
            loan.remainingBalance ??
              loan.approvedAmount ??
              loan.loanAmount ??
              0,
          ),
        0,
      ),
    [activeLoans],
  );

  const reminderSettings =
    reminderSettingsQuery.data ?? DEFAULT_REMINDER_SETTINGS;
  const remindersBusy =
    reminderSettingsQuery.isLoading || updateReminderSettingsMutation.isPending;

  const meetingForm = useForm<MeetingFormValues>({
    defaultValues: {
      title: "",
      description: "",
      meetingType: "physical",
      location: "",
      scheduledDate: "",
      scheduledTime: "",
      durationMinutes: 60,
    },
  });

  const voteForm = useForm<VoteFormValues>({
    defaultValues: {
      title: "",
      description: "",
      endsAt: "",
    },
  });

  useEffect(() => {
    if (!showMeetingModal) return;
    if (meetingModalMode === "edit" && activeMeeting) {
      const dateObj = activeMeeting.scheduledDate
        ? new Date(activeMeeting.scheduledDate)
        : null;
      const pad = (value: number) => String(value).padStart(2, "0");
      const scheduledDate = dateObj
        ? `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(
            dateObj.getDate(),
          )}`
        : "";
      const scheduledTime = dateObj
        ? `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`
        : "";

      meetingForm.reset({
        title: activeMeeting.title,
        description: activeMeeting.description ?? "",
        meetingType: activeMeeting.meetingType ?? "physical",
        location: activeMeeting.location ?? "",
        scheduledDate,
        scheduledTime,
        durationMinutes: Number(activeMeeting.durationMinutes ?? 60),
      });
    } else {
      meetingForm.reset({
        title: "",
        description: "",
        meetingType: "physical",
        location: "",
        scheduledDate: "",
        scheduledTime: "",
        durationMinutes: 60,
      });
    }
  }, [activeMeeting, meetingForm, meetingModalMode, showMeetingModal]);

  useEffect(() => {
    if (showVoteModal) {
      voteForm.reset({ title: "", description: "", endsAt: "" });
    }
  }, [showVoteModal, voteForm]);

  const handleUpdateReminder = async (
    updates: Partial<typeof DEFAULT_REMINDER_SETTINGS>,
  ) => {
    if (!groupId) return;
    try {
      await updateReminderSettingsMutation.mutateAsync({ groupId, updates });
      toast({ title: "Reminder settings updated" });
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Unable to update settings",
        variant: "destructive",
      });
    }
  };

  const handleSendReminders = async () => {
    if (!groupId) return;
    try {
      const result = await sendReminderMutation.mutateAsync({
        groupId,
        payload: { year: nowInfo.year, month: nowInfo.month },
      });
      toast({
        title: "Reminders sent",
        description: `Sent to ${result.sent} member(s)`,
      });
    } catch (error: unknown) {
      toast({
        title: "Failed to send reminders",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const openCreateMeetingModal = () => {
    setMeetingModalMode("create");
    setActiveMeeting(null);
    setShowMeetingModal(true);
  };

  const openEditMeetingModal = (meetingItem: GroupManagementMeeting) => {
    setMeetingModalMode("edit");
    setActiveMeeting(meetingItem);
    setShowMeetingModal(true);
  };

  const handleSubmitMeeting = meetingForm.handleSubmit(async (values) => {
    if (!groupId) return;

    const scheduledDate = values.scheduledDate
      ? `${values.scheduledDate}T${values.scheduledTime || "00:00"}:00`
      : "";

    const payload: {
      title: string;
      description: string;
      meetingType: "physical" | "zoom" | "google_meet";
      location: string | null;
      scheduledDate: string;
      durationMinutes: number;
      status?: "scheduled";
    } = {
      title: values.title.trim(),
      description: values.description?.trim() || "",
      meetingType: values.meetingType,
      location:
        values.meetingType === "physical" ? values.location?.trim() || "" : null,
      scheduledDate,
      durationMinutes: Number(values.durationMinutes || 60),
    };

    if (meetingModalMode !== "edit") {
      payload.status = "scheduled";
    }

    try {
      if (meetingModalMode === "edit" && activeMeeting?.id) {
        await updateMeetingMutation.mutateAsync({
          meetingId: activeMeeting.id,
          updates: payload,
        });
        toast({ title: "Meeting updated" });
      } else {
        await createMeetingMutation.mutateAsync(payload);
        toast({ title: "Meeting scheduled" });
      }
      setShowMeetingModal(false);
    } catch (error: unknown) {
      toast({
        title: "Meeting update failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleCancelMeeting = async (meetingId: string) => {
    if (!groupId) return;
    const confirmed = window.confirm("Cancel this meeting?");
    if (!confirmed) return;

    setCancelingMeetingId(meetingId);
    try {
      await updateMeetingMutation.mutateAsync({
        meetingId,
        updates: { status: "cancelled" },
      });
      toast({ title: "Meeting cancelled" });
    } catch (error: unknown) {
      toast({
        title: "Unable to cancel meeting",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setCancelingMeetingId(null);
    }
  };

  const handleCreateVote = voteForm.handleSubmit(async (values) => {
    if (!groupId) return;
    try {
      const endsAt = values.endsAt
        ? new Date(`${values.endsAt}T23:59:59`).toISOString()
        : null;
      await createVoteMutation.mutateAsync({
        title: values.title.trim(),
        description: values.description?.trim() || "",
        endsAt,
        status: "active",
      });
      toast({ title: "Vote created" });
      setShowVoteModal(false);
    } catch (error: unknown) {
      toast({
        title: "Vote creation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  if (!open || !group) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex flex-col bg-white shadow-xl rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="top-0 sticky flex justify-between items-center bg-white px-6 py-4 border-gray-200 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-xl">
              Group Management
            </h2>
            <p className="text-gray-500 text-sm">{group.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onInviteMembers}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Members
            </button>
            <button
              onClick={onClose}
              className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Management Tabs */}
        <div className="px-6 border-gray-200 border-b">
          <div className="flex gap-1 overflow-x-auto">
            {[
              {
                id: "contributions" as const,
                label: "Contributions",
                icon: TrendingUp,
              },
              {
                id: "reports" as const,
                label: "Financial Reports",
                icon: BarChart3,
              },
              {
                id: "meetings" as const,
                label: "Meetings",
                icon: Calendar,
              },
              { id: "votes" as const, label: "Voting", icon: Vote },
              { id: "reminders" as const, label: "Reminders", icon: Bell },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setManagementTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  managementTab === tab.id
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {managementTab === "contributions" && (
            <>
              {membersLoading || contributionsLoading ? (
                <div className="py-12 text-gray-500 text-center">
                  Loading contributions...
                </div>
              ) : (
                <ContributionTracker
                  members={members}
                  contributions={contributions}
                  monthlyAmount={group.monthlyContribution}
                  groupName={group.name}
                  groupId={group.id}
                />
              )}
            </>
          )}

          {managementTab === "reports" && (
            <div className="space-y-6">
              <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl text-white">
                  <p className="text-emerald-100 text-sm">Total Savings</p>
                  <p className="mt-1 font-bold text-3xl">
                    {formatCurrency(group.totalSavings)}
                  </p>
                  <p className="mt-2 text-emerald-100 text-sm">
                    Updated from live contributions
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                  <p className="text-blue-100 text-sm">Active Loans</p>
                  <p className="mt-1 font-bold text-3xl">
                    {formatCurrency(activeLoanAmount)}
                  </p>
                  <p className="mt-2 text-blue-100 text-sm">
                    {activeLoans.length} active loans
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                  <p className="text-purple-100 text-sm">Monthly Collection</p>
                  <p className="mt-1 font-bold text-3xl">
                    {formatCurrency(monthlyExpected)}
                  </p>
                  <p className="mt-2 text-purple-100 text-sm">
                    Expected this month
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Monthly Savings Trend
                </h3>
                <div className="flex items-end gap-2 h-64">
                  {trendData.map((value) => (
                    <div
                      key={value.key}
                      className="flex flex-col flex-1 items-center gap-2"
                    >
                      <div
                        className="bg-emerald-500 hover:bg-emerald-600 rounded-t-lg w-full transition-all"
                        style={{ height: `${value.ratio * 200}px` }}
                        title={formatCurrency(value.collected)}
                      />
                      <span className="text-gray-500 text-xs">
                        {value.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex flex-1 justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-3 rounded-lg text-white transition-colors">
                  <FileText className="w-4 h-4" />
                  Download Full Report
                </button>
                <button className="flex flex-1 justify-center items-center gap-2 hover:bg-gray-50 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </button>
              </div>
            </div>
          )}

          {managementTab === "meetings" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  Scheduled Meetings
                </h3>
                <button
                  onClick={openCreateMeetingModal}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Schedule Meeting
                </button>
              </div>

              {meetingsLoading ? (
                <div className="py-10 text-gray-500 text-center">
                  Loading meetings...
                </div>
              ) : meetings.length === 0 ? (
                <div className="py-10 text-gray-500 text-center">
                  No meetings scheduled yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="bg-white p-4 border border-gray-200 rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                          <div className="flex justify-center items-center bg-emerald-100 rounded-xl w-12 h-12">
                            {meeting.isVirtual ? (
                              <Video className="w-6 h-6 text-emerald-600" />
                            ) : (
                              <MapPin className="w-6 h-6 text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {meeting.title}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-gray-500 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {meeting.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {meeting.time}
                              </span>
                            </div>
                            <p className="mt-1 text-gray-500 text-sm">
                              {meeting.location}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditMeetingModal(meeting)}
                            className="hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600 text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelMeeting(meeting.id)}
                            disabled={cancelingMeetingId === meeting.id}
                            className="hover:bg-red-50 disabled:opacity-60 px-3 py-1.5 rounded-lg text-red-600 text-sm transition-colors"
                          >
                            {cancelingMeetingId === meeting.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {managementTab === "votes" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Group Votes</h3>
                <button
                  onClick={() => setShowVoteModal(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Vote
                </button>
              </div>

              {votesQuery.isLoading ? (
                <div className="py-10 text-gray-500 text-center">
                  Loading votes...
                </div>
              ) : (votesQuery.data ?? []).length === 0 ? (
                <div className="py-10 text-gray-500 text-center">
                  No votes created yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {(votesQuery.data ?? []).map((vote) => {
                    const totalVoters =
                      Number(vote.totalVoters ?? 0) || group.memberCount;
                    const yesVotes = Number(vote.yesVotes ?? 0);
                    const noVotes = Number(vote.noVotes ?? 0);
                    const yesPct =
                      totalVoters > 0 ? (yesVotes / totalVoters) * 100 : 0;
                    const noPct =
                      totalVoters > 0 ? (noVotes / totalVoters) * 100 : 0;

                    return (
                      <div
                        key={vote._id}
                        className="bg-white p-4 border border-gray-200 rounded-xl"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                {vote.title}
                              </h4>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  vote.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {vote.status}
                              </span>
                            </div>
                            <p className="mt-1 text-gray-500 text-sm">
                              {vote.description}
                            </p>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {vote.endsAt
                              ? `Ends: ${String(vote.endsAt).slice(0, 10)}`
                              : "No end date"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Yes</span>
                            <span className="font-medium text-gray-900">
                              {yesVotes} votes
                            </span>
                          </div>
                          <div className="bg-gray-200 rounded-full w-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 rounded-full h-full"
                              style={{ width: `${yesPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">No</span>
                            <span className="font-medium text-gray-900">
                              {noVotes} votes
                            </span>
                          </div>
                          <div className="bg-gray-200 rounded-full w-full h-2 overflow-hidden">
                            <div
                              className="bg-red-500 rounded-full h-full"
                              style={{ width: `${noPct}%` }}
                            />
                          </div>
                        </div>

                        <p className="mt-3 text-gray-500 text-sm">
                          {yesVotes + noVotes} of {totalVoters} members voted
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {managementTab === "reminders" && (
            <div className="space-y-6">
              <div className="bg-white p-6 border border-gray-200 rounded-xl">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Contribution Reminder Settings
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-gray-100 border-b">
                    <div>
                      <p className="font-medium text-gray-900">
                        Automatic Reminders
                      </p>
                      <p className="text-gray-500 text-sm">
                        Send reminders before contribution due date
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={remindersBusy}
                      onClick={() =>
                        handleUpdateReminder({
                          autoReminders: !reminderSettings.autoReminders,
                        })
                      }
                      className={`relative rounded-full w-12 h-6 transition-colors ${
                        reminderSettings.autoReminders
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      } ${remindersBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`top-1 absolute bg-white rounded-full w-4 h-4 transition-all ${
                          reminderSettings.autoReminders ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3 border-gray-100 border-b">
                    <div>
                      <p className="font-medium text-gray-900">
                        Days Before Due Date
                      </p>
                      <p className="text-gray-500 text-sm">
                        When to send the first reminder
                      </p>
                    </div>
                    <select
                      value={String(reminderSettings.daysBeforeDue ?? 3)}
                      disabled={remindersBusy}
                      onChange={(e) =>
                        handleUpdateReminder({
                          daysBeforeDue: Number(e.target.value),
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="3">3 days</option>
                      <option value="5">5 days</option>
                      <option value="7">7 days</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center py-3 border-gray-100 border-b">
                    <div>
                      <p className="font-medium text-gray-900">
                        Overdue Reminders
                      </p>
                      <p className="text-gray-500 text-sm">
                        Send reminders for overdue contributions
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={remindersBusy}
                      onClick={() =>
                        handleUpdateReminder({
                          overdueReminders: !reminderSettings.overdueReminders,
                        })
                      }
                      className={`relative rounded-full w-12 h-6 transition-colors ${
                        reminderSettings.overdueReminders
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      } ${remindersBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`top-1 absolute bg-white rounded-full w-4 h-4 transition-all ${
                          reminderSettings.overdueReminders
                            ? "right-1"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        Meeting Reminders
                      </p>
                      <p className="text-gray-500 text-sm">
                        Remind members about upcoming meetings
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={remindersBusy}
                      onClick={() =>
                        handleUpdateReminder({
                          meetingReminders: !reminderSettings.meetingReminders,
                        })
                      }
                      className={`relative rounded-full w-12 h-6 transition-colors ${
                        reminderSettings.meetingReminders
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      } ${remindersBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`top-1 absolute bg-white rounded-full w-4 h-4 transition-all ${
                          reminderSettings.meetingReminders
                            ? "right-1"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <button
                disabled={sendReminderMutation.isPending}
                onClick={handleSendReminders}
                className="flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 px-4 py-3 rounded-lg w-full text-white transition-colors"
              >
                <Bell className="w-4 h-4" />
                {sendReminderMutation.isPending
                  ? "Sending reminders..."
                  : "Send Reminder Now"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showMeetingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMeetingModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {meetingModalMode === "edit" ? "Edit Meeting" : "Schedule Meeting"}
                </h3>
                <p className="text-sm text-gray-500">{group.name}</p>
              </div>
              <button
                onClick={() => setShowMeetingModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitMeeting} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  {...meetingForm.register("title", { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Monthly contribution meeting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...meetingForm.register("description")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Meeting agenda summary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Type
                </label>
                <select
                  {...meetingForm.register("meetingType")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="physical">Physical</option>
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                </select>
              </div>

              {meetingForm.watch("meetingType") === "physical" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    {...meetingForm.register("location")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Meeting venue"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    {...meetingForm.register("scheduledDate", { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    {...meetingForm.register("scheduledTime", { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  {...meetingForm.register("durationMinutes", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createMeetingMutation.isPending ||
                    updateMeetingMutation.isPending ||
                    !meetingForm.watch("title") ||
                    !meetingForm.watch("scheduledDate") ||
                    !meetingForm.watch("scheduledTime")
                  }
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {createMeetingMutation.isPending || updateMeetingMutation.isPending
                    ? "Saving..."
                    : meetingModalMode === "edit"
                      ? "Update Meeting"
                      : "Schedule Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVoteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">Create Vote</h3>
                <p className="text-sm text-gray-500">{group.name}</p>
              </div>
              <button
                onClick={() => setShowVoteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateVote} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  {...voteForm.register("title", { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="New group proposal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...voteForm.register("description")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Provide details for the vote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  {...voteForm.register("endsAt")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoteModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVoteMutation.isPending || !voteForm.watch("title")}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {createVoteMutation.isPending ? "Creating..." : "Create Vote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagementPanel;
