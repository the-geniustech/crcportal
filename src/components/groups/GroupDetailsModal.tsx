import React, { useState } from "react";
import {
  X,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  MessageCircle,
  Clock,
  Crown,
  Shield,
  User,
  CreditCard,
  Wallet,
  AlertTriangle,
  CircleDashed,
  CheckCircle2,
} from "lucide-react";
import { normalizeContributionType } from "@/lib/contributionPolicy";

export interface Member {
  id: string;
  name: string;
  avatar: string;
  role: "admin" | "treasurer" | "secretary" | "member";
  joinedDate: string;
  totalContributed: number;
}

export interface Contribution {
  memberId: string;
  month: number;
  year: number;
  amount: number;
  status: "pending" | "completed" | "verified" | "overdue";
  contributionType?: string | null;
  paidDate?: string;
}

export interface Loan {
  id: string;
  loanCode?: string | null;
  loanType?: string | null;
  loanAmount: number;
  approvedAmount?: number | null;
  approvedInterestRate?: number | null;
  interestRate?: number | null;
  interestRateType?: "annual" | "monthly" | "total" | null;
  totalRepayable?: number | null;
  remainingBalance?: number | null;
  repaymentToDate?: number | null;
  status: string;
  createdAt?: string;
  disbursedAt?: string | null;
  updatedAt?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  isVirtual: boolean;
}

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: {
    id: string;
    name: string;
    description: string;
    location: string;
    memberCount: number;
    maxMembers: number;
    monthlyContribution: number;
    totalSavings: number;
    category: string;
    image: string;
    isOpen: boolean;
    createdAt: string;
    rules?: string;
  } | null;
  members: Member[];
  meetings: Meeting[];
  contributions: Contribution[];
  loans: Loan[];
  membersLoading?: boolean;
  meetingsLoading?: boolean;
  contributionsLoading?: boolean;
  loansLoading?: boolean;
  isMember: boolean;
  onJoinRequest: () => void;
  onOpenChat: () => void;
}

const roleIcons = {
  admin: Crown,
  treasurer: Shield,
  secretary: User,
  member: User,
};

const roleColors = {
  admin: "text-amber-500",
  treasurer: "text-blue-500",
  secretary: "text-purple-500",
  member: "text-gray-400",
};

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  meetings,
  contributions,
  loans,
  membersLoading = false,
  meetingsLoading = false,
  contributionsLoading = false,
  loansLoading = false,
  isMember,
  onJoinRequest,
  onOpenChat,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "meetings" | "contributions"
  >("overview");

  if (!isOpen || !group) return null;

  const formatCurrency = (value: number) => {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `₦${safeValue.toLocaleString()}`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "\u2014";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "\u2014";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLoanStatusKey = (status?: string | null) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return "unknown";
    if (["overdue", "defaulted", "default"].includes(normalized)) return "overdue";
    if (["completed", "repaid", "closed", "paid"].includes(normalized)) return "repaid";
    if (["disbursed", "active"].includes(normalized)) return "active";
    if (["approved"].includes(normalized)) return "approved";
    if (["pending", "under_review", "review"].includes(normalized)) return "pending";
    if (["rejected", "declined"].includes(normalized)) return "rejected";
    return "unknown";
  };

  const loanStatusMeta = (status?: string | null) => {
    const key = getLoanStatusKey(status);
    switch (key) {
      case "active":
        return {
          label: "Active",
          classes: "bg-emerald-100 text-emerald-700",
          icon: CreditCard,
        };
      case "approved":
        return {
          label: "Approved",
          classes: "bg-blue-100 text-blue-700",
          icon: Wallet,
        };
      case "overdue":
        return {
          label: "Overdue",
          classes: "bg-red-100 text-red-700",
          icon: AlertTriangle,
        };
      case "repaid":
        return {
          label: "Repaid",
          classes: "bg-gray-100 text-gray-700",
          icon: CheckCircle2,
        };
      case "rejected":
        return {
          label: "Rejected",
          classes: "bg-slate-100 text-slate-600",
          icon: X,
        };
      case "pending":
        return {
          label: "Pending",
          classes: "bg-amber-100 text-amber-700",
          icon: CircleDashed,
        };
      default:
        return {
          label: "In Review",
          classes: "bg-gray-100 text-gray-600",
          icon: CircleDashed,
        };
    }
  };

  const totalMembers = members.length > 0 ? members.length : group.memberCount;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthContributions = contributions.filter((contribution) => {
    if (contribution.year !== currentYear || contribution.month !== currentMonth) {
      return false;
    }
    if (!contribution.contributionType) return true;
    return normalizeContributionType(contribution.contributionType) === "revolving";
  });

  const paidContributions = monthContributions.filter((contribution) =>
    ["completed", "verified"].includes(contribution.status),
  );

  const collectedAmount = paidContributions.reduce(
    (sum, contribution) => sum + Number(contribution.amount || 0),
    0,
  );

  const contributorsCount = new Set(
    paidContributions
      .map((contribution) => contribution.memberId)
      .filter(Boolean),
  ).size;

  const expectedMonthlyTotal =
    totalMembers > 0 ? group.monthlyContribution * totalMembers : 0;

  const progressRaw =
    expectedMonthlyTotal > 0
      ? (collectedAmount / expectedMonthlyTotal) * 100
      : 0;
  const progressPercent = Math.min(100, Math.max(0, progressRaw));
  const showContributionPlaceholder = contributionsLoading;
  const showMembersPlaceholder = membersLoading;
  const collectedLabel = showContributionPlaceholder
    ? "\u2014"
    : formatCurrency(collectedAmount);
  const expectedLabel = showMembersPlaceholder
    ? "\u2014"
    : formatCurrency(expectedMonthlyTotal);
  const contributorsLabel = showContributionPlaceholder
    ? "\u2014"
    : contributorsCount;
  const membersLabel = showMembersPlaceholder ? "\u2014" : totalMembers;
  const progressWidth =
    showContributionPlaceholder || showMembersPlaceholder ? 0 : progressPercent;

  const sortedLoans = [...loans].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const loanSummary = sortedLoans.reduce(
    (acc, loan) => {
      const statusKey = getLoanStatusKey(loan.status);
      const principal = Number(loan.approvedAmount ?? loan.loanAmount ?? 0);
      const remaining = Number(loan.remainingBalance ?? 0);
      acc.total += 1;
      acc.totalApproved += principal;
      if (statusKey === "overdue") acc.overdue += 1;
      if (statusKey === "active") acc.active += 1;
      if (statusKey === "repaid") acc.repaid += 1;
      if (statusKey !== "repaid" && statusKey !== "rejected") {
        acc.outstanding += Math.max(remaining, 0);
      }
      return acc;
    },
    {
      total: 0,
      active: 0,
      overdue: 0,
      repaid: 0,
      totalApproved: 0,
      outstanding: 0,
    },
  );

  const showLoansPlaceholder = loansLoading;
  const loansTotalLabel = showLoansPlaceholder ? "\u2014" : loanSummary.total;
  const loansActiveLabel = showLoansPlaceholder ? "\u2014" : loanSummary.active;
  const loansOverdueLabel = showLoansPlaceholder ? "\u2014" : loanSummary.overdue;
  const loansRepaidLabel = showLoansPlaceholder ? "\u2014" : loanSummary.repaid;
  const loansApprovedLabel = showLoansPlaceholder
    ? "\u2014"
    : formatCurrency(loanSummary.totalApproved);
  const loansOutstandingLabel = showLoansPlaceholder
    ? "\u2014"
    : formatCurrency(loanSummary.outstanding);

  return (
    <div className="z-50 fixed inset-0 bg-black/40">
      <div className="flex flex-col bg-white w-full h-full overflow-hidden">
        {/* Header with Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={group.image}
            alt={group.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button
            onClick={onClose}
            className="top-4 right-4 absolute bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="right-6 bottom-4 left-6 absolute">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  group.isOpen
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {group.isOpen ? "Open for Members" : "Closed"}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full font-medium text-white text-xs">
                {group.category}
              </span>
            </div>
            <h2 className="font-bold text-white text-2xl">{group.name}</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-gray-100 border-b">
          <div className="flex gap-1 px-6 pt-4">
            {(
              ["overview", "members", "meetings", "contributions"] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
                <div className="bg-emerald-50 p-4 rounded-xl">
                  <Users className="mb-2 w-5 h-5 text-emerald-500" />
                  <p className="font-bold text-emerald-700 text-2xl">
                    {totalMembers}
                  </p>
                  <p className="text-emerald-600 text-sm">
                    of {group.maxMembers} members
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <TrendingUp className="mb-2 w-5 h-5 text-blue-500" />
                  <p className="font-bold text-blue-700 text-2xl">
                    {formatCurrency(group.totalSavings)}
                  </p>
                  <p className="text-blue-600 text-sm">Total Savings</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <Calendar className="mb-2 w-5 h-5 text-purple-500" />
                  <p className="font-bold text-purple-700 text-2xl">
                    {formatCurrency(group.monthlyContribution)}
                  </p>
                  <p className="text-purple-600 text-sm">Monthly</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl">
                  <MapPin className="mb-2 w-5 h-5 text-amber-500" />
                  <p className="font-bold text-amber-700 text-lg">
                    {group.location}
                  </p>
                  <p className="text-amber-600 text-sm">Location</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  About This Group
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {group.description}
                </p>
              </div>

              {/* Rules */}
              {group.rules && (
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">
                    Group Rules
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-600 whitespace-pre-line">
                      {group.rules}
                    </p>
                  </div>
                </div>
              )}

              {/* Upcoming Meetings Preview */}
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">
                  Upcoming Meetings
                </h3>
                {meetingsLoading ? (
                  <p className="text-gray-500 text-sm">Loading meetings...</p>
                ) : meetings.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No upcoming meetings scheduled
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meetings.slice(0, 2).map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl"
                      >
                        <div className="flex justify-center items-center bg-emerald-100 rounded-xl w-12 h-12">
                          <Calendar className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {meeting.title}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {meeting.date} at {meeting.time}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            meeting.isVirtual
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {meeting.isVirtual ? "Virtual" : "In-Person"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {membersLoading ? "\u2014" : members.length} Members
                  </h3>
                </div>
              {membersLoading ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Loading members...
                </div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No members to display.
                </div>
              ) : (
                <div className="gap-3 grid">
                  {members.map((member) => {
                    const RoleIcon = roleIcons[member.role];
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl"
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="rounded-full w-12 h-12 object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {member.name}
                            </p>
                            <RoleIcon
                              className={`w-4 h-4 ${roleColors[member.role]}`}
                            />
                          </div>
                          <p className="text-gray-500 text-sm capitalize">
                            {member.role}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-600">
                            {formatCurrency(member.totalContributed)}
                          </p>
                          <p className="text-gray-500 text-xs">Contributed</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Meetings Tab */}
          {activeTab === "meetings" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">
                  Scheduled Meetings
                </h3>
                {isMember && (
                  <button className="bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium text-emerald-600 text-sm transition-colors">
                    Schedule Meeting
                  </button>
                )}
              </div>
              {meetingsLoading ? (
                <div className="py-12 text-center text-gray-500">
                  Loading meetings...
                </div>
              ) : meetings.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto mb-3 w-12 h-12 text-gray-300" />
                  <p className="text-gray-500">
                    No upcoming meetings scheduled
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-4 border border-gray-100 hover:border-emerald-200 rounded-xl transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {meeting.title}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {meeting.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {meeting.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {meeting.location}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            meeting.isVirtual
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {meeting.isVirtual ? "Virtual" : "In-Person"}
                        </span>
                      </div>
                      {isMember && (
                        <div className="flex gap-2 mt-4">
                          <button className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors">
                            Add to Calendar
                          </button>
                          {meeting.isVirtual && (
                            <button className="bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium text-emerald-600 text-sm transition-colors">
                              Join Meeting
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contributions Tab */}
          {activeTab === "contributions" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-xl text-white">
                <p className="mb-1 text-emerald-100">Total Group Savings</p>
                <p className="font-bold text-3xl">
                  {formatCurrency(group.totalSavings)}
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <span>
                    Monthly Target: {expectedLabel}
                  </span>
                </div>
              </div>

              {/* Contribution Progress */}
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">
                  This Month's Progress
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Collected</span>
                    <span className="font-medium text-gray-900">
                      {collectedLabel} / {expectedLabel}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full w-full h-3">
                    <div
                      className="bg-emerald-500 rounded-full h-3"
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                  <p className="mt-2 text-gray-500 text-sm">
                    {contributorsLabel} of {membersLabel} members have
                    contributed
                  </p>
                </div>
              </div>

              {/* Loan Tracking */}
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Loan Tracking Dashboard
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Track active, approved, and repaid loans for this group.
                    </p>
                  </div>
                  <span className="text-gray-400 text-xs">
                    Updated {formatDate(new Date().toISOString())}
                  </span>
                </div>

                <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                  <div className="bg-white p-4 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">
                        Total Loans
                      </span>
                      <Wallet className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-2xl">
                      {loansTotalLabel}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {loansActiveLabel} active
                    </p>
                  </div>

                  <div className="bg-white p-4 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">
                        Approved Volume
                      </span>
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {loansApprovedLabel}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Total principal approved
                    </p>
                  </div>

                  <div className="bg-white p-4 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">
                        Outstanding
                      </span>
                      <CreditCard className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {loansOutstandingLabel}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Active loan balance
                    </p>
                  </div>

                  <div className="bg-white p-4 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wide">
                        Risk Watch
                      </span>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="font-semibold text-gray-900 text-2xl">
                      {loansOverdueLabel}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {loansRepaidLabel} repaid
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
                    <div>
                      <p className="font-medium text-gray-900">Loan Ledger</p>
                      <p className="text-gray-500 text-xs">
                        {loansLoading
                          ? "Loading loan records..."
                          : `${sortedLoans.length} loan record(s)`}
                      </p>
                    </div>
                  </div>

                  {loansLoading ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      Loading loans...
                    </div>
                  ) : sortedLoans.length === 0 ? (
                    <div className="py-10 text-center text-gray-500 text-sm">
                      No loans recorded for this group yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">
                              Loan
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Principal
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Approved
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Remaining
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Progress
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Disbursed
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Updated
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sortedLoans.map((loan) => {
                            const principal = Number(
                              loan.approvedAmount ?? loan.loanAmount ?? 0,
                            );
                            const remaining = Number(loan.remainingBalance ?? 0);
                            const progressRaw =
                              principal > 0
                                ? ((principal - remaining) / principal) * 100
                                : null;
                            const progressValue =
                              progressRaw === null
                                ? null
                                : Math.min(100, Math.max(0, progressRaw));
                            const status = loanStatusMeta(loan.status);
                            const StatusIcon = status.icon;
                            const loanLabel =
                              loan.loanCode ||
                              `LN-${String(loan.id).slice(-6).toUpperCase()}`;
                            return (
                              <tr key={loan.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-900">
                                    {loanLabel}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    Created {formatDate(loan.createdAt)}
                                  </p>
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {formatCurrency(loan.loanAmount)}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {loan.approvedAmount != null
                                    ? formatCurrency(loan.approvedAmount)
                                    : "\u2014"}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {loan.remainingBalance != null
                                    ? formatCurrency(loan.remainingBalance)
                                    : "\u2014"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.classes}`}
                                  >
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {status.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {progressValue === null ? (
                                    <span className="text-gray-400">—</span>
                                  ) : (
                                    <div className="min-w-[120px]">
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{Math.round(progressValue)}%</span>
                                        <span>
                                          {progressValue >= 100 ? "Complete" : "In progress"}
                                        </span>
                                      </div>
                                      <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-emerald-500 rounded-full h-1.5"
                                          style={{ width: `${progressValue}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {formatDate(loan.disbursedAt)}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {formatDate(loan.updatedAt || loan.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 px-6 py-4 border-gray-100 border-t">
          {isMember ? (
            <>
              {/* To be implemented later */}
              {/* <button
                onClick={onOpenChat}
                className="flex flex-1 justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-medium text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Open Group Chat
              </button> */}
              <button className="bg-emerald-50 hover:bg-emerald-100 px-6 py-3 rounded-xl font-medium text-emerald-600 transition-colors">
                Make Contribution
              </button>
            </>
          ) : group.isOpen ? (
            <button
              onClick={onJoinRequest}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-medium text-white transition-colors"
            >
              Request to Join
            </button>
          ) : (
            <p className="flex-1 py-3 text-gray-500 text-center">
              This group is currently not accepting new members
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsModal;
