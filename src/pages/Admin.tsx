import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Calendar,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Send,
  Mail,
  Phone,
  Shield,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  ArrowDownRight,
  MessageSquare,
  MoreVertical,
  UserPlus,
  UserMinus,
  Check,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMemberApprovalsQuery } from "@/hooks/admin/useMemberApprovalsQuery";
import { useApproveMemberApprovalMutation } from "@/hooks/admin/useApproveMemberApprovalMutation";
import { useRejectMemberApprovalMutation } from "@/hooks/admin/useRejectMemberApprovalMutation";
import { useContributionTrackerQuery } from "@/hooks/admin/useContributionTrackerQuery";
import { useMarkContributionPaidMutation } from "@/hooks/admin/useMarkContributionPaidMutation";
import { useAdminGroupsQuery } from "@/hooks/admin/useAdminGroupsQuery";
import { useAdminLoanApplicationsQuery } from "@/hooks/admin/useAdminLoanApplicationsQuery";
import { useReviewAdminLoanApplicationMutation } from "@/hooks/admin/useReviewAdminLoanApplicationMutation";
import { useDisburseAdminLoanApplicationMutation } from "@/hooks/admin/useDisburseAdminLoanApplicationMutation";
import { useFinalizeAdminLoanDisbursementOtpMutation } from "@/hooks/admin/useFinalizeAdminLoanDisbursementOtpMutation";
import { useResendAdminLoanDisbursementOtpMutation } from "@/hooks/admin/useResendAdminLoanDisbursementOtpMutation";
import { useVerifyAdminLoanDisbursementTransferMutation } from "@/hooks/admin/useVerifyAdminLoanDisbursementTransferMutation";
import { useCreateAdminAnnouncementMutation } from "@/hooks/admin/useCreateAdminAnnouncementMutation";
import { useAdminAttendanceMeetingsQuery } from "@/hooks/admin/useAdminAttendanceMeetingsQuery";
import { useAdminSmsStatsQuery } from "@/hooks/admin/useAdminSmsStatsQuery";
import { useAdminSmsTemplatesQuery } from "@/hooks/admin/useAdminSmsTemplatesQuery";
import { useSendAdminBulkSmsMutation } from "@/hooks/admin/useSendAdminBulkSmsMutation";
import { useGroupMembersQuery } from "@/hooks/groups/useGroupMembersQuery";
import { useGroupMeetingsQuery } from "@/hooks/groups/useGroupMeetingsQuery";
import { useGroupContributionsQuery } from "@/hooks/groups/useGroupContributionsQuery";
import { useGroupMemberCandidatesQuery } from "@/hooks/groups/useGroupMemberCandidatesQuery";
import { useAddGroupMembersMutation } from "@/hooks/groups/useAddGroupMembersMutation";
import { useArchiveGroupMutation } from "@/hooks/groups/useArchiveGroupMutation";
import { useCreateGroupMutation } from "@/hooks/groups/useCreateGroupMutation";
import { useUpdateGroupMutation } from "@/hooks/groups/useUpdateGroupMutation";
import { useSetGroupCoordinatorMutation } from "@/hooks/groups/useSetGroupCoordinatorMutation";

import AdminStats from "@/components/admin/AdminStats";
import MemberApprovalPanel from "@/components/admin/MemberApprovalPanel";
import ContributionTracker from "@/components/admin/ContributionTracker";
import LoanReviewPanel from "@/components/admin/LoanReviewPanel";
import FinancialReports from "@/components/admin/FinancialReports";
import AttendanceTracker from "@/components/admin/AttendanceTracker";
import WithdrawalApprovalPanel from "@/components/admin/WithdrawalApprovalPanel";
import GroupFilters from "@/components/groups/GroupFilters";
import CreateGroupModal, {
  GroupFormData,
} from "@/components/groups/CreateGroupModal";
import GroupManagementPanel from "@/components/groups/GroupManagementPanel";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserRole } from "@/lib/auth";
import type { AdminGroupRow } from "@/lib/admin";
import type { BackendGroup } from "@/lib/groups";
import { USER_ROLE } from "@/lib/roles";

// Sample data
type ApplicantStatus = "pending" | "approved" | "rejected";
type Applicant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  groupName: string;
  applicationDate: string;
  status: ApplicantStatus;
};

// Define LoanApplication type with all possible statuses
type LoanApplicationStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "disbursed";
type LoanApplication = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  groupName: string;
  loanCode?: string | null;
  loanNumber?: number | null;
  loanType?: string | null;
  loanAmount: number;
  loanPurpose: string;
  purposeDescription?: string | null;
  repaymentPeriod: number;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  approvedAmount?: number | null;
  approvedInterestRate?: number | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  repaymentStartDate?: string | null;
  monthlyPayment?: number | null;
  totalRepayable?: number | null;
  remainingBalance?: number | null;
  monthlyIncome: number;
  disbursementBankAccountId?: string | null;
  disbursementBankName?: string | null;
  disbursementBankCode?: string | null;
  disbursementAccountNumber?: string | null;
  disbursementAccountName?: string | null;
  payoutReference?: string | null;
  payoutGateway?: string | null;
  payoutTransferCode?: string | null;
  payoutStatus?: string | null;
  payoutOtpResentAt?: string | null;
  guarantorName: string;
  guarantorPhone: string;
  guarantors?: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    relationship?: string | null;
    occupation?: string | null;
    address?: string | null;
    memberSince?: string | null;
    savingsBalance?: number | null;
    liabilityPercentage?: number | null;
    type?: string | null;
  }>;
  documents?: Array<{
    name: string;
    type: string;
    size: number;
    status: string;
    url?: string | null;
  }>;
  status: LoanApplicationStatus;
  createdAt: string;
  reviewNotes?: string;
};

const getEffectiveContributionPeriod = (date = new Date()) => {
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  if (day <= 4) {
    month -= 1;
    if (month <= 0) {
      month = 12;
      year -= 1;
    }
  }
  return { year, month };
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { tab } = useParams();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("all");
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsRecipientsTarget, setSmsRecipientsTarget] = useState<
    "all" | "coordinators" | "defaulters" | "selected"
  >("all");
  const [smsTemplateKey, setSmsTemplateKey] = useState("custom");
  const [isSending, setIsSending] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupCategory, setGroupCategory] = useState("All Categories");
  const [groupLocation, setGroupLocation] = useState("All Locations");
  const [groupSortBy, setGroupSortBy] = useState("popular");
  const [groupPage, setGroupPage] = useState(1);
  const groupPageSize = 10;
  const [coordinatorPage, setCoordinatorPage] = useState(1);
  const coordinatorPageSize = 10;
  const [groupActionTarget, setGroupActionTarget] =
    useState<AdminGroupRow | null>(null);
  const [coordinatorActionTarget, setCoordinatorActionTarget] =
    useState<AdminGroupRow | null>(null);
  const [showAssignCoordinator, setShowAssignCoordinator] = useState(false);
  const [showRemoveCoordinator, setShowRemoveCoordinator] = useState(false);
  const [coordinatorSearch, setCoordinatorSearch] = useState("");
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<
    string | null
  >(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showGroupSettingsPanel, setShowGroupSettingsPanel] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const isAdminAuthorized = hasUserRole(
    user,
    USER_ROLE.ADMIN,
    USER_ROLE.GROUP_COORDINATOR,
  );
  const isAdmin = hasUserRole(user, USER_ROLE.ADMIN);
  const isCoordinator = hasUserRole(
    user,
    USER_ROLE.GROUP_COORDINATOR,
  );
  const canAccessCoordinatorPanels = isCoordinator || isAdmin;

  const memberApprovalsQuery = useMemberApprovalsQuery(
    { status: "pending" },
    isCoordinator,
  );
  const approveMemberMutation = useApproveMemberApprovalMutation();
  const rejectMemberMutation = useRejectMemberApprovalMutation();

  const defaultPeriod = useMemo(() => getEffectiveContributionPeriod(), []);
  const [trackerYear, setTrackerYear] = useState(defaultPeriod.year);
  const [trackerMonth, setTrackerMonth] = useState(defaultPeriod.month);

  const now = new Date();
  const trackerQuery = useContributionTrackerQuery(
    {
      year: trackerYear,
      month: trackerMonth,
    },
    canAccessCoordinatorPanels,
  );
  const markPaidMutation = useMarkContributionPaidMutation();

  const adminGroupsQuery = useAdminGroupsQuery({
    includeMetrics: true,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    limit: groupPageSize,
    page: groupPage,
    search: groupSearchQuery.trim() || undefined,
    category: groupCategory !== "All Categories" ? groupCategory : undefined,
    location: groupLocation !== "All Locations" ? groupLocation : undefined,
    sort: groupSortBy,
  });
  const coordinatorsQuery = useAdminGroupsQuery({
    includeMetrics: false,
    limit: coordinatorPageSize,
    page: coordinatorPage,
    sort: "groupNumber",
  });
  const manageableGroups = adminGroupsQuery.data?.groups ?? [];
  const groupSummary = adminGroupsQuery.data?.summary;
  const groupMeta = adminGroupsQuery.data?.meta;
  const coordinatorGroups = coordinatorsQuery.data?.groups ?? [];
  const coordinatorMeta = coordinatorsQuery.data?.meta;
  const coordinatorTotal = coordinatorMeta?.total ?? coordinatorGroups.length;
  const coordinatorTotalPages = Math.max(
    1,
    Math.ceil(coordinatorTotal / coordinatorPageSize),
  );
  const coordinatorPageValue = coordinatorMeta?.page ?? coordinatorPage;
  const contributionTypeTotalsYtd = groupSummary?.contributionTypeTotalsYtd;
  const canAssignCoordinator = isAdmin;
  const canDeleteGroup = isAdmin;
  const activeGroupId = groupActionTarget?._id;
  const groupModalOpen = showGroupSettingsPanel;
  const coordinatorTargetId = coordinatorActionTarget?._id;

  const groupMembersQuery = useGroupMembersQuery(
    groupModalOpen ? activeGroupId : undefined,
  );
  const coordinatorMembersQuery = useGroupMembersQuery(
    showAssignCoordinator ? coordinatorTargetId : undefined,
    { search: coordinatorSearch, status: "active" },
    showAssignCoordinator,
  );
  const groupMeetingsQuery = useGroupMeetingsQuery(
    groupModalOpen ? activeGroupId : undefined,
  );
  const groupContributionsQuery = useGroupContributionsQuery(
    groupModalOpen ? activeGroupId : undefined,
  );

  const memberCandidatesQuery = useGroupMemberCandidatesQuery(
    showAddMembersModal ? activeGroupId : undefined,
    memberSearchQuery,
    showAddMembersModal,
  );
  const addGroupMembersMutation = useAddGroupMembersMutation(activeGroupId);
  const archiveGroupMutation = useArchiveGroupMutation();
  const createGroupMutation = useCreateGroupMutation();
  const updateGroupMutation = useUpdateGroupMutation();
  const setCoordinatorMutation = useSetGroupCoordinatorMutation();

  const groupCategoryOptions = useMemo(() => {
    const base = groupSummary?.categories?.length
      ? groupSummary.categories
      : manageableGroups
          .map((g) => g.category || "General")
          .filter((cat) => Boolean(cat));
    const unique = Array.from(new Set(base)) as string[];
    return ["All Categories", ...unique.sort()];
  }, [groupSummary?.categories, manageableGroups]);

  const groupLocationOptions = useMemo(() => {
    const base = groupSummary?.locations?.length
      ? groupSummary.locations
      : manageableGroups
          .map((g) => g.location || "Nigeria")
          .filter((loc) => Boolean(loc));
    const unique = Array.from(new Set(base)) as string[];
    return ["All Locations", ...unique.sort()];
  }, [groupSummary?.locations, manageableGroups]);

  const coordinatorCandidates = useMemo(() => {
    const raw = coordinatorMembersQuery.data ?? [];
    if (raw.length === 0) return [];

    return raw
      .map((member) => {
        const profile =
          member.userId && typeof member.userId === "object"
            ? (member.userId as Record<string, unknown>)
            : null;
        const id =
          profile && (profile._id || profile.id)
            ? String(profile._id || profile.id)
            : typeof member.userId === "string"
              ? member.userId
              : "";
        if (!id) return null;

        return {
          id,
          fullName:
            profile && typeof profile.fullName === "string"
              ? profile.fullName
              : "Member",
          email:
            profile && typeof profile.email === "string" ? profile.email : null,
          phone:
            profile && typeof profile.phone === "string" ? profile.phone : null,
          avatarUrl:
            profile &&
            typeof profile.avatar === "object" &&
            profile.avatar &&
            typeof (profile.avatar as Record<string, unknown>).url === "string"
              ? (profile.avatar as Record<string, unknown>).url
              : null,
          role: member.role,
        };
      })
      .filter((candidate) => Boolean(candidate));
  }, [coordinatorMembersQuery.data]);

  useEffect(() => {
    if (!groupCategoryOptions.includes(groupCategory)) {
      setGroupCategory("All Categories");
    }
  }, [groupCategoryOptions, groupCategory]);

  useEffect(() => {
    if (!groupLocationOptions.includes(groupLocation)) {
      setGroupLocation("All Locations");
    }
  }, [groupLocationOptions, groupLocation]);

  const filteredAdminGroups = useMemo(() => {
    let result = [...manageableGroups];

    if (groupCategory !== "All Categories") {
      result = result.filter(
        (g) => (g.category || "General") === groupCategory,
      );
    }

    if (groupLocation !== "All Locations") {
      result = result.filter(
        (g) => (g.location || "Nigeria") === groupLocation,
      );
    }

    return result;
  }, [manageableGroups, groupCategory, groupLocation]);

  useEffect(() => {
    setGroupPage(1);
  }, [groupSearchQuery, groupCategory, groupLocation, groupSortBy]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((groupMeta?.total ?? 0) / groupPageSize),
    );
    if (groupPage > totalPages) {
      setGroupPage(totalPages);
    }
  }, [groupMeta?.total, groupPage, groupPageSize]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((coordinatorMeta?.total ?? 0) / coordinatorPageSize),
    );
    if (coordinatorPage > totalPages) {
      setCoordinatorPage(totalPages);
    }
  }, [coordinatorMeta?.total, coordinatorPage, coordinatorPageSize]);

  const groupManagementSummary = useMemo(() => {
    if (!groupActionTarget) return null;
    return {
      id: groupActionTarget._id,
      name: groupActionTarget.groupName,
      monthlyContribution: Number(groupActionTarget.monthlyContribution || 0),
      memberCount:
        groupActionTarget.activeMemberCount ??
        groupActionTarget.memberCount ??
        0,
      totalSavings: Number(groupActionTarget.totalSavings || 0),
    };
  }, [groupActionTarget]);

  const editGroupDefaults = useMemo<GroupFormData | undefined>(() => {
    if (!groupActionTarget) return undefined;
    const isOpen =
      typeof groupActionTarget.isOpen === "boolean"
        ? groupActionTarget.isOpen
        : groupActionTarget.isOpen === "false"
          ? false
          : true;
    return {
      name: groupActionTarget.groupName || "",
      description: groupActionTarget.description || "",
      category: groupActionTarget.category || "",
      location: groupActionTarget.location || "",
      image: groupActionTarget.imageUrl || "",
      isOpen,
      maxMembers: Number(groupActionTarget.maxMembers || 50),
      monthlyContribution: Number(groupActionTarget.monthlyContribution || 0),
      meetingFrequency: groupActionTarget.meetingFrequency || "monthly",
      meetingDay: groupActionTarget.meetingDay || "Saturday",
      rules: groupActionTarget.rules || "",
    };
  }, [groupActionTarget]);

  const membersForTracker = useMemo(() => {
    const raw = groupMembersQuery.data ?? [];
    if (raw.length === 0) return [];

    return raw.map((m) => {
      const userObj =
        typeof m.userId === "object" && m.userId
          ? (m.userId as Record<string, unknown>)
          : null;

      const id =
        userObj &&
        (typeof userObj._id === "string" || typeof userObj.id === "string")
          ? String((userObj._id || userObj.id) as string)
          : m._id;

      const name =
        userObj && typeof userObj.fullName === "string"
          ? userObj.fullName
          : "Member";

      const avatarObj =
        userObj && typeof userObj.avatar === "object" && userObj.avatar
          ? (userObj.avatar as Record<string, unknown>)
          : null;
      const avatar =
        avatarObj && typeof avatarObj.url === "string"
          ? avatarObj.url
          : "https://res.cloudinary.com/dhngpbp2y/image/upload/v1759249303/default-avatar_qh8mcr.png";

      const contributionSettings =
        userObj && typeof userObj.contributionSettings === "object"
          ? (userObj.contributionSettings as Record<string, unknown>)
          : null;

      return {
        id,
        name,
        avatar,
        memberSerial:
          typeof m.memberSerial === "string" ? m.memberSerial : null,
        contributionSettings,
      };
    });
  }, [groupMembersQuery.data]);

  const meetingsForDetails = useMemo(() => {
    const raw = groupMeetingsQuery.data ?? [];
    if (raw.length === 0) return [];

    return raw.map((mtg) => {
      const date = new Date(mtg.scheduledDate);
      const dateLabel = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const timeLabel = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      const isVirtual = mtg.meetingType !== "physical";
      const location = isVirtual
        ? mtg.meetingType === "zoom"
          ? "Zoom Meeting"
          : "Google Meet"
        : mtg.location || "TBD";

      return {
        id: mtg._id,
        title: mtg.title,
        date: dateLabel,
        time: timeLabel,
        location,
        isVirtual,
        meetingType: mtg.meetingType,
        scheduledDate: mtg.scheduledDate,
        durationMinutes: mtg.durationMinutes,
        description: mtg.description,
        status: mtg.status,
        meetingLink: mtg.meetingLink ?? null,
        meetingId: mtg.meetingId ?? null,
        meetingPassword: mtg.meetingPassword ?? null,
      };
    });
  }, [groupMeetingsQuery.data]);

  const contributionsForTracker = useMemo(() => {
    const raw = groupContributionsQuery.data ?? [];
    if (raw.length === 0) return [];

    return raw.map((c) => {
      const userObj =
        typeof c.userId === "object" && c.userId
          ? (c.userId as Record<string, unknown>)
          : null;
      const memberId =
        userObj &&
        (typeof userObj._id === "string" || typeof userObj.id === "string")
          ? String((userObj._id || userObj.id) as string)
          : typeof c.userId === "string"
            ? c.userId
            : "unknown";

      return {
        memberId,
        month: Number(c.month),
        year: Number(c.year),
        amount: Number(c.amount ?? 0),
        status: c.status,
        contributionType: c.contributionType ?? null,
        paidDate:
          c.status === "pending" || c.status === "overdue"
            ? undefined
            : c.updatedAt || c.createdAt,
      };
    });
  }, [groupContributionsQuery.data]);

  // Group management panel consumes tracker-specific contributions; no details modal needed here.

  const periodEndMonthShort = groupSummary
    ? new Date(
        Date.UTC(
          groupSummary.contributionPeriod.year,
          groupSummary.contributionPeriod.month - 1,
          1,
        ),
      ).toLocaleDateString("en-US", { month: "short" })
    : null;
  const ytdLabel = periodEndMonthShort
    ? `Jan-${periodEndMonthShort}`
    : "Jan-Oct";

  const applicants = memberApprovalsQuery.data ?? [];
  const contributions = trackerQuery.data ?? [];
  const adminLoanAppsQuery = useAdminLoanApplicationsQuery(
    { status: "all" },
    canAccessCoordinatorPanels,
  );
  const reviewAdminLoanMutation = useReviewAdminLoanApplicationMutation();
  const disburseAdminLoanMutation = useDisburseAdminLoanApplicationMutation();
  const finalizeLoanOtpMutation =
    useFinalizeAdminLoanDisbursementOtpMutation();
  const resendLoanOtpMutation = useResendAdminLoanDisbursementOtpMutation();
  const verifyLoanTransferMutation =
    useVerifyAdminLoanDisbursementTransferMutation();
  const loanApplications = adminLoanAppsQuery.data?.applications ?? [];
  const createAnnouncementMutation = useCreateAdminAnnouncementMutation();
  const smsStatsQuery = useAdminSmsStatsQuery();
  const smsTemplatesQuery = useAdminSmsTemplatesQuery();
  const sendBulkSmsMutation = useSendAdminBulkSmsMutation();

  const nowIso = new Date().toISOString();
  const upcomingMeetingsQuery = useAdminAttendanceMeetingsQuery({
    status: "scheduled",
    from: nowIso,
    to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    limit: 200,
  });
  const recentCompletedMeetingsQuery = useAdminAttendanceMeetingsQuery({
    status: "completed",
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: nowIso,
    limit: 500,
  });

  const loanGroupOptions = manageableGroups.map((group) => ({
    id: String(group._id),
    name: String(group.groupName || group.group_name || "Group"),
  }));

  const formatCompactNaira = (amount: number) => {
    const n = Number(amount || 0);
    if (!Number.isFinite(n)) return "â‚¦0";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `â‚¦${(n / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `â‚¦${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `â‚¦${(n / 1_000).toFixed(1)}K`;
    return `â‚¦${Math.round(n).toLocaleString()}`;
  };

  const stats = useMemo(() => {
    const pendingApprovals = applicants.length;
    const defaulters = contributions.filter(
      (record) => record.status === "defaulted",
    ).length;

    const loanSummary = adminLoanAppsQuery.data?.summary;
    const pendingLoans =
      loanSummary
        ? (loanSummary.pendingCount ?? 0) + (loanSummary.underReviewCount ?? 0)
        : loanApplications.filter((loan) =>
            ["pending", "under_review"].includes(String(loan.status)),
          ).length;

    const activeLoans = loanApplications.filter((loan) =>
      ["disbursed", "defaulted"].includes(String(loan.status)),
    ).length;

    const totalMembers =
      typeof groupSummary?.totalMembers === "number"
        ? groupSummary.totalMembers
        : manageableGroups.reduce(
            (sum, group) =>
              sum +
              Number(group.memberCount ?? group.activeMemberCount ?? 0),
            0,
          );

    const ytdContributionTotals = groupSummary?.contributionTypeTotalsYtd;
    const ytdContributions = ytdContributionTotals
      ? Object.values(ytdContributionTotals).reduce(
          (sum, value) => sum + Number(value || 0),
          0,
        )
      : null;
    const totalContributions =
      ytdContributions !== null
        ? ytdContributions
        : typeof groupSummary?.totalCollected === "number"
          ? groupSummary.totalCollected
          : contributions.reduce(
              (sum, record) => sum + Number(record.paidAmount ?? 0),
              0,
            );

    const upcomingMeetings = (upcomingMeetingsQuery.data ?? []).length;
    const recentMeetings = recentCompletedMeetingsQuery.data ?? [];
    const totalPresent = recentMeetings.reduce(
      (sum, meeting) => sum + Number(meeting.present ?? 0),
      0,
    );
    const totalExpected = recentMeetings.reduce(
      (sum, meeting) => sum + Number(meeting.totalMembers ?? 0),
      0,
    );
    const attendanceRate =
      totalExpected > 0
        ? Math.round((totalPresent / totalExpected) * 100)
        : 0;

    return {
      totalMembers,
      pendingApprovals,
      activeLoans,
      pendingLoans,
      totalContributions,
      defaulters,
      upcomingMeetings,
      attendanceRate,
    };
  }, [
    applicants,
    contributions,
    adminLoanAppsQuery.data?.summary,
    loanApplications,
    groupSummary?.totalMembers,
    groupSummary?.totalCollected,
    manageableGroups,
    upcomingMeetingsQuery.data,
    recentCompletedMeetingsQuery.data,
  ]);

  const menuItems = useMemo(() => {
    const items = [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      {
        id: "approvals",
        label: "Member Approvals",
        icon: UserCheck,
        badge: stats.pendingApprovals,
      },
      {
        id: "contributions",
        label: "Contributions",
        icon: TrendingUp,
        badge: stats.defaulters > 0 ? stats.defaulters : undefined,
      },
      { id: "groups", label: "Group Management", icon: Users },
      {
        id: "loans",
        label: "Loan Applications",
        icon: CreditCard,
        badge: stats.pendingLoans,
      },
      { id: "withdrawals", label: "Withdrawals", icon: ArrowDownRight },
      { id: "reports", label: "Financial Reports", icon: BarChart3 },
      { id: "attendance", label: "Attendance", icon: Calendar },
      { id: "coordinators", label: "Group Coordinators", icon: Users },
      { id: "announcements", label: "Announcements", icon: Bell },
      { id: "sms", label: "SMS Center", icon: MessageSquare },
    ];

    const coordinatorOnly = new Set(["approvals"]);

    return isCoordinator
      ? items
      : items.filter((item) => !coordinatorOnly.has(item.id));
  }, [
    stats.pendingApprovals,
    stats.defaulters,
    stats.pendingLoans,
    isCoordinator,
  ]);

  const activeTab = menuItems.some((item) => item.id === tab)
    ? (tab as string)
    : "overview";

  useEffect(() => {
    if (!isAdminAuthorized) return;
    if (!tab || !menuItems.some((item) => item.id === tab)) {
      navigate("/admin/overview", { replace: true });
    }
  }, [tab, menuItems, navigate, isAdminAuthorized]);

  const handleApprove = async (id: string, notes: string) => {
    try {
      await approveMemberMutation.mutateAsync({ membershipId: id, notes });
      toast({
        title: "Application Approved",
        description: "Member has been approved successfully.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to approve member.",
            )
          : "Failed to approve member.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      await rejectMemberMutation.mutateAsync({ membershipId: id, notes });
      toast({
        title: "Application Rejected",
        description: "Member application has been rejected.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to reject member.",
            )
          : "Failed to reject member.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleMarkPaid = async (id: string) => {
    const record = contributions.find((c) => c.id === id);
    const parts = String(id).split("|");
    const userId = parts[0] || "";
    const groupId = parts[1] || "";
    const year = Number(parts[2]);
    const month = Number(parts[3]);

    if (
      !record ||
      !userId ||
      !groupId ||
      !Number.isFinite(year) ||
      !Number.isFinite(month)
    ) {
      toast({
        title: "Error",
        description: "Unable to mark this contribution as paid.",
        variant: "destructive",
      });
      return;
    }

    try {
      await markPaidMutation.mutateAsync({
        userId,
        groupId,
        year,
        month,
        amount: record.expectedAmount,
      });

      toast({
        title: "Payment Recorded",
        description: "Contribution has been marked as paid.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message || "Failed to mark paid.",
            )
          : "Failed to mark paid.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleLoanApprove = async (
    id: string,
    notes: string,
    approvedInterestRate?: number | null,
  ) => {
    try {
      await reviewAdminLoanMutation.mutateAsync({
        applicationId: id,
        status: "approved",
        reviewNotes: notes,
        approvedInterestRate: approvedInterestRate ?? null,
      });
      toast({
        title: "Loan Approved",
        description: "Loan application has been approved.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to approve loan.",
            )
          : "Failed to approve loan.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleLoanReject = async (id: string, notes: string) => {
    try {
      await reviewAdminLoanMutation.mutateAsync({
        applicationId: id,
        status: "rejected",
        reviewNotes: notes,
      });
      toast({
        title: "Loan Rejected",
        description: "Loan application has been rejected.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to reject loan.",
            )
          : "Failed to reject loan.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleStartReview = async (id: string) => {
    try {
      await reviewAdminLoanMutation.mutateAsync({
        applicationId: id,
        status: "under_review",
      });
      toast({
        title: "Review Started",
        description: "Loan application is now under review.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to start review.",
            )
          : "Failed to start review.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleLoanDisburse = async (
    id: string,
    repaymentStartDate?: string | null,
    bankAccountId?: string | null,
  ) => {
    try {
      const application = await disburseAdminLoanMutation.mutateAsync({
        applicationId: id,
        repaymentStartDate: repaymentStartDate || null,
        bankAccountId: bankAccountId || null,
      });

      const payoutStatus = application?.payoutStatus;
      if (payoutStatus === "otp") {
        toast({
          title: "OTP Required",
          description:
            "Paystack requires OTP authorization to complete this disbursement.",
        });
      } else if (payoutStatus && payoutStatus !== "success") {
        toast({
          title: "Disbursement Processing",
          description:
            "The transfer is processing. You can verify or retry if needed.",
        });
      } else {
        toast({
          title: "Loan Disbursed",
          description: "Loan funds have been disbursed and schedule created.",
        });
      }

      return application;
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to disburse loan.",
            )
          : "Failed to disburse loan.";
      toast({ title: "Error", description: message, variant: "destructive" });
      return null;
    }
  };

  const handleLoanFinalizeOtp = async (
    id: string,
    transferCode: string,
    otp: string,
    repaymentStartDate?: string | null,
  ) =>
    finalizeLoanOtpMutation.mutateAsync({
      applicationId: id,
      transferCode,
      otp,
      repaymentStartDate: repaymentStartDate ?? null,
    });

  const handleLoanResendOtp = async (
    id: string,
    transferCode: string,
  ) => resendLoanOtpMutation.mutateAsync({ applicationId: id, transferCode });

  const handleLoanVerifyTransfer = async (
    id: string,
    repaymentStartDate?: string | null,
  ) =>
    verifyLoanTransferMutation.mutateAsync({
      applicationId: id,
      repaymentStartDate: repaymentStartDate ?? null,
    });

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (announcementTarget === "selected" && selectedGroups.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one group.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const announcement = await createAnnouncementMutation.mutateAsync({
        title: announcementTitle,
        message: announcementMessage,
        target: announcementTarget === "selected" ? "selected" : "all",
        groupNumbers: announcementTarget === "selected" ? selectedGroups : [],
        sendEmail,
        sendSMS,
        sendNotification,
        senderName: "CRC Connect Admin",
      });

      const emailSent = announcement?.channels?.email?.sent ?? 0;
      const smsSent = announcement?.channels?.sms?.sent ?? 0;

      toast({
        title: "Announcement Sent",
        description: `Email: ${emailSent} sent â€¢ SMS: ${smsSent} sent`,
      });

      setShowAnnouncementModal(false);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setSelectedGroups([]);
    } catch (error: unknown) {
      let message = "Failed to send announcement.";
      if (error && typeof error === "object" && "message" in error) {
        message = (error as { message?: string }).message || message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenGroupSettings = (group: AdminGroupRow) => {
    setGroupActionTarget(group);
    setShowGroupSettingsPanel(true);
  };

  const handleOpenEditGroup = (group: AdminGroupRow) => {
    setGroupActionTarget(group);
    setShowEditGroupModal(true);
  };

  const handleOpenAddMembers = (group: AdminGroupRow) => {
    setGroupActionTarget(group);
    setMemberSearchQuery("");
    setSelectedMemberIds([]);
    setShowAddMembersModal(true);
  };

  const handleOpenDeleteGroup = (group: AdminGroupRow) => {
    setGroupActionTarget(group);
    setDeleteConfirmText("");
    setShowDeleteGroupModal(true);
  };

  const handleAssignCoordinator = (group: AdminGroupRow) => {
    if (!canAssignCoordinator) {
      toast({
        title: "Read-only",
        description: "Only admins can assign or edit coordinators.",
        variant: "destructive",
      });
      return;
    }

    setCoordinatorActionTarget(group);
    setCoordinatorSearch("");
    setSelectedCoordinatorId(group.coordinatorId || null);
    setShowAssignCoordinator(true);
  };

  const handleRemoveCoordinator = (group: AdminGroupRow) => {
    if (!canAssignCoordinator) {
      toast({
        title: "Read-only",
        description: "Only admins can assign or edit coordinators.",
        variant: "destructive",
      });
      return;
    }

    setCoordinatorActionTarget(group);
    setShowRemoveCoordinator(true);
  };

  const saveCoordinatorAssignment = async () => {
    if (!coordinatorActionTarget) return;
    if (!canAssignCoordinator) return;
    if (!selectedCoordinatorId) {
      toast({
        title: "Select a Coordinator",
        description: "Choose an active member to assign as coordinator.",
        variant: "destructive",
      });
      return;
    }

    try {
      await setCoordinatorMutation.mutateAsync({
        groupId: coordinatorActionTarget._id,
        coordinatorProfileId: selectedCoordinatorId,
      });

      await Promise.all([
        coordinatorsQuery.refetch(),
        adminGroupsQuery.refetch(),
      ]);

      const selected = coordinatorCandidates.find(
        (candidate) => candidate.id === selectedCoordinatorId,
      );

      toast({
        title: coordinatorActionTarget.coordinatorName
          ? "Coordinator Updated"
          : "Coordinator Assigned",
        description: selected
          ? `${selected.fullName} has been assigned as coordinator for ${coordinatorActionTarget.groupName}.`
          : "Coordinator updated successfully.",
      });
      setShowAssignCoordinator(false);
    } catch (error: unknown) {
      toast({
        title: "Update Failed",
        description: "Failed to update coordinator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowAssignCoordinator(false);
    }
  };

  const confirmRemoveCoordinator = async () => {
    if (!coordinatorActionTarget || !canAssignCoordinator) return;
    try {
      await setCoordinatorMutation.mutateAsync({
        groupId: coordinatorActionTarget._id,
        removeCoordinator: true,
      });

      await Promise.all([
        coordinatorsQuery.refetch(),
        adminGroupsQuery.refetch(),
      ]);

      toast({
        title: "Coordinator Removed",
        description: `Coordinator removed from ${coordinatorActionTarget.groupName}.`,
      });
      setShowRemoveCoordinator(false);
    } catch (error: unknown) {
      toast({
        title: "Remove Failed",
        description: "Failed to remove coordinator. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateGroup = async (data: GroupFormData) => {
    try {
      const payload = {
        groupName: data.name,
        description: data.description || "",
        category: data.category || null,
        location: data.location || null,
        meetingFrequency: data.meetingFrequency || null,
        meetingDay: data.meetingDay || null,
        rules: data.rules || null,
        imageUrl: data.image || null,
        isOpen: data.isOpen,
        monthlyContribution: Number(data.monthlyContribution),
        maxMembers: Number(data.maxMembers),
      } satisfies Partial<BackendGroup>;

      await createGroupMutation.mutateAsync(payload);

      toast({
        title: "Group Created",
        description: `Group "${data.name}" has been created successfully.`,
      });
      setShowCreateGroupModal(false);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to create group.",
            )
          : "Failed to create group.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleUpdateGroup = async (data: GroupFormData) => {
    if (!groupActionTarget) return;
    try {
      const payload = {
        groupName: data.name,
        description: data.description || "",
        category: data.category || null,
        location: data.location || null,
        meetingFrequency: data.meetingFrequency || null,
        meetingDay: data.meetingDay || null,
        rules: data.rules || null,
        imageUrl: data.image || null,
        isOpen: data.isOpen,
        monthlyContribution: Number(data.monthlyContribution),
        maxMembers: Number(data.maxMembers),
      } satisfies Partial<BackendGroup>;

      const updated = await updateGroupMutation.mutateAsync({
        groupId: groupActionTarget._id,
        updates: payload,
      });

      setGroupActionTarget((prev) => (prev ? { ...prev, ...updated } : prev));
      toast({
        title: "Group Updated",
        description: `Changes saved for "${data.name}".`,
      });
      setShowEditGroupModal(false);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to update group.",
            )
          : "Failed to update group.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const toggleCandidateSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAddMembers = async () => {
    if (!activeGroupId || selectedMemberIds.length === 0) return;
    try {
      const result = await addGroupMembersMutation.mutateAsync({
        userIds: selectedMemberIds,
      });
      const conflicts = result.conflicts ?? 0;
      const conflictNote =
        conflicts > 0 ? ` (${conflicts} already in another group)` : "";
      toast({
        title: "Members Added",
        description: `${result.added} added, ${result.skipped} skipped${conflictNote}, ${result.missing} missing.`,
      });
      setShowAddMembersModal(false);
      setSelectedMemberIds([]);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to add members.",
            )
          : "Failed to add members.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupActionTarget) return;
    if (deleteConfirmText.trim() !== groupActionTarget.groupName) {
      toast({
        title: "Confirmation Required",
        description: "Type the exact group name to confirm deletion.",
        variant: "destructive",
      });
      return;
    }
    try {
      await archiveGroupMutation.mutateAsync(groupActionTarget._id);
      toast({
        title: "Group Archived",
        description: "The group has been archived successfully.",
      });
      setShowDeleteGroupModal(false);
      setGroupActionTarget(null);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to archive group.",
            )
          : "Failed to archive group.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const toggleGroupSelection = (groupNumber: number) => {
    setSelectedGroups((prev) =>
      prev.includes(groupNumber)
        ? prev.filter((g) => g !== groupNumber)
        : [...prev, groupNumber],
    );
  };

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdminAuthorized) {
      navigate("/");
    }
  }, [user, loading, isAdminAuthorized, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  if (!isAdminAuthorized) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} fixed inset-y-0 left-0 z-30 bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-gray-800 border-b">
          <div className="flex justify-between items-center">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="flex justify-center items-center bg-emerald-500 rounded-lg w-8 h-8">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-bold">Admin Panel</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-800 text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/admin/${item.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === item.id
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon className="flex-shrink-0 w-5 h-5" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge className="bg-red-500 text-white text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-gray-800 border-t">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 hover:bg-gray-800 px-3 py-2.5 rounded-lg w-full text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Back to Site</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`min-h-screen flex flex-col transition-[margin] duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}
      >
        {/* Header */}
        <header className="top-0 z-20 sticky bg-white px-6 py-4 border-gray-200 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-bold text-gray-900 text-2xl">
                {menuItems.find((m) => m.id === activeTab)?.label ||
                  "Admin Dashboard"}
              </h1>
              <p className="text-gray-500 text-sm">
                CRC Connect Administration
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowAnnouncementModal(true)}
              >
                <Send className="w-4 h-4" />
                Send Announcement
              </Button>
              <div className="flex justify-center items-center bg-emerald-100 rounded-full w-10 h-10">
                <span className="font-medium text-emerald-700">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <AdminStats
                stats={stats}
                visibleCards={
                  isCoordinator ? undefined : ["totalMembers", "attendanceRate"]
                }
              />
              <div
                className={`gap-6 grid grid-cols-1 ${
                  isCoordinator ? "lg:grid-cols-2" : ""
                }`}
              >
                {isCoordinator && (
                  <MemberApprovalPanel
                    applicants={applicants}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                )}
                <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
                  <h3 className="mb-4 font-semibold text-gray-900 text-lg">
                    Quick Actions
                  </h3>
                  <div className="gap-3 grid grid-cols-2">
                    {canAccessCoordinatorPanels && (
                      <Button
                        variant="outline"
                        className="flex-col gap-2 h-20"
                        onClick={() => navigate("/admin/contributions")}
                      >
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <span className="text-sm">View Defaulters</span>
                      </Button>
                    )}
                    {canAccessCoordinatorPanels && (
                      <Button
                        variant="outline"
                        className="flex-col gap-2 h-20"
                        onClick={() => navigate("/admin/loans")}
                      >
                        <CreditCard className="w-6 h-6 text-blue-500" />
                        <span className="text-sm">Review Loans</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-col gap-2 h-20"
                      onClick={() => navigate("/admin/reports")}
                    >
                      <BarChart3 className="w-6 h-6 text-purple-500" />
                      <span className="text-sm">View Reports</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-col gap-2 h-20"
                      onClick={() => setShowAnnouncementModal(true)}
                    >
                      <Bell className="w-6 h-6 text-amber-500" />
                      <span className="text-sm">Send Alert</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "approvals" && isCoordinator && (
            <MemberApprovalPanel
              applicants={applicants}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {activeTab === "contributions" && canAccessCoordinatorPanels && (
            <ContributionTracker
              contributions={contributions}
              onMarkPaid={handleMarkPaid}
              year={trackerYear}
              month={trackerMonth}
              onYearChange={setTrackerYear}
              onMonthChange={setTrackerMonth}
              canManageActions={isCoordinator}
            />
          )}

          {activeTab === "loans" && canAccessCoordinatorPanels && (
            <LoanReviewPanel
              onApprove={handleLoanApprove}
              onReject={handleLoanReject}
              onStartReview={handleStartReview}
              onDisburse={handleLoanDisburse}
              onVerifyTransfer={handleLoanVerifyTransfer}
              onFinalizeOtp={handleLoanFinalizeOtp}
              onResendOtp={handleLoanResendOtp}
              groupOptions={loanGroupOptions}
              canDisburse={isAdmin}
              canFinalizeOtp={isAdmin}
            />
          )}

          {activeTab === "reports" && <FinancialReports />}

          {activeTab === "attendance" && <AttendanceTracker />}

          {activeTab === "groups" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Contribution Groups Management
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {isAdmin
                      ? `Manage all ${groupSummary?.totalGroups ?? manageableGroups.length} contribution groups`
                      : `Manage your coordinated groups (${manageableGroups.length})`}
                  </p>
                </div>
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowCreateGroupModal(true)}
                >
                  <Users className="w-4 h-4" />
                  Create Group
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
                <div className="bg-white p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">
                        {groupSummary?.totalGroups ?? manageableGroups.length}
                      </p>
                      <p className="text-gray-500 text-sm">Total Groups</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">
                        {groupSummary?.withCoordinators ??
                          manageableGroups.filter((g) =>
                            Boolean(g.coordinatorId),
                          ).length}
                      </p>
                      <p className="text-gray-500 text-sm">With Coordinators</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">
                        {formatCompactNaira(groupSummary?.totalCollected ?? 0)}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Total Contributions
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-2xl">
                        {ytdLabel}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Contribution Period
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <GroupFilters
                searchQuery={groupSearchQuery}
                onSearchChange={setGroupSearchQuery}
                selectedCategory={groupCategory}
                onCategoryChange={setGroupCategory}
                categories={groupCategoryOptions}
                selectedLocation={groupLocation}
                onLocationChange={setGroupLocation}
                locations={groupLocationOptions}
                sortBy={groupSortBy}
                onSortChange={setGroupSortBy}
              />

              {/* Groups Overview */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-gray-100 border-b">
                  <h4 className="font-semibold text-gray-900">
                    Groups Overview
                  </h4>
                  {filteredAdminGroups.some(
                    (g) => g.groupNumber === 0 || Boolean(g.isSpecial),
                  ) && (
                    <Badge className="bg-purple-100 text-purple-700">
                      Group 0 = Special Categories
                    </Badge>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          #
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          Group Name
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          Coordinator
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          Members
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          Collection Rate
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          Status
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAdminGroups.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-6 text-gray-500 text-center"
                          >
                            No groups match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAdminGroups.map((group) => (
                          <tr
                            key={group._id}
                            className={
                              group.groupNumber === 0 || group.isSpecial
                                ? "bg-purple-50/50 hover:bg-purple-50"
                                : "hover:bg-gray-50"
                            }
                          >
                            <td className="px-4 py-3">
                              <span
                                className={`flex justify-center items-center rounded-full w-8 h-8 font-medium text-sm ${
                                  group.groupNumber === 0 || group.isSpecial
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {group.groupNumber}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {group.groupName}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {group.coordinatorName || "TBD"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {group.activeMemberCount ??
                                group.memberCount ??
                                0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-gray-200 rounded-full w-20 h-2 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 rounded-full h-full"
                                    style={{
                                      width: `${Math.round(group.collectionRate ?? 0)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-gray-600 text-sm">
                                  {Math.round(group.collectionRate ?? 0)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {group.groupNumber === 0 || group.isSpecial ? (
                                <Badge className="bg-purple-100 text-purple-700">
                                  Special
                                </Badge>
                              ) : String(group.status || "active") ===
                                "active" ? (
                                <Badge className="bg-green-100 text-green-700">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  {String(group.status)}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="hover:bg-gray-100 p-2 rounded-lg transition-colors">
                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenAddMembers(group)}
                                  >
                                    <UserPlus className="mr-2 w-4 h-4" />
                                    Add Members
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEditGroup(group)}
                                  >
                                    <Pencil className="mr-2 w-4 h-4" />
                                    Edit Group
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenGroupSettings(group)
                                    }
                                  >
                                    <Eye className="mr-2 w-4 h-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {canDeleteGroup && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleOpenDeleteGroup(group)
                                      }
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 w-4 h-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-gray-100 border-t">
                  <p className="text-gray-500 text-sm">
                    Showing{" "}
                    <span className="font-medium text-gray-900">
                      {Math.min(
                        (groupMeta?.page ?? groupPage) * groupPageSize,
                        groupMeta?.total ?? filteredAdminGroups.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-900">
                      {groupMeta?.total ?? filteredAdminGroups.length}
                    </span>{" "}
                    groups
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                      disabled={(groupMeta?.page ?? groupPage) <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-gray-600 text-sm">
                      Page{" "}
                      <span className="font-medium text-gray-900">
                        {groupMeta?.page ?? groupPage}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-gray-900">
                        {Math.max(
                          1,
                          Math.ceil(
                            (groupMeta?.total ?? filteredAdminGroups.length) /
                              groupPageSize,
                          ),
                        )}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setGroupPage((p) =>
                          Math.min(
                            Math.ceil(
                              (groupMeta?.total ?? filteredAdminGroups.length) /
                                groupPageSize,
                            ),
                            p + 1,
                          ),
                        )
                      }
                      disabled={
                        (groupMeta?.page ?? groupPage) >=
                        Math.ceil(
                          (groupMeta?.total ?? filteredAdminGroups.length) /
                            groupPageSize,
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              {/* Contribution Types */}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl text-white">
                  <h4 className="font-medium text-emerald-100">
                    Revolving Contributions
                  </h4>
                  <p className="mt-1 font-bold text-2xl">
                    {formatCompactNaira(
                      contributionTypeTotalsYtd?.revolving ?? 0,
                    )}
                  </p>
                  <p className="mt-2 text-emerald-100 text-sm">
                    Groups (YTD: {ytdLabel})
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white">
                  <h4 className="font-medium text-purple-100">
                    Festive Contribution
                  </h4>
                  <p className="mt-1 font-bold text-2xl">
                    {formatCompactNaira(
                      contributionTypeTotalsYtd?.festive ?? 0,
                    )}
                  </p>
                  <p className="mt-2 text-purple-100 text-sm">
                    Group 0 - Festival
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white">
                  <h4 className="font-medium text-blue-100">
                    Endwell Contribution
                  </h4>
                  <p className="mt-1 font-bold text-2xl">
                    {formatCompactNaira(
                      contributionTypeTotalsYtd?.endwell ?? 0,
                    )}
                  </p>
                  <p className="mt-2 text-blue-100 text-sm">
                    Group 0 - Long Term
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-xl text-white">
                  <h4 className="font-medium text-amber-100">
                    Special Contribution
                  </h4>
                  <p className="mt-1 font-bold text-2xl">
                    {formatCompactNaira(
                      contributionTypeTotalsYtd?.special ?? 0,
                    )}
                  </p>
                  <p className="mt-2 text-amber-100 text-sm">
                    Group 0 - Voluntary
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "coordinators" && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
              <div className="p-4 border-gray-100 border-b">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Group Coordinators Directory
                </h3>
                <p className="text-gray-500 text-sm">
                  Contact information for group coordinators across{" "}
                  <span className="font-medium text-gray-700">
                    {coordinatorTotal}
                  </span>{" "}
                  groups
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                        #
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                        Group Name
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                        Coordinator
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                        Phone
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                        Email
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coordinatorsQuery.isLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-gray-500 text-center"
                        >
                          Loading coordinators...
                        </td>
                      </tr>
                    ) : coordinatorGroups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-gray-500 text-center"
                        >
                          No coordinators found.
                        </td>
                      </tr>
                    ) : (
                      coordinatorGroups.map((group) => (
                        <tr
                          key={group.groupNumber}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <span className="flex justify-center items-center bg-emerald-100 rounded-full w-8 h-8 font-medium text-emerald-700 text-sm">
                              {group.groupNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {group.groupName}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {group.coordinatorName || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {group.coordinatorPhone ? (
                              <a
                                href={`tel:${group.coordinatorPhone.split(",")[0]}`}
                                className="flex items-center gap-1 text-emerald-600 hover:underline"
                              >
                                <Phone className="w-4 h-4" />
                                {group.coordinatorPhone}
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {group.coordinatorEmail ? (
                              <a
                                href={`mailto:${group.coordinatorEmail}`}
                                className="flex items-center gap-1 text-emerald-600 hover:underline"
                              >
                                <Mail className="w-4 h-4" />
                                {group.coordinatorEmail}
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="hover:bg-gray-100 p-2 rounded-lg transition-colors">
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  disabled={!group.coordinatorEmail}
                                  onClick={() => {
                                    setSelectedGroups([group.groupNumber]);
                                    setAnnouncementTarget("selected");
                                    setShowAnnouncementModal(true);
                                  }}
                                >
                                  <Send className="mr-2 w-4 h-4" />
                                  Message
                                </DropdownMenuItem>
                                {canAssignCoordinator && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAssignCoordinator(group)
                                      }
                                    >
                                      <UserPlus className="mr-2 w-4 h-4" />
                                      {group.coordinatorName
                                        ? "Change Coordinator"
                                        : "Assign Coordinator"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleRemoveCoordinator(group)
                                      }
                                      disabled={!group.coordinatorName}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <UserMinus className="mr-2 w-4 h-4" />
                                      Remove Coordinator
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-gray-100 border-t">
                <p className="text-gray-500 text-sm">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(
                      coordinatorPageValue * coordinatorPageSize,
                      coordinatorTotal,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {coordinatorTotal}
                  </span>{" "}
                  coordinators
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCoordinatorPage((p) => Math.max(1, p - 1))
                    }
                    disabled={coordinatorPageValue <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-gray-600 text-sm">
                    Page{" "}
                    <span className="font-medium text-gray-900">
                      {coordinatorPageValue}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-900">
                      {coordinatorTotalPages}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCoordinatorPage((p) =>
                        Math.min(coordinatorTotalPages, p + 1),
                      )
                    }
                    disabled={coordinatorPageValue >= coordinatorTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowAnnouncementModal(true)}
                >
                  <Send className="w-4 h-4" />
                  New Announcement
                </Button>
              </div>
              <div className="bg-white shadow-sm p-8 border border-gray-100 rounded-xl text-center">
                <Bell className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">
                  Send Announcements
                </h3>
                <p className="mb-4 text-gray-500">
                  Send important updates to group coordinators via email or
                  in-app notifications.
                </p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowAnnouncementModal(true)}
                >
                  Create Announcement
                </Button>
              </div>
            </div>
          )}

          {activeTab === "withdrawals" && canAccessCoordinatorPanels && (
            <WithdrawalApprovalPanel
              canCompletePayout={isAdmin}
              canFinalizeOtp={isAdmin}
            />
          )}

          {activeTab === "sms" && (
            <div className="space-y-6">
              <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
                <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex justify-center items-center bg-emerald-100 rounded-full w-12 h-12">
                      <MessageSquare className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        SMS Sent Today
                      </h3>
                      <p className="font-bold text-emerald-600 text-2xl">
                        {smsStatsQuery.data?.today?.sent ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex justify-center items-center bg-blue-100 rounded-full w-12 h-12">
                      <Send className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        This Month
                      </h3>
                      <p className="font-bold text-blue-600 text-2xl">
                        {(
                          smsStatsQuery.data?.month?.sent ?? 0
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex justify-center items-center bg-purple-100 rounded-full w-12 h-12">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Delivery Rate
                      </h3>
                      <p className="font-bold text-purple-600 text-2xl">
                        {Number(
                          smsStatsQuery.data?.deliveryRatePct ?? 0,
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
                <h3 className="mb-4 font-semibold text-gray-900 text-lg">
                  Send Bulk SMS
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Recipients
                    </label>
                    <Select
                      value={smsRecipientsTarget}
                      onValueChange={(v) =>
                        setSmsRecipientsTarget(
                          v as
                            | "all"
                            | "coordinators"
                            | "defaulters"
                            | "selected",
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        <SelectItem value="coordinators">
                          Group Coordinators Only
                        </SelectItem>
                        <SelectItem value="defaulters">
                          Defaulters Only
                        </SelectItem>
                        <SelectItem value="selected">
                          Selected Groups
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {smsRecipientsTarget === "selected" && (
                    <div>
                      <label className="block mb-2 font-medium text-gray-700 text-sm">
                        Select Groups
                      </label>
                      <div className="space-y-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                        {manageableGroups.map((group) => (
                          <label
                            key={group.groupNumber}
                            className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedGroups.includes(
                                group.groupNumber,
                              )}
                              onCheckedChange={() =>
                                toggleGroupSelection(group.groupNumber)
                              }
                            />
                            <span className="text-sm">
                              Group {group.groupNumber}: {group.groupName}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Message Template
                    </label>
                    <Select
                      value={smsTemplateKey}
                      onValueChange={(v) => {
                        setSmsTemplateKey(v);
                        if (v === "custom") return;
                        const template = (smsTemplatesQuery.data ?? []).find(
                          (t) => t.key === v,
                        );
                        if (template) setSmsMessage(template.body);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Message</SelectItem>
                        {(smsTemplatesQuery.data ?? []).map((t) => (
                          <SelectItem key={t.key} value={t.key}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Message
                    </label>
                    <Textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Enter your SMS message... (Max 160 characters for single SMS)"
                      rows={4}
                    />
                    <p className="mt-1 text-gray-500 text-xs">
                      {smsMessage.length}/160 characters
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={async () => {
                        if (!smsMessage.trim()) {
                          toast({
                            title: "Error",
                            description: "Please enter a message",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (
                          smsRecipientsTarget === "selected" &&
                          selectedGroups.length === 0
                        ) {
                          toast({
                            title: "Error",
                            description: "Please select at least one group.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setIsSending(true);
                        try {
                          const dispatch =
                            await sendBulkSmsMutation.mutateAsync({
                              message: smsMessage,
                              target: smsRecipientsTarget,
                              groupNumbers:
                                smsRecipientsTarget === "selected"
                                  ? selectedGroups
                                  : undefined,
                            });

                          toast({
                            title: "SMS Sent",
                            description: `Successfully sent ${dispatch?.channels?.sms?.sent ?? 0} SMS messages`,
                          });
                          setSmsMessage("");
                          setSmsTemplateKey("custom");
                          setSelectedGroups([]);
                        } catch (error: unknown) {
                          let message = "Failed to send SMS";
                          if (
                            error &&
                            typeof error === "object" &&
                            "message" in error
                          ) {
                            message =
                              (error as { message?: string }).message ||
                              message;
                          }
                          toast({
                            title: "Error",
                            description: message,
                            variant: "destructive",
                          });
                        } finally {
                          setIsSending(false);
                        }
                      }}
                      disabled={isSending}
                    >
                      {isSending ? "Sending..." : "Send SMS"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
                <h3 className="mb-4 font-semibold text-gray-900 text-lg">
                  SMS Templates
                </h3>
                <div className="space-y-3">
                  {(smsTemplatesQuery.data ?? []).map((template) => (
                    <div
                      key={template.key}
                      className="hover:bg-gray-50 p-4 border rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {template.name}
                          </p>
                          <p className="max-w-md text-gray-500 text-sm truncate">
                            {template.body}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSmsTemplateKey(template.key);
                            setSmsMessage(template.body);
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(smsTemplatesQuery.data ?? []).length === 0 && (
                    <p className="text-gray-500 text-sm">
                      No templates available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSubmit={handleCreateGroup}
      />

      {/* Edit Group Modal */}
      <CreateGroupModal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        onSubmit={handleUpdateGroup}
        mode="edit"
        initialValues={editGroupDefaults}
      />

      {/* Group Management Panel */}
      <GroupManagementPanel
        open={showGroupSettingsPanel}
        group={groupManagementSummary}
        members={membersForTracker}
        contributions={contributionsForTracker}
        meetings={meetingsForDetails}
        membersLoading={groupMembersQuery.isLoading}
        contributionsLoading={groupContributionsQuery.isLoading}
        meetingsLoading={groupMeetingsQuery.isLoading}
        onClose={() => setShowGroupSettingsPanel(false)}
        onInviteMembers={() => {
          if (groupActionTarget) handleOpenAddMembers(groupActionTarget);
        }}
      />

      {/* Add Members Modal */}
      <Dialog
        open={showAddMembersModal}
        onOpenChange={(open) => {
          setShowAddMembersModal(open);
          if (!open) {
            setSelectedMemberIds([]);
            setMemberSearchQuery("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Search Users
              </label>
              <Input
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone"
              />
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {memberCandidatesQuery.isLoading ? (
                <div className="py-6 text-gray-500 text-sm text-center">
                  Loading candidates...
                </div>
              ) : (memberCandidatesQuery.data ?? []).length === 0 ? (
                <div className="py-6 text-gray-500 text-sm text-center">
                  No eligible members found.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {(memberCandidatesQuery.data ?? []).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center gap-3 hover:bg-gray-50 px-4 py-3"
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(candidate.id)}
                        onCheckedChange={() =>
                          toggleCandidateSelection(candidate.id)
                        }
                      />
                      <img
                        src={
                          candidate.avatarUrl ||
                          "https://res.cloudinary.com/dhngpbp2y/image/upload/v1759249303/default-avatar_qh8mcr.png"
                        }
                        alt={candidate.fullName || "Member"}
                        className="rounded-full w-8 h-8 object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {candidate.fullName || "Member"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {candidate.email || candidate.phone || "No contact"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-gray-500 text-sm">
                Selected: {selectedMemberIds.length}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMembersModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMembers}
                  disabled={
                    addGroupMembersMutation.isPending ||
                    selectedMemberIds.length === 0
                  }
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {addGroupMembersMutation.isPending
                    ? "Adding..."
                    : "Add Members"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog
        open={showDeleteGroupModal}
        onOpenChange={(open) => {
          setShowDeleteGroupModal(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Group Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-amber-600">
              <AlertTriangle className="mt-1 w-5 h-5" />
              <p className="text-gray-600 text-sm">
                This action will archive the group and disable new member joins.
                To confirm, type the group name exactly.
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Group Name
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={groupActionTarget?.groupName || "Group name"}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteGroupModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteGroup}
                disabled={
                  archiveGroupMutation.isPending ||
                  deleteConfirmText.trim() !== groupActionTarget?.groupName
                }
                className="bg-red-600 hover:bg-red-700"
              >
                {archiveGroupMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Coordinator Modal */}
      <Dialog
        open={showAssignCoordinator}
        onOpenChange={setShowAssignCoordinator}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {coordinatorActionTarget?.coordinatorName
                ? "Change Coordinator"
                : "Assign Coordinator"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Group
              </label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10 font-bold text-emerald-700">
                  {coordinatorActionTarget?.groupNumber}
                </div>
                <span className="font-medium">
                  {coordinatorActionTarget?.groupName}
                </span>
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Search Group Members
              </label>
              <Input
                value={coordinatorSearch}
                onChange={(e) => setCoordinatorSearch(e.target.value)}
                placeholder="Search by name, email, or phone"
              />
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {coordinatorMembersQuery.isLoading ? (
                <div className="py-6 text-gray-500 text-sm text-center">
                  Loading members...
                </div>
              ) : coordinatorCandidates.length === 0 ? (
                <div className="py-6 text-gray-500 text-sm text-center">
                  No active members found.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {coordinatorCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setSelectedCoordinatorId(candidate.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                        selectedCoordinatorId === candidate.id
                          ? "bg-emerald-50"
                          : ""
                      }`}
                    >
                      <div className="flex justify-center items-center bg-emerald-100 rounded-full w-9 h-9 font-semibold text-emerald-700 text-sm">
                        {candidate.fullName
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {candidate.fullName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {candidate.email || candidate.phone || "No contact"}
                        </p>
                      </div>
                      {selectedCoordinatorId === candidate.id && (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAssignCoordinator(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={saveCoordinatorAssignment}
                disabled={
                  !selectedCoordinatorId || setCoordinatorMutation.isPending
                }
              >
                {setCoordinatorMutation.isPending
                  ? "Updating..."
                  : `${coordinatorActionTarget?.coordinatorName ? "Update" : "Assign"} Coordinator`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Coordinator Confirmation */}
      <Dialog
        open={showRemoveCoordinator}
        onOpenChange={setShowRemoveCoordinator}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Coordinator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              This will remove the coordinator from{" "}
              <span className="font-semibold text-gray-900">
                {coordinatorActionTarget?.groupName}
              </span>
              . The member will remain in the group.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRemoveCoordinator(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmRemoveCoordinator}
                disabled={setCoordinatorMutation.isPending}
              >
                {setCoordinatorMutation.isPending ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Modal */}
      <Dialog
        open={showAnnouncementModal}
        onOpenChange={setShowAnnouncementModal}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Title
              </label>
              <Input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Enter announcement title..."
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Message
              </label>
              <Textarea
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Enter your announcement message..."
                rows={5}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Recipients
              </label>
              <Select
                value={announcementTarget}
                onValueChange={setAnnouncementTarget}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Group Coordinators</SelectItem>
                  <SelectItem value="selected">Selected Groups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {announcementTarget === "selected" && (
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Select Groups
                </label>
                <div className="space-y-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                  {manageableGroups.map((group) => (
                    <label
                      key={group.groupNumber}
                      className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedGroups.includes(group.groupNumber)}
                        onCheckedChange={() =>
                          toggleGroupSelection(group.groupNumber)
                        }
                      />
                      <span className="text-sm">
                        Group {group.groupNumber}: {group.groupName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block font-medium text-gray-700 text-sm">
                Delivery Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sendEmail}
                    onCheckedChange={(checked) =>
                      setSendEmail(checked as boolean)
                    }
                  />
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Send Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sendNotification}
                    onCheckedChange={(checked) =>
                      setSendNotification(checked as boolean)
                    }
                  />
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">In-App Notification</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAnnouncementModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSendAnnouncement}
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send Announcement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

