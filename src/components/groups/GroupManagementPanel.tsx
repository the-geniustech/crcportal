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
  MoreHorizontal,
} from "lucide-react";
import { useForm } from "react-hook-form";

import ContributionTracker from "@/components/groups/ContributionTracker";
import {
  ContributionTypeConfig,
  ContributionTypeOptions,
  CONTRIBUTION_UNIT_BASE,
  normalizeContributionType,
  type ContributionTypeCanonical,
} from "@/lib/contributionPolicy";
import { hasUserRole } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGroupVotesQuery } from "@/hooks/groups/useGroupVotesQuery";
import { useGroupVoteParticipantsQuery } from "@/hooks/groups/useGroupVoteParticipantsQuery";
import { useNotifyGroupVoteMembersMutation } from "@/hooks/groups/useNotifyGroupVoteMembersMutation";
import { useRespondGroupVoteMutation } from "@/hooks/groups/useRespondGroupVoteMutation";
import { useDeleteGroupVoteMutation } from "@/hooks/groups/useDeleteGroupVoteMutation";
import { useGroupReminderSettingsQuery } from "@/hooks/groups/useGroupReminderSettingsQuery";
import { useUpdateGroupReminderSettingsMutation } from "@/hooks/groups/useUpdateGroupReminderSettingsMutation";
import { useSendGroupReminderMutation } from "@/hooks/groups/useSendGroupReminderMutation";
import {
  type BackendGroupVote,
  type BackendVoteNotificationResult,
  downloadGroupContributionLedgerPdf,
  downloadGroupContributionReportPdf,
} from "@/lib/groups";
import { useGroupLoansQuery } from "@/hooks/groups/useGroupLoansQuery";
import { useCreateGroupVoteMutation } from "@/hooks/groups/useCreateGroupVoteMutation";
import { useCreateGroupMeetingMutation } from "@/hooks/groups/useCreateGroupMeetingMutation";
import { useUpdateGroupMeetingMutation } from "@/hooks/groups/useUpdateGroupMeetingMutation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  USER_ROLE,
  GROUP_ROLE,
  ELEVATED_GROUP_ROLES,
  type GroupRole,
} from "@/lib/roles";

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
  memberSerial?: string | null;
  contributionSettings?: {
    year?: number;
    units?: unknown;
  } | null;
};

export type GroupManagementContribution = {
  memberId: string;
  month: number;
  year: number;
  amount: number;
  status: "pending" | "completed" | "verified" | "overdue";
  paidDate?: string;
  contributionType?: string | null;
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
  currentMemberRole?: GroupRole | null;
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
  currentMemberRole,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [managementTab, setManagementTab] = useState<
    "contributions" | "reports" | "meetings" | "votes" | "reminders"
  >("contributions");
  const [selectedContributionType, setSelectedContributionType] =
    useState<ContributionTypeCanonical>("revolving");
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingModalMode, setMeetingModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [activeMeeting, setActiveMeeting] =
    useState<GroupManagementMeeting | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [activeVote, setActiveVote] = useState<BackendGroupVote | null>(null);
  const [showVoteActionModal, setShowVoteActionModal] = useState(false);
  const [showVoteParticipantsModal, setShowVoteParticipantsModal] =
    useState(false);
  const [showVoteNotifyModal, setShowVoteNotifyModal] = useState(false);
  const [voteChoice, setVoteChoice] = useState<"yes" | "no">("yes");
  const [voteNotifyTarget, setVoteNotifyTarget] = useState<"pending" | "all">(
    "pending",
  );
  const [voteParticipantsFilter, setVoteParticipantsFilter] = useState<
    "all" | "voted" | "pending" | "yes" | "no"
  >("all");
  const [voteNotifyChannels, setVoteNotifyChannels] = useState({
    email: true,
    sms: false,
    notification: true,
  });
  const [voteNotifyResult, setVoteNotifyResult] =
    useState<BackendVoteNotificationResult | null>(null);
  const [deletingVoteId, setDeletingVoteId] = useState<string | null>(null);
  const [cancelingMeetingId, setCancelingMeetingId] = useState<string | null>(
    null,
  );
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isDownloadingLedger, setIsDownloadingLedger] = useState(false);

  const groupId = group?.id;
  const votesQuery = useGroupVotesQuery(groupId);
  const reminderSettingsQuery = useGroupReminderSettingsQuery(groupId);
  const updateReminderSettingsMutation =
    useUpdateGroupReminderSettingsMutation();
  const sendReminderMutation = useSendGroupReminderMutation();
  const groupLoansQuery = useGroupLoansQuery(groupId);
  const createVoteMutation = useCreateGroupVoteMutation(groupId);
  const respondVoteMutation = useRespondGroupVoteMutation(groupId);
  const deleteVoteMutation = useDeleteGroupVoteMutation(groupId);
  const notifyVoteMutation = useNotifyGroupVoteMembersMutation(groupId);
  const createMeetingMutation = useCreateGroupMeetingMutation(groupId);
  const updateMeetingMutation = useUpdateGroupMeetingMutation(groupId);
  const voteParticipantsQuery = useGroupVoteParticipantsQuery(
    groupId,
    activeVote?._id,
    showVoteParticipantsModal,
  );

  const canManageVotes = hasUserRole(
    user,
    USER_ROLE.ADMIN,
    USER_ROLE.GROUP_COORDINATOR,
  );

  const normalizedMemberRole = currentMemberRole ?? null;
  const hasElevatedMembership = normalizedMemberRole
    ? ELEVATED_GROUP_ROLES.includes(normalizedMemberRole)
    : false;
  const canViewAll =
    hasUserRole(user, USER_ROLE.ADMIN, USER_ROLE.GROUP_COORDINATOR) ||
    hasElevatedMembership;
  const canManageReminderSettings =
    hasUserRole(user, USER_ROLE.ADMIN, USER_ROLE.GROUP_COORDINATOR) ||
    (normalizedMemberRole
      ? [GROUP_ROLE.COORDINATOR, GROUP_ROLE.ADMIN].includes(
          normalizedMemberRole,
        )
      : false);
  const canSendReminders =
    canManageReminderSettings || normalizedMemberRole === GROUP_ROLE.TREASURER;
  const showRemindersTab = canSendReminders;
  const scopedMemberId = profile?.id ? String(profile.id) : null;
  const scopedMembers = useMemo(() => {
    if (canViewAll) return members;
    if (!scopedMemberId) return [];
    return members.filter((member) => String(member.id) === scopedMemberId);
  }, [members, canViewAll, scopedMemberId]);
  const scopedContributions = useMemo(() => {
    if (canViewAll) return contributions;
    if (!scopedMemberId) return [];
    return contributions.filter(
      (contribution) => String(contribution.memberId) === scopedMemberId,
    );
  }, [contributions, canViewAll, scopedMemberId]);

  const formatCurrency = (value: number) => {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `₦${amount.toLocaleString()}`;
  };

  const formatVoteDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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

  useEffect(() => {
    if (!open) {
      setSelectedContributionType("revolving");
    }
  }, [open]);

  useEffect(() => {
    if (!showRemindersTab && managementTab === "reminders") {
      setManagementTab("contributions");
    }
  }, [showRemindersTab, managementTab]);

  const resolveContributionType = (value?: string | null) => {
    return normalizeContributionType(value) ?? "revolving";
  };

  const resolvePlannedUnits = (
    settings: GroupManagementMember["contributionSettings"],
    year: number,
    type: ContributionTypeCanonical,
  ) => {
    if (!settings || typeof settings !== "object") return null;
    const settingsYear = Number((settings as Record<string, unknown>).year);
    if (!Number.isFinite(settingsYear) || settingsYear !== year) return null;
    const rawUnits = (settings as Record<string, unknown>).units;
    if (typeof rawUnits === "number" || typeof rawUnits === "string") {
      const num = Number(rawUnits);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    if (!rawUnits || typeof rawUnits !== "object") return null;
    const num = Number((rawUnits as Record<string, unknown>)[type]);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const expectedByMemberId = useMemo(() => {
    const unitAmount =
      Number(
        ContributionTypeConfig?.[selectedContributionType]?.unitAmount ?? NaN,
      ) || CONTRIBUTION_UNIT_BASE;
    const minAmount = Number(
      ContributionTypeConfig?.[selectedContributionType]?.minAmount ?? 0,
    );
    const fallbackAmount = Number(group?.monthlyContribution || 0);
    const map = new Map<string, number>();
    scopedMembers.forEach((member) => {
      const plannedUnits = resolvePlannedUnits(
        member.contributionSettings,
        nowInfo.year,
        selectedContributionType,
      );
      let expectedAmount = 0;
      if (plannedUnits && unitAmount) {
        const computed = plannedUnits * unitAmount;
        expectedAmount =
          minAmount > 0 ? Math.max(computed, minAmount) : computed;
      } else if (minAmount > 0) {
        expectedAmount = minAmount;
      } else if (Number.isFinite(fallbackAmount) && fallbackAmount > 0) {
        expectedAmount = fallbackAmount;
      }
      map.set(member.id, expectedAmount);
    });
    return map;
  }, [
    scopedMembers,
    nowInfo.year,
    selectedContributionType,
    group?.monthlyContribution,
  ]);

  const monthlyExpected = useMemo(
    () =>
      scopedMembers.reduce(
        (sum, member) => sum + Number(expectedByMemberId.get(member.id) || 0),
        0,
      ),
    [scopedMembers, expectedByMemberId],
  );

  const trendMonths = useMemo(() => {
    const months = [];
    for (let month = 1; month <= nowInfo.month; month += 1) {
      const d = new Date(nowInfo.year, month - 1, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    return months;
  }, [nowInfo.month, nowInfo.year]);

  const paidByMonth = useMemo(() => {
    const map = new Map<string, number>();
    scopedContributions.forEach((c) => {
      const resolvedType = resolveContributionType(c.contributionType);
      if (resolvedType !== selectedContributionType) return;
      if (!["completed", "verified"].includes(String(c.status))) return;
      const key = `${c.year}-${String(c.month).padStart(2, "0")}`;
      const total = map.get(key) ?? 0;
      map.set(key, total + Number(c.amount || 0));
    });
    return map;
  }, [scopedContributions, selectedContributionType]);

  const trendData = trendMonths.map((month) => {
    const collected = paidByMonth.get(month.key) ?? 0;
    const ratio = monthlyExpected > 0 ? collected / monthlyExpected : 0;
    return {
      ...month,
      collected,
      ratio: Math.min(1, Math.max(0, ratio)),
    };
  });

  const monthlyCollected = paidByMonth.get(nowInfo.key) ?? 0;
  const totalCollected = useMemo(() => {
    return scopedContributions.reduce((sum, contribution) => {
      const resolvedType = resolveContributionType(
        contribution.contributionType,
      );
      if (resolvedType !== selectedContributionType) return sum;
      if (!["completed", "verified"].includes(String(contribution.status))) {
        return sum;
      }
      return sum + Number(contribution.amount || 0);
    }, 0);
  }, [scopedContributions, selectedContributionType]);

  const monthlyCollectionRate =
    monthlyExpected > 0
      ? Math.round((monthlyCollected / monthlyExpected) * 100)
      : 0;

  const loans = groupLoansQuery.data ?? [];
  const resolveLoanBorrowerId = (loan: { userId?: unknown }) => {
    const userObj =
      loan.userId && typeof loan.userId === "object"
        ? (loan.userId as Record<string, unknown>)
        : null;
    if (
      userObj &&
      (typeof userObj._id === "string" || typeof userObj.id === "string")
    ) {
      return String((userObj._id || userObj.id) as string);
    }
    if (typeof loan.userId === "string") return loan.userId;
    return null;
  };
  const scopedLoans = useMemo(() => {
    if (canViewAll) return loans;
    if (!scopedMemberId) return [];
    return loans.filter(
      (loan) => resolveLoanBorrowerId(loan) === scopedMemberId,
    );
  }, [loans, canViewAll, scopedMemberId]);
  const activeLoans = useMemo(
    () =>
      scopedLoans.filter((loan) =>
        ["disbursed", "defaulted"].includes(String(loan.status)),
      ),
    [scopedLoans],
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

  const voteParticipants = voteParticipantsQuery.data?.participants ?? [];
  const sortedVoteParticipants = useMemo(
    () =>
      [...voteParticipants].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      ),
    [voteParticipants],
  );
  const votedParticipants = sortedVoteParticipants.filter(
    (participant) => participant.status === "voted",
  );
  const pendingParticipants = sortedVoteParticipants.filter(
    (participant) => participant.status === "pending",
  );
  const filteredVotedParticipants = votedParticipants.filter((participant) => {
    if (voteParticipantsFilter === "yes") {
      return participant.choice === "yes";
    }
    if (voteParticipantsFilter === "no") {
      return participant.choice === "no";
    }
    if (voteParticipantsFilter === "pending") {
      return false;
    }
    return true;
  });
  const filteredPendingParticipants =
    voteParticipantsFilter === "all" || voteParticipantsFilter === "pending"
      ? pendingParticipants
      : [];
  const showVotedColumn = ["all", "voted", "yes", "no"].includes(
    voteParticipantsFilter,
  );
  const showPendingColumn = ["all", "pending"].includes(voteParticipantsFilter);
  const votedColumnTitle =
    voteParticipantsFilter === "yes"
      ? "Voted (Yes)"
      : voteParticipantsFilter === "no"
        ? "Voted (No)"
        : "Voted Members";

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

  useEffect(() => {
    if (showVoteParticipantsModal) {
      setVoteParticipantsFilter("all");
    }
  }, [showVoteParticipantsModal]);

  useEffect(() => {
    if (!showVoteNotifyModal) {
      setVoteNotifyResult(null);
    }
  }, [showVoteNotifyModal]);

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

  const openVoteAction = (vote: BackendGroupVote) => {
    setActiveVote(vote);
    setVoteChoice("yes");
    setShowVoteActionModal(true);
  };

  const openVoteParticipants = (vote: BackendGroupVote) => {
    setActiveVote(vote);
    setShowVoteParticipantsModal(true);
  };

  const openVoteNotify = (vote: BackendGroupVote) => {
    setActiveVote(vote);
    setVoteNotifyTarget("pending");
    setVoteNotifyChannels({
      email: true,
      sms: false,
      notification: true,
    });
    setVoteNotifyResult(null);
    setShowVoteNotifyModal(true);
  };

  const buildNotifySummary = (
    result?: BackendVoteNotificationResult | null,
  ) => {
    if (!result?.channels) return "";
    const parts = [];
    if (result.channels.email?.requested) {
      parts.push(
        `Email ${result.channels.email.sent}/${result.channels.email.attempted}`,
      );
    }
    if (result.channels.sms?.requested) {
      parts.push(
        `SMS ${result.channels.sms.sent}/${result.channels.sms.attempted}`,
      );
    }
    if (result.channels.notification?.requested) {
      parts.push(
        `In-app ${result.channels.notification.sent}/${result.channels.notification.attempted}`,
      );
    }
    return parts.join(" | ");
  };

  const handleSubmitVote = async () => {
    if (!groupId || !activeVote) return;
    try {
      await respondVoteMutation.mutateAsync({
        voteId: activeVote._id,
        choice: voteChoice,
      });
      toast({
        title: "Vote submitted",
        description: `Your response has been recorded for ${activeVote.title}.`,
      });
      setShowVoteActionModal(false);
    } catch (error: unknown) {
      toast({
        title: "Vote failed",
        description:
          error instanceof Error ? error.message : "Unable to submit vote",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVote = async (vote: BackendGroupVote) => {
    if (!groupId) return;
    const confirmed = window.confirm(
      `Delete "${vote.title}"? This will remove all responses.`,
    );
    if (!confirmed) return;

    setDeletingVoteId(vote._id);
    try {
      await deleteVoteMutation.mutateAsync({ voteId: vote._id });
      toast({
        title: "Vote deleted",
        description: `${vote.title} has been removed.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Unable to delete vote",
        variant: "destructive",
      });
    } finally {
      setDeletingVoteId(null);
    }
  };

  const handleNotifyVote = async () => {
    if (!groupId || !activeVote) return;
    const hasChannel =
      voteNotifyChannels.email ||
      voteNotifyChannels.sms ||
      voteNotifyChannels.notification;
    if (!hasChannel) {
      toast({
        title: "Select a channel",
        description: "Choose at least one channel to notify members.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await notifyVoteMutation.mutateAsync({
        voteId: activeVote._id,
        payload: {
          sendEmail: voteNotifyChannels.email,
          sendSMS: voteNotifyChannels.sms,
          sendNotification: voteNotifyChannels.notification,
          target: voteNotifyTarget,
        },
      });
      setVoteNotifyResult(result);
      const summary = buildNotifySummary(result);
      toast({
        title: "Notifications sent",
        description: summary || "Vote notifications have been dispatched.",
      });
    } catch (error: unknown) {
      toast({
        title: "Notification failed",
        description:
          error instanceof Error ? error.message : "Unable to notify members",
        variant: "destructive",
      });
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = async () => {
    if (!groupId) return;
    setIsDownloadingReport(true);
    try {
      const blob = await downloadGroupContributionReportPdf(groupId, {
        year: nowInfo.year,
        month: nowInfo.month,
        contributionType: selectedContributionType,
      });
      const label =
        ContributionTypeConfig?.[selectedContributionType]?.label ??
        "contribution";
      const safeLabel = label.toLowerCase().replace(/\s+/g, "-");
      const filename = `contribution-report-${safeLabel}-${nowInfo.year}-${String(
        nowInfo.month,
      ).padStart(2, "0")}.pdf`;
      triggerDownload(blob, filename);
      toast({
        title: "Report downloaded",
        description: "Your contribution report is ready.",
      });
    } catch (error: unknown) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "Unable to download report",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleDownloadLedger = async () => {
    if (!groupId) return;
    setIsDownloadingLedger(true);
    try {
      const blob = await downloadGroupContributionLedgerPdf(groupId, {
        year: nowInfo.year,
        contributionType: selectedContributionType,
      });
      const label =
        ContributionTypeConfig?.[selectedContributionType]?.label ??
        "contribution";
      const safeLabel = label.toLowerCase().replace(/\s+/g, "-");
      const filename = `contribution-ledger-${safeLabel}-${nowInfo.year}.pdf`;
      triggerDownload(blob, filename);
      toast({
        title: "Analytics ready",
        description: "Your contribution ledger has been downloaded.",
      });
    } catch (error: unknown) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "Unable to download ledger",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingLedger(false);
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
        values.meetingType === "physical"
          ? values.location?.trim() || ""
          : null,
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
        description:
          error instanceof Error ? error.message : "Please try again",
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
        description:
          error instanceof Error ? error.message : "Please try again",
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
        description:
          error instanceof Error ? error.message : "Please try again",
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
              ...(showRemindersTab
                ? [{ id: "reminders" as const, label: "Reminders", icon: Bell }]
                : []),
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
                  members={scopedMembers}
                  contributions={scopedContributions}
                  monthlyAmount={group.monthlyContribution}
                  groupName={group.name}
                  groupId={group.id}
                  selectedType={selectedContributionType}
                  onSelectedTypeChange={setSelectedContributionType}
                  showScopedHint={!canViewAll}
                />
              )}
            </>
          )}

          {managementTab === "reports" && (
            <div className="space-y-6">
              {!canViewAll && (
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Showing your data only
                </div>
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {ContributionTypeOptions.map((option) => {
                    const isActive = option.value === selectedContributionType;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setSelectedContributionType(option.value)
                        }
                        className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-gray-500 text-xs">
                  {ContributionTypeConfig?.[selectedContributionType]
                    ?.description ?? ""}
                </p>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl text-white">
                  <p className="text-emerald-100 text-sm">Total Collected</p>
                  <p className="mt-1 font-bold text-3xl">
                    {formatCurrency(totalCollected)}
                  </p>
                  <p className="mt-2 text-emerald-100 text-sm">
                    {ContributionTypeConfig?.[selectedContributionType]
                      ?.label ?? "Contribution"}
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
                    {formatCurrency(monthlyCollected)}
                  </p>
                  <p className="mt-2 text-purple-100 text-sm">
                    Expected: {formatCurrency(monthlyExpected)} | Rate:{" "}
                    {monthlyCollectionRate}%
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 border border-gray-200 rounded-xl">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Monthly Savings Trend (YTD)
                </h3>
                <p className="mb-4 text-gray-500 text-xs">
                  {ContributionTypeConfig?.[selectedContributionType]?.label ??
                    "Contribution"}{" "}
                  - YTD {nowInfo.year}
                </p>
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
                <button
                  onClick={handleDownloadReport}
                  disabled={isDownloadingReport || !groupId}
                  className="flex flex-1 justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 px-4 py-3 rounded-lg text-white transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {isDownloadingReport
                    ? "Downloading..."
                    : "Download Full Report"}
                </button>
                <button
                  onClick={handleDownloadLedger}
                  disabled={isDownloadingLedger || !groupId}
                  className="flex flex-1 justify-center items-center gap-2 hover:bg-gray-50 disabled:bg-gray-100 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  {isDownloadingLedger ? "Preparing..." : "View Analytics"}
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
                {canManageVotes && (
                  <button
                    onClick={() => setShowVoteModal(true)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Vote
                  </button>
                )}
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
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
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
                              <span
                                className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                                  (vote.myVote?.choice ?? vote.myChoice) ===
                                  "yes"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : (vote.myVote?.choice ?? vote.myChoice) ===
                                        "no"
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {(() => {
                                  const choice =
                                    vote.myVote?.choice ?? vote.myChoice;
                                  if (!choice) return "My vote: Pending";
                                  const dateLabel = formatVoteDate(
                                    vote.myVote?.respondedAt,
                                  );
                                  return `My vote: ${choice.toUpperCase()}${
                                    dateLabel ? ` · ${dateLabel}` : ""
                                  }`;
                                })()}
                              </span>
                            </div>
                            <p className="mt-1 text-gray-500 text-sm">
                              {vote.description}
                            </p>
                            <p className="mt-2 text-gray-500 text-xs">
                              {vote.endsAt
                                ? `Ends: ${String(vote.endsAt).slice(0, 10)}`
                                : "No end date"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {canManageVotes && (
                              <button
                                onClick={() => openVoteParticipants(vote)}
                                className="hover:bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 text-xs transition-colors"
                              >
                                View Votes
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openVoteAction(vote)}
                                  disabled={vote.status !== "active"}
                                >
                                  Vote
                                </DropdownMenuItem>
                                {canManageVotes && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => openVoteNotify(vote)}
                                    >
                                      Notify Members
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteVote(vote)}
                                      disabled={
                                        deleteVoteMutation.isPending ||
                                        deletingVoteId === vote._id
                                      }
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      {deletingVoteId === vote._id
                                        ? "Deleting..."
                                        : "Delete Poll"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

          {managementTab === "reminders" && showRemindersTab && (
            <div className="space-y-6">
              {!canManageReminderSettings && (
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Only coordinators can update reminder settings
                </div>
              )}
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
                      disabled={remindersBusy || !canManageReminderSettings}
                      onClick={() =>
                        canManageReminderSettings &&
                        handleUpdateReminder({
                          autoReminders: !reminderSettings.autoReminders,
                        })
                      }
                      className={`relative rounded-full w-12 h-6 transition-colors ${
                        reminderSettings.autoReminders
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      } ${
                        remindersBusy || !canManageReminderSettings
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
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
                      disabled={remindersBusy || !canManageReminderSettings}
                      onChange={(e) =>
                        canManageReminderSettings &&
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
                      disabled={remindersBusy || !canManageReminderSettings}
                      onClick={() =>
                        canManageReminderSettings &&
                        handleUpdateReminder({
                          overdueReminders: !reminderSettings.overdueReminders,
                        })
                      }
                      className={`relative rounded-full w-12 h-6 transition-colors ${
                        reminderSettings.overdueReminders
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      } ${
                        remindersBusy || !canManageReminderSettings
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
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
                      disabled={remindersBusy || !canManageReminderSettings}
                      onClick={() =>
                        canManageReminderSettings &&
                        handleUpdateReminder({
                          meetingReminders: !reminderSettings.meetingReminders,
                        })
                      }
                      className={`relative rounded-full w-12 h-6 transition-colors ${
                        reminderSettings.meetingReminders
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                      } ${
                        remindersBusy || !canManageReminderSettings
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
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
                disabled={sendReminderMutation.isPending || !canSendReminders}
                onClick={() => canSendReminders && handleSendReminders()}
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
        <div className="z-[60] fixed inset-0 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMeetingModal(false)}
          />
          <div className="relative bg-white shadow-xl rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {meetingModalMode === "edit"
                    ? "Edit Meeting"
                    : "Schedule Meeting"}
                </h3>
                <p className="text-gray-500 text-sm">{group.name}</p>
              </div>
              <button
                onClick={() => setShowMeetingModal(false)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitMeeting} className="space-y-4 p-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Title *
                </label>
                <input
                  {...meetingForm.register("title", { required: true })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                  placeholder="Monthly contribution meeting"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Description
                </label>
                <textarea
                  {...meetingForm.register("description")}
                  rows={3}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                  placeholder="Meeting agenda summary"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Meeting Type
                </label>
                <select
                  {...meetingForm.register("meetingType")}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                >
                  <option value="physical">Physical</option>
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                </select>
              </div>

              {meetingForm.watch("meetingType") === "physical" && (
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Location
                  </label>
                  <input
                    {...meetingForm.register("location")}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                    placeholder="Meeting venue"
                  />
                </div>
              )}

              <div className="gap-3 grid grid-cols-2">
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Date *
                  </label>
                  <input
                    type="date"
                    {...meetingForm.register("scheduledDate", {
                      required: true,
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Time *
                  </label>
                  <input
                    type="time"
                    {...meetingForm.register("scheduledTime", {
                      required: true,
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  {...meetingForm.register("durationMinutes", {
                    valueAsNumber: true,
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 hover:bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
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
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-4 py-2.5 rounded-lg font-medium text-white transition-colors"
                >
                  {createMeetingMutation.isPending ||
                  updateMeetingMutation.isPending
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
        <div className="z-[60] fixed inset-0 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoteModal(false)}
          />
          <div className="relative bg-white shadow-xl rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Create Vote</h3>
                <p className="text-gray-500 text-sm">{group.name}</p>
              </div>
              <button
                onClick={() => setShowVoteModal(false)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateVote} className="space-y-4 p-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Title *
                </label>
                <input
                  {...voteForm.register("title", { required: true })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                  placeholder="New group proposal"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Description
                </label>
                <textarea
                  {...voteForm.register("description")}
                  rows={3}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                  placeholder="Provide details for the vote"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  {...voteForm.register("endsAt")}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoteModal(false)}
                  className="flex-1 hover:bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createVoteMutation.isPending || !voteForm.watch("title")
                  }
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-4 py-2.5 rounded-lg font-medium text-white transition-colors"
                >
                  {createVoteMutation.isPending ? "Creating..." : "Create Vote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVoteActionModal && activeVote && (
        <div className="z-[60] fixed inset-0 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoteActionModal(false)}
          />
          <div className="relative bg-white shadow-xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Cast Vote</h3>
                <p className="text-gray-500 text-sm">{activeVote.title}</p>
              </div>
              <button
                onClick={() => setShowVoteActionModal(false)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="text-gray-600 text-sm">
                  Choose your response for this vote.
                </p>
              </div>
              <div className="gap-3 grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVoteChoice("yes")}
                  className={`px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                    voteChoice === "yes"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-600"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setVoteChoice("no")}
                  className={`px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                    voteChoice === "no"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600"
                  }`}
                >
                  No
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoteActionModal(false)}
                  className="flex-1 hover:bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitVote}
                  disabled={respondVoteMutation.isPending}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-4 py-2.5 rounded-lg font-medium text-white transition-colors"
                >
                  {respondVoteMutation.isPending
                    ? "Submitting..."
                    : "Submit Vote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVoteParticipantsModal && activeVote && (
        <div className="z-[60] fixed inset-0 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoteParticipantsModal(false)}
          />
          <div className="relative bg-white shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Vote Tracking</h3>
                <p className="text-gray-500 text-sm">{activeVote.title}</p>
              </div>
              <button
                onClick={() => setShowVoteParticipantsModal(false)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {voteParticipantsQuery.isLoading ? (
                <div className="py-10 text-gray-500 text-center">
                  Loading vote participants...
                </div>
              ) : voteParticipants.length === 0 ? (
                <div className="py-10 text-gray-500 text-center">
                  No members found for this vote.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-gray-600 text-sm">
                    <span>
                      Total: {voteParticipantsQuery.data?.totalMembers ?? 0}
                    </span>
                    <span>Voted: {votedParticipants.length}</span>
                    <span>Pending: {pendingParticipants.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "all", label: "All" },
                      { id: "voted", label: "Voted" },
                      { id: "pending", label: "Pending" },
                      { id: "yes", label: "Yes" },
                      { id: "no", label: "No" },
                    ].map((option) => {
                      const isActive = voteParticipantsFilter === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setVoteParticipantsFilter(
                              option.id as
                                | "all"
                                | "voted"
                                | "pending"
                                | "yes"
                                | "no",
                            )
                          }
                          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:text-emerald-600"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className={`grid gap-4 ${
                      showVotedColumn && showPendingColumn
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {showVotedColumn && (
                      <div className="p-4 border border-gray-200 rounded-xl">
                        <h4 className="mb-3 font-medium text-gray-900">
                          {votedColumnTitle}
                        </h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {filteredVotedParticipants.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                              No members match this filter.
                            </p>
                          ) : (
                            filteredVotedParticipants.map((participant) => (
                              <div
                                key={participant.userId}
                                className="flex justify-between items-start gap-3"
                              >
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {participant.name}
                                  </p>
                                  {participant.memberSerial && (
                                    <p className="text-gray-400 text-xs">
                                      {participant.memberSerial}
                                    </p>
                                  )}
                                </div>
                                <span className="font-semibold text-emerald-600 text-xs">
                                  {participant.choice?.toUpperCase() ?? "VOTED"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {showPendingColumn && (
                      <div className="p-4 border border-gray-200 rounded-xl">
                        <h4 className="mb-3 font-medium text-gray-900">
                          Not Yet Voted
                        </h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {filteredPendingParticipants.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                              No members match this filter.
                            </p>
                          ) : (
                            filteredPendingParticipants.map((participant) => (
                              <div key={participant.userId}>
                                <p className="font-medium text-gray-900 text-sm">
                                  {participant.name}
                                </p>
                                {participant.memberSerial && (
                                  <p className="text-gray-400 text-xs">
                                    {participant.memberSerial}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showVoteNotifyModal && activeVote && (
        <div className="z-[60] fixed inset-0 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVoteNotifyModal(false)}
          />
          <div className="relative bg-white shadow-xl rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Notify Members</h3>
                <p className="text-gray-500 text-sm">{activeVote.title}</p>
              </div>
              <button
                onClick={() => setShowVoteNotifyModal(false)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Notify Scope
                </label>
                <select
                  value={voteNotifyTarget}
                  onChange={(e) =>
                    setVoteNotifyTarget(e.target.value as "pending" | "all")
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 w-full"
                >
                  <option value="pending">Pending votes only</option>
                  <option value="all">All members</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Delivery Channels
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      type="checkbox"
                      checked={voteNotifyChannels.email}
                      onChange={(e) =>
                        setVoteNotifyChannels((prev) => ({
                          ...prev,
                          email: e.target.checked,
                        }))
                      }
                      className="border-gray-300 rounded focus:ring-emerald-500 w-4 h-4 text-emerald-600"
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      type="checkbox"
                      checked={voteNotifyChannels.sms}
                      onChange={(e) =>
                        setVoteNotifyChannels((prev) => ({
                          ...prev,
                          sms: e.target.checked,
                        }))
                      }
                      className="border-gray-300 rounded focus:ring-emerald-500 w-4 h-4 text-emerald-600"
                    />
                    SMS
                  </label>
                  <label className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      type="checkbox"
                      checked={voteNotifyChannels.notification}
                      onChange={(e) =>
                        setVoteNotifyChannels((prev) => ({
                          ...prev,
                          notification: e.target.checked,
                        }))
                      }
                      className="border-gray-300 rounded focus:ring-emerald-500 w-4 h-4 text-emerald-600"
                    />
                    In-app notification
                  </label>
                </div>
              </div>

              {voteNotifyResult && (
                <div className="bg-gray-50 p-3 border border-gray-200 rounded-lg text-gray-600 text-sm">
                  <p className="font-medium text-gray-900">Dispatch Summary</p>
                  <p className="mt-1">
                    {buildNotifySummary(voteNotifyResult) ||
                      "Notifications processed."}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVoteNotifyModal(false)}
                  className="flex-1 hover:bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNotifyVote}
                  disabled={notifyVoteMutation.isPending}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-4 py-2.5 rounded-lg font-medium text-white transition-colors"
                >
                  {notifyVoteMutation.isPending
                    ? "Sending..."
                    : "Send Notification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagementPanel;
