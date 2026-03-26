import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GroupCard from "@/components/groups/GroupCard";
import GroupFilters from "@/components/groups/GroupFilters";
import GroupDetailsModal, {
  Member,
  Contribution,
  Loan,
} from "@/components/groups/GroupDetailsModal";
import GroupContributionDashboardModal from "@/components/groups/GroupContributionDashboardModal";
import GroupLoanDashboardModal from "@/components/groups/GroupLoanDashboardModal";
import GroupChat from "@/components/groups/GroupChat";
import { useMyGroupMembershipsQuery } from "@/hooks/groups/useMyGroupMembershipsQuery";
import { useJoinGroupMutation } from "@/hooks/groups/useJoinGroupMutation";
import type { BackendGroup } from "@/lib/groups";
import { useGroupMembersQuery } from "@/hooks/groups/useGroupMembersQuery";
import { useGroupMeetingsQuery } from "@/hooks/groups/useGroupMeetingsQuery";
import { useGroupContributionsQuery } from "@/hooks/groups/useGroupContributionsQuery";
import { useGroupLoansQuery } from "@/hooks/groups/useGroupLoansQuery";
import { Users, TrendingUp, Award } from "lucide-react";

type GroupUI = {
  id: string;
  groupNumber: number;
  name: string;
  description: string;
  location: string;
  memberCount: number;
  maxMembers: number;
  monthlyContribution: number;
  totalSavings: number;
  category: string;
  nextMeeting?: string;
  image: string;
  isOpen: boolean;
  createdAt: string;
  rules?: string;
};

const sampleChatMessages = [
  {
    id: "1",
    userId: "1",
    userName: "Adaeze Okonkwo",
    userAvatar:
      "https://res.cloudinary.com/dhngpbp2y/image/upload/v1759249303/default-avatar_qh8mcr.png",
    message:
      "Good morning everyone! Don't forget our meeting this Saturday at 2 PM.",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    isPinned: true,
  },
  {
    id: "2",
    userId: "2",
    userName: "Chukwuemeka Nwosu",
    userAvatar:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766668672850_6ed1c254.png",
    message: "Thanks for the reminder! I'll be there.",
    timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
  },
  {
    id: "3",
    userId: "3",
    userName: "Fatima Ibrahim",
    userAvatar:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766668682958_1cb8d600.png",
    message:
      "Quick update: We've received 85% of this month's contributions. Great work everyone!",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    userId: "4",
    userName: "Oluwaseun Adeyemi",
    userAvatar:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766668673269_b6777153.jpg",
    message: "That's wonderful news!",
    timestamp: new Date(Date.now() - 86400000 + 1800000).toISOString(),
  },
  {
    id: "5",
    userId: "1",
    userName: "Adaeze Okonkwo",
    userAvatar:
      "https://res.cloudinary.com/dhngpbp2y/image/upload/v1759249303/default-avatar_qh8mcr.png",
    message:
      "Also, we have two new loan applications to review. Please come prepared with your thoughts.",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "6",
    userId: "5",
    userName: "Ngozi Eze",
    userAvatar:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766668669713_bcf0e5c8.jpg",
    message:
      "I've reviewed both applications. Happy to share my analysis at the meeting.",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    replyTo: {
      userName: "Adaeze Okonkwo",
      message: "Also, we have two new loan applications to review.",
    },
  },
  {
    id: "7",
    userId: "2",
    userName: "Chukwuemeka Nwosu",
    userAvatar:
      "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766668672850_6ed1c254.png",
    message: "Perfect! See everyone on Saturday.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

const GroupsContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const myGroupsQuery = useMyGroupMembershipsQuery();
  const joinGroupMutation = useJoinGroupMutation();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [sortBy, setSortBy] = useState("popular");
  const [selectedGroup, setSelectedGroup] = useState<GroupUI | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showContributionDashboard, setShowContributionDashboard] =
    useState(false);
  const [showLoanDashboard, setShowLoanDashboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState(sampleChatMessages);

  const selectedGroupId = selectedGroup?.id;
  const groupMembersQuery = useGroupMembersQuery(selectedGroupId);
  const groupMeetingsQuery = useGroupMeetingsQuery(selectedGroupId);
  const groupContributionsQuery = useGroupContributionsQuery(
    selectedGroupId,
    new Date().getFullYear(),
  );
  const groupLoansQuery = useGroupLoansQuery(selectedGroupId);

  const membersForDetails: Member[] = useMemo(() => {
    const raw = groupMembersQuery.data ?? [];
    if (raw.length === 0) return [];

    return raw.map((m) => {
      const userObj =
        typeof m.userId === "object" && m.userId
          ? (m.userId as Record<string, unknown>)
          : null;
      const fullName =
        userObj && typeof userObj.fullName === "string"
          ? userObj.fullName
          : "Member";
      const avatarObj =
        userObj && typeof userObj.avatar === "object" && userObj.avatar
          ? (userObj.avatar as Record<string, unknown>)
          : null;
      const avatarUrl =
        avatarObj && typeof avatarObj.url === "string"
          ? avatarObj.url
          : "https://res.cloudinary.com/dhngpbp2y/image/upload/v1759249303/default-avatar_qh8mcr.png";

      const role = (() => {
        if (m.role === "coordinator") return "admin";
        if (m.role === "treasurer") return "treasurer";
        if (m.role === "secretary") return "secretary";
        return "member";
      })();

      return {
        id: m._id,
        name: fullName,
        avatar: avatarUrl,
        role,
        joinedDate: m.joinedAt
          ? String(m.joinedAt).slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        totalContributed: m.totalContributed ?? 0,
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

  const contributionsForDetails: Contribution[] = useMemo(() => {
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
            : "";

      return {
        memberId,
        month: c.month,
        year: c.year,
        amount: Number(c.amount ?? 0),
        status: c.status,
        contributionType: c.contributionType,
        paidDate:
          c.status === "pending" || c.status === "overdue"
            ? undefined
            : c.updatedAt || c.createdAt,
      };
    });
  }, [groupContributionsQuery.data]);

  const loansForDetails: Loan[] = useMemo(() => {
    const raw = groupLoansQuery.data ?? [];
    if (raw.length === 0) return [];

    return raw.map((loan) => ({
      id: loan._id,
      loanCode: loan.loanCode ?? null,
      loanType: loan.loanType ?? null,
      loanAmount: Number(loan.loanAmount ?? 0),
      groupName: loan.groupName ?? null,
      borrowerName: loan.borrowerName ?? null,
      borrowerEmail: loan.borrowerEmail ?? null,
      borrowerPhone: loan.borrowerPhone ?? null,
      approvedAmount:
        loan.approvedAmount === null || loan.approvedAmount === undefined
          ? null
          : Number(loan.approvedAmount),
      approvedInterestRate:
        loan.approvedInterestRate === null ||
        loan.approvedInterestRate === undefined
          ? null
          : Number(loan.approvedInterestRate),
      interestRate:
        loan.interestRate === null || loan.interestRate === undefined
          ? null
          : Number(loan.interestRate),
      interestRateType: loan.interestRateType ?? null,
      totalRepayable:
        loan.totalRepayable === null || loan.totalRepayable === undefined
          ? null
          : Number(loan.totalRepayable),
      remainingBalance:
        loan.remainingBalance === null || loan.remainingBalance === undefined
          ? null
          : Number(loan.remainingBalance),
      repaymentToDate:
        loan.repaymentToDate === null || loan.repaymentToDate === undefined
          ? null
          : Number(loan.repaymentToDate),
      status: loan.status || "unknown",
      createdAt: loan.createdAt,
      disbursedAt: loan.disbursedAt ?? null,
      updatedAt: loan.updatedAt,
    }));
  }, [groupLoansQuery.data]);

  const myGroupIdSet = useMemo(() => {
    const ids = new Set<string>();

    const memberships = myGroupsQuery.data;
    if (Array.isArray(memberships) && memberships.length > 0) {
      for (const m of memberships) {
        const groupId = m.groupId;
        const id = typeof groupId === "string" ? groupId : groupId?._id;
        if (id) ids.add(String(id));
      }
    }
    return ids;
  }, [myGroupsQuery.data]);

  const hasNonZeroMembership = useMemo(() => {
    const memberships = myGroupsQuery.data ?? [];
    if (!Array.isArray(memberships) || memberships.length === 0) return false;

    return memberships.some((m) => {
      const group =
        typeof m.groupId === "object" && m.groupId
          ? (m.groupId as BackendGroup)
          : null;
      if (!group) return false;
      return Number(group.groupNumber) !== 0;
    });
  }, [myGroupsQuery.data]);

  const groupsData: GroupUI[] = useMemo(() => {
    const memberships = myGroupsQuery.data ?? [];
    if (!Array.isArray(memberships) || memberships.length === 0) return [];

    return memberships
      .map((m) => {
        const group =
          typeof m.groupId === "object" && m.groupId
            ? (m.groupId as BackendGroup)
            : null;
        if (!group) return null;

        return {
          id: group._id,
          groupNumber: group.groupNumber,
          name: group.groupName,
          description: group.description || "",
          location: group.location || "Nigeria",
          memberCount: group.memberCount || 0,
          maxMembers: group.maxMembers,
          monthlyContribution: group.monthlyContribution,
          totalSavings: group.totalSavings || 0,
          category: group.category || "General",
          nextMeeting: group.meetingDay || undefined,
          image:
            group.imageUrl ||
            "https://d64gsuwffb70l.cloudfront.net/694d1e2d65df4113e9e6f7e1_1766668648245_79b3ca67.png",
          isOpen: typeof group.isOpen === "boolean" ? group.isOpen : true,
          createdAt: group.createdAt
            ? String(group.createdAt).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          rules: group.rules || undefined,
        } as GroupUI;
      })
      .filter((group): group is GroupUI => Boolean(group));
  }, [myGroupsQuery.data]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(groupsData.map((g) => g.category).filter((cat) => Boolean(cat))),
    ) as string[];
    return ["All Categories", ...unique.sort()];
  }, [groupsData]);

  const locationOptions = useMemo(() => {
    const unique = Array.from(
      new Set(groupsData.map((g) => g.location).filter((loc) => Boolean(loc))),
    ) as string[];
    return ["All Locations", ...unique.sort()];
  }, [groupsData]);

  React.useEffect(() => {
    if (!categoryOptions.includes(selectedCategory)) {
      setSelectedCategory("All Categories");
    }
  }, [categoryOptions, selectedCategory]);

  React.useEffect(() => {
    if (!locationOptions.includes(selectedLocation)) {
      setSelectedLocation("All Locations");
    }
  }, [locationOptions, selectedLocation]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let result = [...groupsData];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query) ||
          g.location.toLowerCase().includes(query),
      );
    }

    // Category filter
    if (selectedCategory !== "All Categories") {
      result = result.filter((g) => g.category === selectedCategory);
    }

    // Location filter
    if (selectedLocation !== "All Locations") {
      result = result.filter((g) => g.location === selectedLocation);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "savings":
        result.sort((a, b) => b.totalSavings - a.totalSavings);
        break;
      case "contribution":
        result.sort((a, b) => a.monthlyContribution - b.monthlyContribution);
        break;
      case "popular":
      default:
        result.sort((a, b) => b.memberCount - a.memberCount);
    }

    return result;
  }, [groupsData, searchQuery, selectedCategory, selectedLocation, sortBy]);

  if (loading || myGroupsQuery.isLoading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full w-16 h-16 animate-spin"></div>
          <p className="text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleViewDetails = (groupId: string) => {
    const group = groupsData.find((g) => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      setShowDetailsModal(true);
    }
  };

  const handleOpenContributionDashboard = (groupId: string) => {
    const group = groupsData.find((g) => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      setShowDetailsModal(false);
      setShowLoanDashboard(false);
      setShowContributionDashboard(true);
    }
  };

  const handleOpenLoanDashboard = (groupId: string) => {
    const group = groupsData.find((g) => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      setShowDetailsModal(false);
      setShowContributionDashboard(false);
      setShowLoanDashboard(true);
    }
  };

  const joinLimitReason =
    "You can only join one group. Group 0 is the only additional group allowed.";

  const getJoinBlockReason = (group?: GroupUI | null) => {
    if (!group) return null;
    if (group.groupNumber === 0) return null;
    if (myGroupIdSet.has(group.id)) return null;
    if (!hasNonZeroMembership) return null;
    return joinLimitReason;
  };

  const handleJoinRequest = async (groupId: string) => {
    const target =
      groupsData.find((g) => g.id === groupId) ??
      (selectedGroup?.id === groupId ? selectedGroup : null);
    const blockReason = getJoinBlockReason(target);
    if (blockReason) {
      toast({
        title: "Join Restricted",
        description: blockReason,
        variant: "destructive",
      });
      return;
    }
    try {
      await joinGroupMutation.mutateAsync(groupId);
      toast({
        title: "Joined Group",
        description: "You have joined this group successfully.",
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(
              (error as { message?: string }).message ||
                "Failed to join group. Please try again.",
            )
          : "Failed to join group. Please try again.";
      toast({
        title: "Join Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleOpenChat = () => {
    setShowDetailsModal(false);
    setShowChat(true);
  };

  const handleSendMessage = (message: string) => {
    const newMsg = {
      id: Date.now().toString(),
      userId: "current",
      userName: profile?.full_name || "You",
      userAvatar:
        profile?.avatar_url ||
        "https://res.cloudinary.com/dhngpbp2y/image/upload/v1759249303/default-avatar_qh8mcr.png",
      message,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  // Stats
  const formatCompactNaira = (amount: number) => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value)) return "₦0";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatCompactNumber = (amount: number) => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value)) return "0";
    return new Intl.NumberFormat("en-NG", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const totalGroups = groupsData.length;
  const totalMembers = groupsData.reduce((acc, g) => acc + g.memberCount, 0);
  const totalSavings = groupsData.reduce((acc, g) => acc + g.totalSavings, 0);
  const myGroups = myGroupIdSet.size;
  const selectedJoinBlockReason = getJoinBlockReason(selectedGroup);

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex md:flex-row flex-col md:justify-between md:items-center mb-8">
          <div>
            <h1 className="font-bold text-gray-900 text-2xl">
              Cooperative Groups
            </h1>
            <p className="mt-1 text-gray-600">
              View and manage your cooperative savings groups
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mb-8">
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-emerald-100 rounded-lg w-10 h-10">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {formatCompactNumber(totalGroups)}
                </p>
                <p className="text-gray-500 text-sm">Groups Joined</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {formatCompactNumber(totalMembers)}
                </p>
                <p className="text-gray-500 text-sm">Members in Your Groups</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {formatCompactNaira(totalSavings)}
                </p>
                <p className="text-gray-500 text-sm">Group Savings</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {formatCompactNumber(myGroups)}
                </p>
                <p className="text-gray-500 text-sm">Active Memberships</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <GroupFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categoryOptions}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          locations={locationOptions}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white p-12 border border-gray-100 rounded-2xl text-center">
            <Users className="mx-auto mb-4 w-16 h-16 text-gray-300" />
            <h3 className="mb-2 font-semibold text-gray-900 text-xl">
              No groups found
            </h3>
            <p className="mb-6 text-gray-500">
              {groupsData.length > 0
                ? "Try adjusting your filters or search query."
                : "You haven't joined any groups yet. Reach out to your coordinator or admin to be added."}
            </p>
          </div>
        ) : (
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const joinBlockedReason = getJoinBlockReason(group);
              return (
                <div key={group.id} className="relative">
                  <GroupCard
                    group={group}
                    isMember={myGroupIdSet.has(group.id)}
                    onViewDetails={handleViewDetails}
                    onJoinRequest={handleJoinRequest}
                    onOpenContributionDashboard={
                      handleOpenContributionDashboard
                    }
                    onOpenLoanDashboard={handleOpenLoanDashboard}
                    joinDisabled={Boolean(joinBlockedReason)}
                    joinDisabledReason={joinBlockedReason || undefined}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {filteredGroups.length > 0 && (
          <p className="mt-8 text-gray-500 text-center">
            Showing {filteredGroups.length} of {totalGroups} groups
          </p>
        )}
      </main>

      {/* Modals */}
      <GroupDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        group={selectedGroup}
        members={membersForDetails}
        meetings={meetingsForDetails}
        contributions={contributionsForDetails}
        loans={loansForDetails}
        membersLoading={groupMembersQuery.isLoading}
        meetingsLoading={groupMeetingsQuery.isLoading}
        contributionsLoading={groupContributionsQuery.isLoading}
        loansLoading={groupLoansQuery.isLoading}
        isMember={selectedGroup ? myGroupIdSet.has(selectedGroup.id) : false}
        joinDisabled={Boolean(selectedJoinBlockReason)}
        joinDisabledReason={selectedJoinBlockReason || undefined}
        onJoinRequest={() => {
          if (selectedGroup) {
            handleJoinRequest(selectedGroup.id);
            setShowDetailsModal(false);
          }
        }}
        onOpenChat={handleOpenChat}
      />

      <GroupChat
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        groupName={selectedGroup?.name || ""}
        groupImage={selectedGroup?.image || ""}
        memberCount={selectedGroup?.memberCount || 0}
        messages={chatMessages}
        currentUserId="current"
        onSendMessage={handleSendMessage}
      />

      <GroupContributionDashboardModal
        isOpen={showContributionDashboard}
        onClose={() => setShowContributionDashboard(false)}
        group={selectedGroup}
        members={membersForDetails}
        contributions={contributionsForDetails}
        membersLoading={groupMembersQuery.isLoading}
        contributionsLoading={groupContributionsQuery.isLoading}
      />

      <GroupLoanDashboardModal
        isOpen={showLoanDashboard}
        onClose={() => setShowLoanDashboard(false)}
        group={selectedGroup}
        loans={loansForDetails}
        loansLoading={groupLoansQuery.isLoading}
      />
    </div>
  );
};

const Groups: React.FC = () => {
  return (
    <AuthProvider>
      <GroupsContent />
    </AuthProvider>
  );
};

export default Groups;
