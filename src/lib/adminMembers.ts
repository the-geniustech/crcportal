import { api, getApiErrorMessage } from "@/lib/api/client";
import { USER_ROLE, type UserRole } from "@/lib/roles";

export type AdminMemberStatus =
  | "pending"
  | "active"
  | "rejected"
  | "inactive"
  | "suspended";

export type AdminProfileStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended";

export type AdminMemberRole =
  | "member"
  | "coordinator"
  | "treasurer"
  | "secretary"
  | "admin";

export type AdminMemberSort =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "serial-asc"
  | "serial-desc"
  | "joined-desc"
  | "joined-asc";

export interface AdminMemberRow {
  membershipId: string;
  profileId: string;
  userId: string | null;
  memberSerial: string | null;
  memberNumber: number | null;
  fullName: string;
  email: string;
  phone: string;
  groupId: string;
  groupName: string;
  groupNumber: number | null;
  role: AdminMemberRole;
  status: AdminMemberStatus;
  joinedAt: string | null;
  requestedAt: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  profileMembershipStatus: AdminProfileStatus | null;
  userRoles: UserRole[];
  accountActive: boolean;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
}

export interface AdminMemberSummary {
  totalRecords: number;
  uniqueMembers: number;
  groupsCovered: number;
  activeMembers: number;
  pendingMembers: number;
  suspendedMembers: number;
  inactiveMembers: number;
  rejectedMembers: number;
  newThisMonth: number;
}

export interface AdminMembersResponse {
  members: AdminMemberRow[];
  summary: AdminMemberSummary;
  meta: {
    total: number;
    page: number;
    limit: number;
    results: number;
  };
}

export interface AdminMemberDetail extends AdminMemberRow {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  occupation?: string | null;
  employer?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  nextOfKinRelationship?: string | null;
  reviewNotes?: string | null;
  memberships: Array<{
    membershipId: string;
    groupId: string;
    groupName: string;
    groupNumber: number | null;
    role: AdminMemberRole;
    status: AdminMemberStatus;
    memberSerial: string | null;
    memberNumber: number | null;
    joinedAt: string | null;
    requestedAt: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  stats: {
    totalContributions: number;
    contributionCount: number;
    totalWithdrawals: number;
    withdrawalCount: number;
    loanApplications: number;
    totalBorrowed: number;
    meetingsAttended: number;
    activeMemberships: number;
  };
}

export interface AdminManagedUserRoleRecord {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  roles: UserRole[];
  profileId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminMemberPayload {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  password?: string;
  groupId?: string;
  role?: AdminMemberRole;
  status?: AdminMemberStatus;
  profileMembershipStatus?: AdminProfileStatus;
  memberSerial?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  occupation?: string | null;
  employer?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
  nextOfKinRelationship?: string | null;
  reviewNotes?: string | null;
}

export async function listAdminMembers(
  params: {
    search?: string;
    status?: string;
    profileStatus?: string;
    role?: string;
    groupId?: string;
    sort?: AdminMemberSort;
    page?: number;
    limit?: number;
  } = {},
): Promise<AdminMembersResponse> {
  try {
    const res = await api.get("/admin/members", { params });
    const payload = res.data ?? {};
    return {
      members: (payload?.data?.members ?? []) as AdminMemberRow[],
      summary: (payload?.data?.summary ?? {
        totalRecords: 0,
        uniqueMembers: 0,
        groupsCovered: 0,
        activeMembers: 0,
        pendingMembers: 0,
        suspendedMembers: 0,
        inactiveMembers: 0,
        rejectedMembers: 0,
        newThisMonth: 0,
      }) as AdminMemberSummary,
      meta: {
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? params.page ?? 1),
        limit: Number(payload?.limit ?? params.limit ?? 0),
        results: Number(payload?.results ?? 0),
      },
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

function extractFilename(value: unknown): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const match = /filename="?([^"]+)"?/i.exec(String(raw));
  return match?.[1] || null;
}

export async function getAdminMemberDetails(
  membershipId: string,
): Promise<AdminMemberDetail> {
  try {
    const res = await api.get(`/admin/members/${membershipId}`);
    return res.data?.data?.member as AdminMemberDetail;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function createAdminMember(
  payload: AdminMemberPayload,
): Promise<AdminMemberDetail> {
  try {
    const res = await api.post("/admin/members", payload);
    return res.data?.data?.member as AdminMemberDetail;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function updateAdminMember(
  membershipId: string,
  payload: AdminMemberPayload,
): Promise<AdminMemberDetail> {
  try {
    const res = await api.patch(`/admin/members/${membershipId}`, payload);
    return res.data?.data?.member as AdminMemberDetail;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function deleteAdminMember(
  membershipId: string,
  confirmation: string,
): Promise<{
  membershipId: string;
  profileId: string;
  userId: string;
  deletedMemberships: number;
  affectedGroups: number;
  deletedLoanApplications: number;
}> {
  try {
    const res = await api.delete(`/admin/members/${membershipId}`, {
      data: { confirmation },
    });
    return res.data?.data?.summary as {
      membershipId: string;
      profileId: string;
      userId: string;
      deletedMemberships: number;
      affectedGroups: number;
      deletedLoanApplications: number;
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function promoteAdminMember(
  userId: string,
): Promise<AdminManagedUserRoleRecord> {
  try {
    const res = await api.patch(`/users/${userId}/role`, {
      role: USER_ROLE.ADMIN,
    });
    return res.data?.data?.user as AdminManagedUserRoleRecord;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function downloadAdminMembersExport(
  params: {
    search?: string;
    status?: string;
    profileStatus?: string;
    role?: string;
    groupId?: string;
    sort?: AdminMemberSort;
    format: "pdf" | "csv" | "xlsx";
  },
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get("/admin/members/export", {
      params,
      responseType: "blob",
    });
    const contentType =
      (res.headers?.["content-type"] as string) || "application/octet-stream";
    const filename =
      extractFilename(res.headers?.["content-disposition"]) ||
      `members-management.${params.format}`;
    return {
      blob: new Blob([res.data], { type: contentType }),
      filename,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
