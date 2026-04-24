import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Hash,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import AdminGroupFilter from "@/components/admin/AdminGroupFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAdminMemberMutation } from "@/hooks/admin/useCreateAdminMemberMutation";
import { useDeleteAdminMemberMutation } from "@/hooks/admin/useDeleteAdminMemberMutation";
import { useAdminMemberDetailsQuery } from "@/hooks/admin/useAdminMemberDetailsQuery";
import { useAdminMembersQuery } from "@/hooks/admin/useAdminMembersQuery";
import { usePromoteAdminMemberMutation } from "@/hooks/admin/usePromoteAdminMemberMutation";
import { useUpdateAdminMemberMutation } from "@/hooks/admin/useUpdateAdminMemberMutation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserRole, normalizeUserRole } from "@/lib/auth";
import type {
  AdminMemberDetail,
  AdminProfileStatus,
  AdminMemberRole,
  AdminMemberRow,
  AdminMemberSort,
  AdminMemberStatus,
} from "@/lib/adminMembers";
import { downloadAdminMembersExport } from "@/lib/adminMembers";
import { USER_ROLE } from "@/lib/roles";

type MemberFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  groupId: string;
  role: AdminMemberRole;
  status: AdminMemberStatus;
  address: string;
  city: string;
  state: string;
  occupation: string;
  employer: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  reviewNotes: string;
};

type MemberStatusSerialFormState = {
  status: AdminMemberStatus;
  memberSerial: string;
};

const PAGE_SIZE = 10;
const roleOptions: Array<{ value: AdminMemberRole; label: string }> = [
  { value: "member", label: "Member" },
  { value: "coordinator", label: "Coordinator" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
  { value: "admin", label: "Group Admin" },
];
const statusOptions: Array<{ value: AdminMemberStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
  { value: "rejected", label: "Rejected" },
];
const profileStatusOptions: Array<{
  value: AdminProfileStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];
const sortOptions: Array<{ value: AdminMemberSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "serial-asc", label: "Serial ascending" },
  { value: "serial-desc", label: "Serial descending" },
  { value: "joined-desc", label: "Recently joined" },
  { value: "joined-asc", label: "Earliest joined" },
];

const EMPTY_MEMBER_FORM: MemberFormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  groupId: "",
  role: "member",
  status: "active",
  address: "",
  city: "",
  state: "",
  occupation: "",
  employer: "",
  nextOfKinName: "",
  nextOfKinPhone: "",
  nextOfKinRelationship: "",
  reviewNotes: "",
};

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  if (currentPage > 3) pages.push("ellipsis");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    case "suspended":
      return <Badge className="bg-orange-100 text-orange-700">Suspended</Badge>;
    case "inactive":
      return <Badge className="bg-slate-100 text-slate-700">Inactive</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status || "Unknown"}</Badge>;
  }
}

function getProfileStatusBadge(status?: string | null) {
  switch (status) {
    case "active":
      return <Badge className="bg-sky-100 text-sky-700">Active</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    case "suspended":
      return <Badge className="bg-orange-100 text-orange-700">Suspended</Badge>;
    case "inactive":
      return <Badge className="bg-slate-100 text-slate-700">Inactive</Badge>;
    default:
      return <Badge variant="outline">{status || "Unknown"}</Badge>;
  }
}

function getRoleLabel(role: AdminMemberRole) {
  return roleOptions.find((option) => option.value === role)?.label || role;
}

function buildFormFromDetail(member: AdminMemberDetail): MemberFormState {
  return {
    fullName: member.fullName ?? "",
    email: member.email ?? "",
    phone: member.phone ?? "",
    password: "",
    groupId: member.groupId ?? "",
    role: member.role,
    status: member.status,
    address: member.address ?? "",
    city: member.city ?? "",
    state: member.state ?? "",
    occupation: member.occupation ?? "",
    employer: member.employer ?? "",
    nextOfKinName: member.nextOfKinName ?? "",
    nextOfKinPhone: member.nextOfKinPhone ?? "",
    nextOfKinRelationship: member.nextOfKinRelationship ?? "",
    reviewNotes: member.reviewNotes ?? "",
  };
}

function validateMemberForm(form: MemberFormState, isCreate: boolean) {
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.email.trim() && !form.phone.trim()) {
    return "Provide at least an email or a phone number.";
  }
  if (isCreate && !form.groupId) return "A group must be selected.";
  if (isCreate && form.password.trim().length < 8) {
    return "Temporary password must be at least 8 characters.";
  }
  return null;
}

export default function MembersManagementPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const [statusFilter, setStatusFilter] = useState("all");
  const [profileStatusFilter, setProfileStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sortBy, setSortBy] = useState<AdminMemberSort>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileStatusOpen, setProfileStatusOpen] = useState(false);
  const [statusSerialOpen, setStatusSerialOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<
    null | "pdf" | "csv" | "xlsx"
  >(null);
  const [selectedMember, setSelectedMember] = useState<AdminMemberRow | null>(null);
  const [createForm, setCreateForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [editForm, setEditForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [profileStatusForm, setProfileStatusForm] =
    useState<AdminProfileStatus>("active");
  const [statusSerialForm, setStatusSerialForm] =
    useState<MemberStatusSerialFormState>({
      status: "active",
      memberSerial: "",
    });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const membersQuery = useAdminMembersQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    profileStatus:
      profileStatusFilter !== "all" ? profileStatusFilter : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    groupId: groupFilter !== "all" ? groupFilter : undefined,
    sort: sortBy,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const detailQuery = useAdminMemberDetailsQuery(
    selectedMember?.membershipId ?? null,
    viewOpen || editOpen,
  );
  const createMutation = useCreateAdminMemberMutation();
  const updateMutation = useUpdateAdminMemberMutation();
  const deleteMutation = useDeleteAdminMemberMutation();
  const promoteMutation = usePromoteAdminMemberMutation();
  const isAdmin = hasUserRole(user, USER_ROLE.ADMIN);

  const members = membersQuery.data?.members ?? [];
  const summary = membersQuery.data?.summary ?? {
    totalRecords: 0,
    uniqueMembers: 0,
    groupsCovered: 0,
    activeMembers: 0,
    pendingMembers: 0,
    suspendedMembers: 0,
    inactiveMembers: 0,
    rejectedMembers: 0,
    newThisMonth: 0,
  };
  const total = membersQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, total);
  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [groupFilter, profileStatusFilter, roleFilter, search, sortBy, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (editOpen && detailQuery.data) {
      setEditForm(buildFormFromDetail(detailQuery.data));
    }
  }, [detailQuery.data, editOpen]);

  const resetCreateForm = () => {
    setCreateForm(EMPTY_MEMBER_FORM);
  };

  const openView = (member: AdminMemberRow) => {
    setSelectedMember(member);
    setViewOpen(true);
  };

  const openEdit = (member: AdminMemberRow) => {
    setSelectedMember(member);
    setEditOpen(true);
  };

  const openDelete = (member: AdminMemberRow) => {
    setSelectedMember(member);
    setDeleteConfirmation("");
    setDeleteOpen(true);
  };

  const openPromote = (member: AdminMemberRow) => {
    setSelectedMember(member);
    setPromoteOpen(true);
  };

  const openProfileStatus = (member: AdminMemberRow) => {
    setSelectedMember(member);
    setProfileStatusForm(member.profileMembershipStatus ?? "active");
    setProfileStatusOpen(true);
  };

  const openStatusSerial = (member: AdminMemberRow) => {
    setSelectedMember(member);
    setStatusSerialForm({
      status: member.status,
      memberSerial: member.memberSerial ?? "",
    });
    setStatusSerialOpen(true);
  };

  const handleCreate = async () => {
    const validationError = validateMemberForm(createForm, true);
    if (validationError) {
      toast({
        title: "Missing details",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim() || null,
        phone: createForm.phone.trim() || null,
        password: createForm.password,
        groupId: createForm.groupId,
        role: createForm.role,
        address: createForm.address.trim() || null,
        city: createForm.city.trim() || null,
        state: createForm.state.trim() || null,
        occupation: createForm.occupation.trim() || null,
        employer: createForm.employer.trim() || null,
        nextOfKinName: createForm.nextOfKinName.trim() || null,
        nextOfKinPhone: createForm.nextOfKinPhone.trim() || null,
        nextOfKinRelationship: createForm.nextOfKinRelationship.trim() || null,
        reviewNotes: createForm.reviewNotes.trim() || null,
      });

      toast({
        title: "Member created",
        description: "User, profile, and active group membership were created successfully.",
      });
      setCreateOpen(false);
      resetCreateForm();
    } catch (error) {
      toast({
        title: "Creation failed",
        description:
          error instanceof Error ? error.message : "Unable to create member.",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedMember) return;

    const validationError = validateMemberForm(editForm, false);
    if (validationError) {
      toast({
        title: "Missing details",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        membershipId: selectedMember.membershipId,
        payload: {
          fullName: editForm.fullName.trim(),
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          role: editForm.role,
          status: editForm.status,
          address: editForm.address.trim() || null,
          city: editForm.city.trim() || null,
          state: editForm.state.trim() || null,
          occupation: editForm.occupation.trim() || null,
          employer: editForm.employer.trim() || null,
          nextOfKinName: editForm.nextOfKinName.trim() || null,
          nextOfKinPhone: editForm.nextOfKinPhone.trim() || null,
          nextOfKinRelationship: editForm.nextOfKinRelationship.trim() || null,
          reviewNotes: editForm.reviewNotes.trim() || null,
        },
      });

      toast({
        title: "Member updated",
        description: "The member record has been updated successfully.",
      });
      setEditOpen(false);
    } catch (error) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Unable to update member.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      await deleteMutation.mutateAsync({
        membershipId: selectedMember.membershipId,
        confirmation: deleteConfirmation.trim(),
      });

      toast({
        title: "Member deleted",
        description: "The member account and related records were removed permanently.",
      });
      setDeleteOpen(false);
      setSelectedMember(null);
      setDeleteConfirmation("");
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Unable to delete member.",
        variant: "destructive",
      });
    }
  };

  const handlePromote = async () => {
    if (!selectedMember?.userId) return;

    try {
      await promoteMutation.mutateAsync(selectedMember.userId);
      toast({
        title: "Admin role granted",
        description:
          "The user now has admin access. Existing roles were preserved.",
      });
      setPromoteOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast({
        title: "Promotion failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to grant admin access to this member.",
        variant: "destructive",
      });
    }
  };

  const handleProfileStatusUpdate = async () => {
    if (!selectedMember) return;

    try {
      await updateMutation.mutateAsync({
        membershipId: selectedMember.membershipId,
        payload: {
          profileMembershipStatus: profileStatusForm,
        },
      });

      toast({
        title: "Profile status updated",
        description: "The member profile status has been updated successfully.",
      });
      setProfileStatusOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to update the member profile status.",
        variant: "destructive",
      });
    }
  };

  const handleStatusSerialUpdate = async () => {
    if (!selectedMember) return;

    try {
      await updateMutation.mutateAsync({
        membershipId: selectedMember.membershipId,
        payload: {
          status: statusSerialForm.status,
          memberSerial: statusSerialForm.memberSerial.trim() || null,
        },
      });

      toast({
        title: "Member status updated",
        description:
          "Membership status and serial details have been updated successfully.",
      });
      setStatusSerialOpen(false);
      setSelectedMember(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to update membership status and serial number.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (format: "pdf" | "csv" | "xlsx") => {
    if (membersQuery.isLoading || total === 0) {
      toast({
        title: "Nothing to export",
        description: "No member records are available for the current filters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setExportingFormat(format);
      const { blob, filename } = await downloadAdminMembersExport({
        format,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        profileStatus:
          profileStatusFilter !== "all" ? profileStatusFilter : undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        groupId: groupFilter !== "all" ? groupFilter : undefined,
        sort: sortBy,
      });
      triggerBlobDownload(blob, filename);
      toast({
        title: "Export ready",
        description: `Members ${format.toUpperCase()} export downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Unable to export members.",
        variant: "destructive",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const selectedDetail = detailQuery.data;
  const deleteKeyword =
    selectedMember?.memberSerial || selectedMember?.fullName || "this member";
  const deleteDisabled =
    deleteMutation.isPending ||
    !selectedMember ||
    deleteConfirmation.trim() !== deleteKeyword;
  const exportDisabled = membersQuery.isLoading || total === 0 || !!exportingFormat;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3">
              <Users className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Records</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.totalRecords}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {summary.uniqueMembers} unique people across {summary.groupsCovered} groups
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3">
              <CheckCircle2 className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.activeMembers}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {summary.pendingMembers} pending and {summary.suspendedMembers} suspended
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3">
              <UserCog className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Needs Attention</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.pendingMembers + summary.suspendedMembers}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {summary.inactiveMembers} inactive and {summary.rejectedMembers} rejected
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-3">
              <Plus className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Added This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.newThisMonth}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            New membership records matching the current scope
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 xl:flex-1">
            <div className="relative md:col-span-2 xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, serial, email, phone, or group"
                className="pl-9"
              />
            </div>
            <AdminGroupFilter
              value={groupFilter}
              onValueChange={setGroupFilter}
              allLabel="All groups"
              placeholder="Filter by group"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Member status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All member statuses</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={profileStatusFilter}
              onValueChange={setProfileStatusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Profile status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All profile statuses</SelectItem>
                {profileStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as AdminMemberSort)}
            >
              <SelectTrigger className="min-w-[190px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => membersQuery.refetch()}
              disabled={membersQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${membersQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" disabled={exportDisabled}>
                  {exportingFormat ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {exportingFormat
                    ? `Exporting ${exportingFormat.toUpperCase()}`
                    : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleExport("pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport("csv")}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Member
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Members Directory</h3>
            <p className="text-sm text-gray-500">
              Search, review, and manage member records across groups.
            </p>
          </div>
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            {total} total
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-gray-500">
                    <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                    Loading members...
                  </TableCell>
                </TableRow>
              )}

              {!membersQuery.isLoading && members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-gray-500">
                    <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    No members matched the current filters.
                  </TableCell>
                </TableRow>
              )}

              {members.map((member) => {
                const normalizedUserRoles = member.userRoles
                  .map((role) => normalizeUserRole(role))
                  .filter(Boolean);
                const isSystemAdmin = normalizedUserRoles.includes(USER_ROLE.ADMIN);
                const isCoordinatorUser = normalizedUserRoles.includes(
                  USER_ROLE.GROUP_COORDINATOR,
                );
                const deleteDisabledForRole = isSystemAdmin || isCoordinatorUser;

                return (
                  <TableRow key={member.membershipId}>
                    <TableCell className="font-medium text-gray-900">
                      {member.memberSerial || "Pending assignment"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                        <div className="mt-1">
                          {getProfileStatusBadge(member.profileMembershipStatus)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-900">{member.email || "-"}</p>
                        <p className="text-gray-500">{member.phone || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{member.groupName}</p>
                        <p className="text-xs text-gray-500">
                          Group {member.groupNumber ?? "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleLabel(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>{formatDate(member.joinedAt || member.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(member)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(member)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Edit member
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openProfileStatus(member)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Update profile status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStatusSerial(member)}>
                            <Hash className="mr-2 h-4 w-4" />
                            Update status & serial
                          </DropdownMenuItem>
                          {isAdmin && !isSystemAdmin && member.userId && (
                            <DropdownMenuItem onClick={() => openPromote(member)}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Promote to admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => openDelete(member)}
                            className="text-red-600 focus:text-red-600"
                            disabled={deleteDisabledForRole}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500">
            Showing {pageStart}-{pageEnd} of {total} member records
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                  }}
                />
              </PaginationItem>
              {pageItems.map((page, index) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Member</DialogTitle>
            <DialogDescription>
              Create a new user, profile, and active group membership in one flow.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-fullName">Full name</Label>
                <Input
                  id="create-fullName"
                  value={createForm.fullName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Enter member name"
                />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <AdminGroupFilter
                  value={createForm.groupId}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({ ...current, groupId: value }))
                  }
                  allValue=""
                  allLabel="Select group"
                  placeholder="Select group"
                  searchPlaceholder="Search groups"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="member@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+234 803 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Temporary password</Label>
                <PasswordInput
                  id="create-password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Group role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({
                      ...current,
                      role: value as AdminMemberRole,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-address">Address</Label>
                <Input
                  id="create-address"
                  value={createForm.address}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-city">City</Label>
                <Input
                  id="create-city"
                  value={createForm.city}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-state">State</Label>
                <Input
                  id="create-state"
                  value={createForm.state}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-occupation">Occupation</Label>
                <Input
                  id="create-occupation"
                  value={createForm.occupation}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      occupation: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-employer">Employer</Label>
                <Input
                  id="create-employer"
                  value={createForm.employer}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      employer: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="create-nok-name">Next of kin name</Label>
                <Input
                  id="create-nok-name"
                  value={createForm.nextOfKinName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      nextOfKinName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-nok-phone">Next of kin phone</Label>
                <Input
                  id="create-nok-phone"
                  value={createForm.nextOfKinPhone}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      nextOfKinPhone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-nok-rel">Relationship</Label>
                <Input
                  id="create-nok-rel"
                  value={createForm.nextOfKinRelationship}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      nextOfKinRelationship: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-review-notes">Setup notes</Label>
              <Textarea
                id="create-review-notes"
                value={createForm.reviewNotes}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    reviewNotes: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Optional notes for this member record"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              Full account, membership, and activity overview for the selected member.
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading && (
            <div className="py-12 text-center text-sm text-gray-500">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Loading member details...
            </div>
          )}

          {!detailQuery.isLoading && selectedDetail && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total Contributions</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {formatCurrency(selectedDetail.stats.totalContributions)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Loan Applications</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {selectedDetail.stats.loanApplications}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Withdrawals</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {selectedDetail.stats.withdrawalCount}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Meetings Attended</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">
                    {selectedDetail.stats.meetingsAttended}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h4 className="text-base font-semibold text-gray-900">Personal Details</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Full name</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedDetail.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedDetail.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedDetail.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Occupation</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedDetail.occupation || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Address</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedDetail.address || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {[selectedDetail.city, selectedDetail.state].filter(Boolean).join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-5">
                  <h4 className="text-base font-semibold text-gray-900">Account Snapshot</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Selected membership</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedDetail.groupName} ({selectedDetail.memberSerial || "Pending serial"})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Role</p>
                      <p className="mt-1 text-sm text-gray-900">{getRoleLabel(selectedDetail.role)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedDetail.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Profile status</p>
                      <div className="mt-1">
                        {getProfileStatusBadge(selectedDetail.profileMembershipStatus)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Account state</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedDetail.accountActive ? "Active" : "Disabled"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Email verified</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedDetail.emailVerifiedAt ? formatDateTime(selectedDetail.emailVerifiedAt) : "Not yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Phone verified</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedDetail.phoneVerifiedAt ? formatDateTime(selectedDetail.phoneVerifiedAt) : "Not yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Created</p>
                      <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedDetail.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Joined</p>
                      <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedDetail.joinedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 p-5">
                <h4 className="text-base font-semibold text-gray-900">Group Memberships</h4>
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDetail.memberships.map((membership) => (
                        <TableRow key={membership.membershipId}>
                          <TableCell>{membership.groupName}</TableCell>
                          <TableCell>{membership.memberSerial || "-"}</TableCell>
                          <TableCell>{getRoleLabel(membership.role)}</TableCell>
                          <TableCell>{getStatusBadge(membership.status)}</TableCell>
                          <TableCell>{formatDate(membership.joinedAt || membership.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setSelectedMember(null);
            setEditForm(EMPTY_MEMBER_FORM);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update personal details, account contact data, and membership state.
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading && (
            <div className="py-12 text-center text-sm text-gray-500">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Loading editable member details...
            </div>
          )}

          {!detailQuery.isLoading && selectedDetail && (
            <>
              <div className="grid gap-6 py-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-fullName">Full name</Label>
                    <Input
                      id="edit-fullName"
                      value={editForm.fullName}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Group role</Label>
                    <Select
                      value={editForm.role}
                      onValueChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          role: value as AdminMemberRole,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Membership status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) =>
                        setEditForm((current) => ({
                          ...current,
                          status: value as AdminMemberStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned group</Label>
                    <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-gray-700">
                      {selectedDetail.groupName}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={editForm.address}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={editForm.city}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      value={editForm.state}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          state: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-occupation">Occupation</Label>
                    <Input
                      id="edit-occupation"
                      value={editForm.occupation}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          occupation: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-employer">Employer</Label>
                    <Input
                      id="edit-employer"
                      value={editForm.employer}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          employer: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nok-name">Next of kin name</Label>
                    <Input
                      id="edit-nok-name"
                      value={editForm.nextOfKinName}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          nextOfKinName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-nok-phone">Next of kin phone</Label>
                    <Input
                      id="edit-nok-phone"
                      value={editForm.nextOfKinPhone}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          nextOfKinPhone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-nok-rel">Relationship</Label>
                    <Input
                      id="edit-nok-rel"
                      value={editForm.nextOfKinRelationship}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          nextOfKinRelationship: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-review-notes">Internal notes</Label>
                  <Textarea
                    id="edit-review-notes"
                    value={editForm.reviewNotes}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        reviewNotes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={profileStatusOpen}
        onOpenChange={(open) => {
          setProfileStatusOpen(open);
          if (!open) {
            setSelectedMember(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Profile Status</DialogTitle>
            <DialogDescription>
              Set the overall profile status for this member record.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">{selectedMember.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Current profile status:
                </p>
                <div className="mt-2">
                  {getProfileStatusBadge(selectedMember.profileMembershipStatus)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>New profile status</Label>
                <Select
                  value={profileStatusForm}
                  onValueChange={(value) =>
                    setProfileStatusForm(value as AdminProfileStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Profile status" />
                  </SelectTrigger>
                  <SelectContent>
                    {profileStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProfileStatusOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleProfileStatusUpdate}
              disabled={updateMutation.isPending || !selectedMember}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update profile status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusSerialOpen}
        onOpenChange={(open) => {
          setStatusSerialOpen(open);
          if (!open) {
            setSelectedMember(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Member Status & Serial</DialogTitle>
            <DialogDescription>
              Manage membership status and the assigned member serial number.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">{selectedMember.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedMember.groupName}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Membership status</Label>
                <Select
                  value={statusSerialForm.status}
                  onValueChange={(value) =>
                    setStatusSerialForm((current) => ({
                      ...current,
                      status: value as AdminMemberStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Membership status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-serial-input">Member serial number</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="status-serial-input"
                    value={statusSerialForm.memberSerial}
                    onChange={(event) =>
                      setStatusSerialForm((current) => ({
                        ...current,
                        memberSerial: event.target.value,
                      }))
                    }
                    placeholder="CRC/G12/0045"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setStatusSerialForm((current) => ({
                        ...current,
                        memberSerial: "",
                      }))
                    }
                  >
                    {selectedMember.memberSerial ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use the format{" "}
                  <span className="font-mono">
                    {"CRC/G{groupNumber}/{memberNumber}"}
                  </span>
                  . The input is prefilled with the current serial when one exists.
                  Use the button to regenerate for an existing member or generate a
                  new serial for a member without one when the membership is saved
                  as active.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusSerialOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleStatusSerialUpdate}
              disabled={updateMutation.isPending || !selectedMember}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save status & serial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={promoteOpen}
        onOpenChange={(open) => {
          setPromoteOpen(open);
          if (!open) {
            setSelectedMember(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Promote to Admin
            </DialogTitle>
            <DialogDescription>
              This grants the selected user system-wide admin access while preserving
              any existing roles they already hold.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">{selectedMember.fullName}</p>
                <p className="mt-1">{selectedMember.groupName}</p>
                <p className="mt-2 text-emerald-800">
                  They will be able to access every admin panel page and admin-only
                  flows across the application.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Continue only if this user should have full admin authority beyond
                their current group membership.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPromoteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handlePromote}
              disabled={promoteMutation.isPending || !selectedMember?.userId}
            >
              {promoteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Promote user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteConfirmation("");
            setSelectedMember(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
              Permanent Delete
            </DialogTitle>
            <DialogDescription>
              This permanently removes the member account, profile, memberships, and linked records.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {selectedMember.fullName} will be deleted permanently.
                    </p>
                    <p>
                      Type <span className="font-semibold">{deleteKeyword}</span> below to confirm.
                    </p>
                    <p>
                      Coordinator and admin accounts must have those privileges removed before deletion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">Confirmation text</Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder={deleteKeyword}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDisabled}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
