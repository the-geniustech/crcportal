import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { hasUserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAdminGroupsQuery } from "@/hooks/admin/useAdminGroupsQuery";
import { useAdminContributionTrackingQuery } from "@/hooks/admin/useAdminContributionTrackingQuery";
import { useAdminSpecialContributionSummaryQuery } from "@/hooks/admin/useAdminSpecialContributionSummaryQuery";
import { useSetGroupCoordinatorMutation } from "@/hooks/groups/useSetGroupCoordinatorMutation";
import { useGroupMembersQuery } from "@/hooks/groups/useGroupMembersQuery";
import { useGroupContributionsQuery } from "@/hooks/groups/useGroupContributionsQuery";
import { useVerifyGroupContributionMutation } from "@/hooks/groups/useVerifyGroupContributionMutation";
import { useUpdateGroupContributionMutation } from "@/hooks/groups/useUpdateGroupContributionMutation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import {
  Users,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  DollarSign,
  UserPlus,
  UserMinus,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  Star,
  Shield,
  BarChart3,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ContributionTypeOptions,
  normalizeContributionType,
} from "@/lib/contributionPolicy";
import type { ContributionTypeCanonical } from "@/lib/contributionPolicy";
import { USER_ROLE } from "@/lib/roles";

// Types
interface Group {
  id: string;
  group_number: number;
  group_name: string;
  description: string;
  coordinator_id: string | null;
  coordinator_name: string | null;
  coordinator_phone: string | null;
  coordinator_email: string | null;
  monthly_contribution: number;
  total_savings: number;
  member_count: number;
  max_members: number;
  is_special: boolean;
  status: string;
  created_at: string;
}

interface Contribution {
  id: string;
  user_id: string;
  group_id: string;
  month: number;
  year: number;
  amount: number;
  contribution_type: ContributionTypeCanonical;
  status: "pending" | "completed" | "verified" | "overdue";
  payment_reference: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  member_name?: string;
  member_email?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const CONTRIBUTION_TYPE_COLORS: Record<ContributionTypeCanonical, string> = {
  revolving: "bg-emerald-100 text-emerald-700",
  special: "bg-amber-100 text-amber-700",
  endwell: "bg-blue-100 text-blue-700",
  festive: "bg-purple-100 text-purple-700",
};

const CONTRIBUTION_TYPES = ContributionTypeOptions.map((type) => ({
  ...type,
  color: CONTRIBUTION_TYPE_COLORS[type.value],
}));

type GroupCardActionsProps = {
  group: Group;
  canAssignCoordinator: boolean;
  onViewGroup: (group: Group) => void;
  onAssignCoordinator: (group: Group) => void;
  onRemoveCoordinator: (group: Group) => void;
};

const GroupCardActions: React.FC<GroupCardActionsProps> = ({
  group,
  canAssignCoordinator,
  onViewGroup,
  onAssignCoordinator,
  onRemoveCoordinator,
}) => (
  <div className="flex gap-2 pt-3 border-gray-100 border-t">
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      onClick={() => onViewGroup(group)}
    >
      <Eye className="mr-1 w-4 h-4" />
      View
    </Button>
    {canAssignCoordinator && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onAssignCoordinator(group)}>
            <UserPlus className="mr-2 w-4 h-4" />
            {group.coordinator_name
              ? "Change Coordinator"
              : "Assign Coordinator"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRemoveCoordinator(group)}
            disabled={!group.coordinator_name}
            className="text-red-600 focus:text-red-600"
          >
            <UserMinus className="mr-2 w-4 h-4" />
            Remove Coordinator
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )}
  </div>
);

const ContributionGroupsContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const canAssignCoordinator = hasUserRole(user, USER_ROLE.ADMIN);
  const isAllowedUser = hasUserRole(
    user,
    USER_ROLE.ADMIN,
    USER_ROLE.GROUP_COORDINATOR,
  );

  // State
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showAssignCoordinator, setShowAssignCoordinator] = useState(false);
  const [showRemoveCoordinator, setShowRemoveCoordinator] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all-groups");
  const defaultPeriod = useMemo(() => getEffectiveContributionPeriod(), []);
  const [selectedYear, setSelectedYear] = useState(defaultPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.month);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionType, setContributionType] =
    useState<ContributionTypeCanonical>("revolving");

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, idx) => currentYear - idx);
  }, []);

  // Coordinator assignment form
  const [coordinatorSearch, setCoordinatorSearch] = useState("");
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<
    string | null
  >(null);

  // Fetch groups from database
  useEffect(() => {
    // no-op; groups loaded via TanStack Query
  }, []);

  const groupsQuery = useAdminGroupsQuery({
    includeMetrics: false,
    limit: 200,
  });
  const setCoordinatorMutation = useSetGroupCoordinatorMutation();
  const contributionsQuery = useGroupContributionsQuery(
    selectedGroup?.id,
    selectedYear,
  );
  const coordinatorMembersQuery = useGroupMembersQuery(
    showAssignCoordinator ? selectedGroup?.id : undefined,
    { search: coordinatorSearch, status: "active" },
    showAssignCoordinator,
  );
  const verifyContributionMutation = useVerifyGroupContributionMutation();
  const updateContributionMutation = useUpdateGroupContributionMutation();
  const specialSummaryQuery = useAdminSpecialContributionSummaryQuery({
    year: selectedYear,
  });
  const contributionTrackingQuery = useAdminContributionTrackingQuery({
    year: selectedYear,
    month: selectedMonth,
    contributionType,
  });

  useEffect(() => {
    setLoadingGroups(groupsQuery.isLoading);

    if (groupsQuery.data?.groups) {
      const mapped: Group[] = groupsQuery.data.groups.map((g) => ({
        id: g._id,
        group_number: g.groupNumber,
        group_name: g.groupName,
        description: g.description || "",
        coordinator_id: g.coordinatorId || null,
        coordinator_name: g.coordinatorName || null,
        coordinator_phone: g.coordinatorPhone || null,
        coordinator_email: g.coordinatorEmail || null,
        monthly_contribution: g.monthlyContribution,
        total_savings: g.totalSavings || 0,
        member_count: g.memberCount || 0,
        max_members: g.maxMembers,
        is_special: Boolean(g.isSpecial),
        status: g.status || "active",
        created_at: g.createdAt || new Date().toISOString(),
      }));
      setGroups(mapped);
      setLoadingGroups(false);
      return;
    }

    if (groupsQuery.isError) {
      setGroups([]);
      toast({
        title: "Failed to load groups",
        description: "Please refresh to try again.",
        variant: "destructive",
      });
      setLoadingGroups(false);
    }
  }, [groupsQuery.data, groupsQuery.isError, groupsQuery.isLoading, toast]);

  useEffect(() => {
    if (!selectedGroup) return;

    if (contributionsQuery.data && contributionsQuery.data.length > 0) {
      const mapped: Contribution[] = contributionsQuery.data.map((c) => {
        const userObj =
          typeof c.userId === "object" && c.userId
            ? (c.userId as Record<string, unknown>)
            : null;
        const memberName =
          userObj && typeof userObj.fullName === "string"
            ? userObj.fullName
            : undefined;
        const memberEmail =
          userObj && typeof userObj.email === "string"
            ? userObj.email
            : undefined;

        const verifiedObj =
          typeof c.verifiedBy === "object" && c.verifiedBy
            ? (c.verifiedBy as Record<string, unknown>)
            : null;
        const verifiedId =
          verifiedObj &&
          (typeof verifiedObj._id === "string" ||
            typeof verifiedObj.id === "string")
            ? String((verifiedObj._id || verifiedObj.id) as string)
            : null;

        return {
          id: c._id,
          user_id:
            userObj &&
            (typeof userObj._id === "string" || typeof userObj.id === "string")
              ? String((userObj._id || userObj.id) as string)
              : "",
          group_id: c.groupId,
          month: c.month,
          year: c.year,
          amount: c.amount,
          contribution_type:
            normalizeContributionType(c.contributionType) || "revolving",
          status: c.status,
          payment_reference: c.paymentReference ?? null,
          verified_by: verifiedId,
          verified_at: c.verifiedAt ?? null,
          notes: c.notes ?? null,
          created_at: c.createdAt ?? new Date().toISOString(),
          member_name: memberName,
          member_email: memberEmail,
        };
      });

      setContributions(mapped);
      return;
    }

    if (contributionsQuery.isError) {
      setContributions([]);
      toast({
        title: "Failed to load contributions",
        description: "Please refresh to try again.",
        variant: "destructive",
      });
    }
  }, [
    contributionsQuery.data,
    contributionsQuery.isError,
    selectedGroup,
    selectedYear,
    toast,
  ]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.group_name.toLowerCase().includes(query) ||
          g.coordinator_name?.toLowerCase().includes(query) ||
          g.group_number.toString().includes(query),
      );
    }

    if (filterStatus !== "all") {
      if (filterStatus === "with-coordinator") {
        result = result.filter((g) => g.coordinator_name);
      } else if (filterStatus === "without-coordinator") {
        result = result.filter((g) => !g.coordinator_name);
      } else if (filterStatus === "special") {
        result = result.filter((g) => g.is_special);
      }
    }

    return result;
  }, [groups, searchQuery, filterStatus]);

  const specialSummaryByType = useMemo(() => {
    const entries =
      specialSummaryQuery.data?.summary?.map(
        (row) => [row.type, row] as const,
      ) ?? [];
    return new Map(entries);
  }, [specialSummaryQuery.data]);

  const trackingByGroupId = useMemo(() => {
    const rows = contributionTrackingQuery.data?.groups ?? [];
    return new Map(rows.map((row) => [row.groupId, row]));
  }, [contributionTrackingQuery.data]);

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

  // Handle view group details
  const handleViewGroup = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  // Handle assign coordinator
  const handleAssignCoordinator = (group: Group) => {
    if (!canAssignCoordinator) {
      toast({
        title: "Read-only",
        description: "Only admins can assign or edit coordinators.",
        variant: "destructive",
      });
      return;
    }

    setSelectedGroup(group);
    setCoordinatorSearch("");
    setSelectedCoordinatorId(group.coordinator_id || null);
    setShowAssignCoordinator(true);
  };

  const handleRemoveCoordinator = (group: Group) => {
    if (!canAssignCoordinator) {
      toast({
        title: "Read-only",
        description: "Only admins can assign or edit coordinators.",
        variant: "destructive",
      });
      return;
    }

    setSelectedGroup(group);
    setShowRemoveCoordinator(true);
  };

  // Save coordinator assignment
  const saveCoordinatorAssignment = async () => {
    if (!selectedGroup) return;
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
        groupId: selectedGroup.id,
        coordinatorProfileId: selectedCoordinatorId,
      });

      const selected = coordinatorCandidates.find(
        (candidate) => candidate.id === selectedCoordinatorId,
      );
      if (selected) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === selectedGroup.id
              ? {
                  ...g,
                  coordinator_id: selected.id,
                  coordinator_name: selected.fullName,
                  coordinator_phone: selected.phone,
                  coordinator_email: selected.email,
                }
              : g,
          ),
        );
      }

      toast({
        title: selectedGroup.coordinator_name
          ? "Coordinator Updated"
          : "Coordinator Assigned",
        description: selected
          ? `${selected.fullName} has been assigned as coordinator for ${selectedGroup.group_name}`
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
    if (!selectedGroup || !canAssignCoordinator) return;
    try {
      await setCoordinatorMutation.mutateAsync({
        groupId: selectedGroup.id,
        removeCoordinator: true,
      });

      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id
            ? {
                ...g,
                coordinator_id: null,
                coordinator_name: null,
                coordinator_phone: null,
                coordinator_email: null,
              }
            : g,
        ),
      );

      toast({
        title: "Coordinator Removed",
        description: `Coordinator removed from ${selectedGroup.group_name}.`,
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

  // Verify contribution
  const handleVerifyContribution = async (contributionId: string) => {
    if (!selectedGroup) return;

    try {
      const updated = await verifyContributionMutation.mutateAsync({
        groupId: selectedGroup.id,
        contributionId,
      });

      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId
            ? {
                ...c,
                status: updated.status,
                verified_at: updated.verifiedAt ?? new Date().toISOString(),
              }
            : c,
        ),
      );

      toast({
        title: "Contribution Verified",
        description: "The contribution has been marked as verified.",
      });
    } catch {
      toast({
        title: "Verify Failed",
        description: "Failed to verify contribution. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Mark contribution as paid
  const handleMarkPaid = async (contributionId: string) => {
    if (!selectedGroup) return;

    try {
      const paymentReference = `PAY-${Date.now()}`;
      const updated = await updateContributionMutation.mutateAsync({
        groupId: selectedGroup.id,
        contributionId,
        updates: { status: "completed", paymentReference },
      });

      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId
            ? {
                ...c,
                status: updated.status,
                payment_reference: updated.paymentReference ?? paymentReference,
              }
            : c,
        ),
      );

      toast({
        title: "Contribution Recorded",
        description: "The contribution has been marked as paid.",
      });
    } catch {
      toast({
        title: "Update Failed",
        description: "Failed to update contribution. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const groupsWithCoordinator = groups.filter(
      (g) => g.coordinator_name,
    ).length;
    const totalMembers = groups.reduce((acc, g) => acc + g.member_count, 0);
    const totalSavings = groups.reduce((acc, g) => acc + g.total_savings, 0);

    return { totalGroups, groupsWithCoordinator, totalMembers, totalSavings };
  }, [groups]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    } else if (!loading && user && !isAllowedUser) {
      navigate("/");
    }
  }, [user, loading, navigate, isAllowedUser]);

  if (loading || loadingGroups) {
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
  if (!isAllowedUser) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <DashboardHeader />

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex md:flex-row flex-col md:justify-between md:items-center mb-8">
          <div>
            <h1 className="font-bold text-gray-900 text-2xl">
              Contribution Groups
            </h1>
            <p className="mt-1 text-gray-600">
              Manage the {stats.totalGroups} contribution groups and track
              member contributions
            </p>
          </div>
          {/* <div className="flex gap-3 mt-4 md:mt-0">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <BarChart3 className="w-4 h-4" />
              Financial Summary
            </Button>
          </div> */}
        </div>

        <div className="bg-white shadow-sm mb-6 p-4 border border-gray-100 rounded-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-gray-700 text-sm">
              Contribution Period
            </span>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-gray-500 text-xs">
              Window: 27th - 4th (next month)
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4 mb-8">
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-emerald-100 rounded-xl w-12 h-12">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {stats.totalGroups}
                </p>
                <p className="text-gray-500 text-sm">Total Groups</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-xl w-12 h-12">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {stats.groupsWithCoordinator}
                </p>
                <p className="text-gray-500 text-sm">With Coordinators</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-purple-100 rounded-xl w-12 h-12">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  {stats.totalMembers.toLocaleString()}
                </p>
                <p className="text-gray-500 text-sm">Total Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-amber-100 rounded-xl w-12 h-12">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-2xl">
                  ?{(stats.totalSavings / 1000000).toFixed(1)}M
                </p>
                <p className="text-gray-500 text-sm">Total Savings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white p-1 border border-gray-200 rounded-xl">
            <TabsTrigger value="all-groups" className="rounded-lg">
              All Groups
            </TabsTrigger>
            <TabsTrigger value="special-group" className="rounded-lg">
              Group 0 (Special)
            </TabsTrigger>
            <TabsTrigger value="contribution-tracking" className="rounded-lg">
              Contribution Tracking
            </TabsTrigger>
          </TabsList>

          {/* All Groups Tab */}
          <TabsContent value="all-groups" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex md:flex-row flex-col gap-4">
              <div className="relative flex-1">
                <Search className="top-1/2 left-3 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                <Input
                  placeholder="Search groups by name, number, or coordinator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="mr-2 w-4 h-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="with-coordinator">
                    With Coordinator
                  </SelectItem>
                  <SelectItem value="without-coordinator">
                    Without Coordinator
                  </SelectItem>
                  <SelectItem value="special">Special Groups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Groups Grid */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={`bg-white rounded-xl border ${group.is_special ? "border-purple-200 bg-purple-50/30" : "border-gray-100"} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            group.is_special
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {group.group_number}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {group.group_name}
                          </h3>
                          {group.is_special && (
                            <Badge className="bg-purple-100 mt-1 text-purple-700">
                              Special Group
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={
                          group.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {group.status}
                      </Badge>
                    </div>

                    {/* Coordinator Info */}
                    <div className="space-y-2 mb-4">
                      {group.coordinator_name ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-700">
                              {group.coordinator_name}
                            </span>
                          </div>
                          {group.coordinator_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a
                                href={`tel:${group.coordinator_phone}`}
                                className="text-emerald-600 hover:underline"
                              >
                                {group.coordinator_phone}
                              </a>
                            </div>
                          )}
                          {group.coordinator_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <a
                                href={`mailto:${group.coordinator_email}`}
                                className="text-emerald-600 hover:underline truncate"
                              >
                                {group.coordinator_email}
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>No coordinator assigned</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    {!group.is_special && (
                      <div className="gap-3 grid grid-cols-2 py-3 border-gray-100 border-t">
                        <div>
                          <p className="text-gray-500 text-xs">Members</p>
                          <p className="font-semibold text-gray-900">
                            {group.member_count}/{group.max_members}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Monthly</p>
                          <p className="font-semibold text-gray-900">
                            ?{group.monthly_contribution.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <GroupCardActions
                      group={group}
                      canAssignCoordinator={canAssignCoordinator}
                      onViewGroup={handleViewGroup}
                      onAssignCoordinator={handleAssignCoordinator}
                      onRemoveCoordinator={handleRemoveCoordinator}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Special Group Tab */}
          <TabsContent value="special-group" className="space-y-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-8 rounded-2xl text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex justify-center items-center bg-white/20 rounded-2xl w-16 h-16">
                  <Star className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="font-bold text-2xl">
                    Group 0 - Special Categories
                  </h2>
                  <p className="text-purple-200">
                    Festive, Endwell, and Special contributions
                  </p>
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                {CONTRIBUTION_TYPES.filter((t) => t.value !== "revolving").map(
                  (type) => (
                    <div
                      key={type.value}
                      className="bg-white/10 backdrop-blur-sm p-5 rounded-xl"
                    >
                      {(() => {
                        const summary = specialSummaryByType.get(
                          type.value as "festive" | "endwell" | "special",
                        ) as
                          | { totalCollected?: number; contributors?: number }
                          | undefined;
                        const totalCollected = summary?.totalCollected ?? 0;
                        const contributors = summary?.contributors ?? 0;
                        return (
                          <>
                            <h3 className="mb-2 font-semibold text-lg">
                              {type.label}
                            </h3>
                            <p className="font-bold text-3xl">
                              ?{(totalCollected / 1000000).toFixed(1)}M
                            </p>
                            <p className="mt-1 text-purple-200 text-sm">
                              Total collected
                            </p>
                            <div className="mt-4 pt-4 border-white/20 border-t">
                              <p className="text-sm">
                                {contributors.toLocaleString()} contributors
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    // </div>
                  ),
                )}
              </div>
            </div>

            <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
              <h3 className="mb-4 font-semibold text-gray-900">
                Special Contribution Types
              </h3>
              <div className="space-y-4">
                <div className="bg-purple-50 p-4 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex justify-center items-center bg-purple-100 rounded-lg w-10 h-10">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Festive Contribution
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Contributions towards specific festivals
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Endwell Contribution
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Long-term savings (minimum five years)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex justify-center items-center bg-amber-100 rounded-lg w-10 h-10">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Special Contribution
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Bulk contribution with higher minimum
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Contribution Tracking Tab */}
          <TabsContent value="contribution-tracking" className="space-y-6">
            <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
              <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4 mb-6">
                <h3 className="font-semibold text-gray-900">
                  Contribution Tracking
                </h3>
                <div className="flex gap-3">
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={contributionType}
                    onValueChange={setContributionType}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRIBUTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Monthly Contribution Grid */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-gray-200 border-b">
                      <th className="px-4 py-3 font-medium text-gray-600 text-left">
                        Group
                      </th>
                      {MONTHS.slice(0, 10).map((month, idx) => (
                        <th
                          key={month}
                          className="px-2 py-3 font-medium text-gray-600 text-sm text-center"
                        >
                          {month.slice(0, 3)}
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups
                      .filter((g) => !g.is_special)
                      .slice(0, 10)
                      .map((group) => (
                        <tr
                          key={group.id}
                          className="hover:bg-gray-50 border-gray-100 border-b"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex justify-center items-center bg-emerald-100 rounded-lg w-8 h-8 font-medium text-emerald-700 text-sm">
                                {group.group_number}
                              </span>
                              <span className="max-w-[150px] font-medium text-gray-900 truncate">
                                {group.group_name}
                              </span>
                            </div>
                          </td>
                          {MONTHS.slice(0, 10).map((month, idx) => {
                            const trackingRow = trackingByGroupId.get(group.id);
                            const monthNumber = idx + 1;
                            const monthEntry = trackingRow?.months?.find(
                              (m) => m.month === monthNumber,
                            );
                            const status = monthEntry?.status ?? "pending";
                            return (
                              <td key={month} className="px-2 py-3 text-center">
                                <div
                                  className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center ${
                                    status === "verified"
                                      ? "bg-green-100"
                                      : status === "completed"
                                        ? "bg-blue-100"
                                        : "bg-gray-100"
                                  }`}
                                >
                                  {status === "verified" ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : status === "completed" ? (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 font-medium text-gray-900 text-right">
                            ?
                            {(
                              trackingByGroupId.get(group.id)?.totalPaid ?? 0
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-gray-100 border-t">
                <div className="flex items-center gap-2">
                  <div className="flex justify-center items-center bg-green-100 rounded w-6 h-6">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex justify-center items-center bg-blue-100 rounded w-6 h-6">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex justify-center items-center bg-gray-100 rounded w-6 h-6">
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>
                  <span className="text-gray-600 text-sm">Pending</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Group Details Modal */}
      <Dialog open={showGroupDetails} onOpenChange={setShowGroupDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                  selectedGroup?.is_special
                    ? "bg-purple-100 text-purple-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {selectedGroup?.group_number}
              </div>
              {selectedGroup?.group_name}
            </DialogTitle>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6">
              {/* Group Info */}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="mb-3 font-medium text-gray-900">
                    Coordinator
                  </h4>
                  {selectedGroup.coordinator_name ? (
                    <div className="space-y-2">
                      <p className="font-medium">
                        {selectedGroup.coordinator_name}
                      </p>
                      {selectedGroup.coordinator_phone && (
                        <p className="flex items-center gap-2 text-gray-600 text-sm">
                          <Phone className="w-4 h-4" />
                          {selectedGroup.coordinator_phone}
                        </p>
                      )}
                      {selectedGroup.coordinator_email && (
                        <p className="flex items-center gap-2 text-gray-600 text-sm">
                          <Mail className="w-4 h-4" />
                          {selectedGroup.coordinator_email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-amber-600">No coordinator assigned</p>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="mb-3 font-medium text-gray-900">
                    Group Stats
                  </h4>
                  <div className="gap-4 grid grid-cols-2">
                    <div>
                      <p className="text-gray-500 text-sm">Members</p>
                      <p className="font-bold text-gray-900 text-xl">
                        {selectedGroup.member_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Monthly</p>
                      <p className="font-bold text-gray-900 text-xl">
                        ?{selectedGroup.monthly_contribution.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Total Savings</p>
                      <p className="font-bold text-emerald-600 text-xl">
                        ?{selectedGroup.total_savings.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Status</p>
                      <Badge className="bg-green-100 text-green-700">
                        {selectedGroup.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Member Contributions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">
                    Member Contributions - {selectedYear}
                  </h4>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, idx) => (
                        <SelectItem key={month} value={(idx + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-600 text-left">
                          Member
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-left">
                          Amount
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-left">
                          Status
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-left">
                          Reference
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-600 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contributions
                        .filter((c) => c.month === selectedMonth)
                        .map((contribution) => (
                          <tr
                            key={contribution.id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {contribution.member_name}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {contribution.member_email}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              ?{contribution.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className={
                                  contribution.status === "verified"
                                    ? "bg-green-100 text-green-700"
                                    : contribution.status === "completed"
                                      ? "bg-blue-100 text-blue-700"
                                      : contribution.status === "overdue"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                                }
                              >
                                {contribution.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-sm">
                              {contribution.payment_reference || "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                {contribution.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleMarkPaid(contribution.id)
                                    }
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                                {contribution.status === "completed" && (
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() =>
                                      handleVerifyContribution(contribution.id)
                                    }
                                  >
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
              {selectedGroup?.coordinator_name
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
                  {selectedGroup?.group_number}
                </div>
                <span className="font-medium">{selectedGroup?.group_name}</span>
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
                disabled={!selectedCoordinatorId}
              >
                {selectedGroup?.coordinator_name ? "Update" : "Assign"}{" "}
                Coordinator
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
                {selectedGroup?.group_name}
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
    </div>
  );
};

const ContributionGroups: React.FC = () => {
  return (
    <AuthProvider>
      <ContributionGroupsContent />
    </AuthProvider>
  );
};

export default ContributionGroups;

