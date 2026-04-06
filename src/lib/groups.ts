import { api, getApiErrorMessage } from "./api/client";
import type {
  ContributionTypeCanonical,
  ContributionTypeValue,
} from "./contributionPolicy";

export type BackendGroup = {
  _id: string;
  groupNumber: number;
  groupName: string;
  description?: string;
  coordinatorId?: string | null;
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
  coordinatorEmail?: string | null;
  category?: string | null;
  location?: string | null;
  meetingFrequency?: string | null;
  meetingDay?: string | null;
  rules?: string | null;
  imageUrl?: string | null;
  isOpen?: boolean;
  monthlyContribution: number;
  totalSavings?: number;
  memberCount?: number;
  maxMembers: number;
  isSpecial?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendGroupMembership = {
  _id: string;
  userId: string;
  groupId: string | BackendGroup;
  role: "admin" | "treasurer" | "secretary" | "member";
  status: string;
  joinedAt: string;
  totalContributed: number;
  expectedMonthlyContribution?: number;
  memberNumber?: number | null;
  memberSerial?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listMyGroupMemberships(): Promise<
  BackendGroupMembership[]
> {
  try {
    const res = await api.get("/users/me/groups");
    return (res.data?.data?.memberships ?? []) as BackendGroupMembership[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type ListGroupsParams = {
  page?: number;
  limit?: number;
  sort?: "groupNumber" | "createdAt" | "totalSavings" | "memberCount";
  order?: "asc" | "desc";
  status?: string;
  isOpen?: boolean;
  isSpecial?: boolean;
  category?: string;
  location?: string;
  search?: string;
};

export async function listGroups(params: ListGroupsParams = {}): Promise<{
  groups: BackendGroup[];
  total?: number;
  page?: number;
  limit?: number;
}> {
  try {
    const res = await api.get("/groups", { params });
    return {
      groups: res.data?.data?.groups ?? [],
      total: res.data?.total,
      page: res.data?.page,
      limit: res.data?.limit,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getGroup(groupId: string): Promise<{
  group: BackendGroup;
  membership: BackendGroupMembership | null;
}> {
  try {
    const res = await api.get(`/groups/${groupId}`);
    return {
      group: res.data?.data?.group,
      membership: res.data?.data?.membership ?? null,
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createGroup(input: Partial<BackendGroup>) {
  try {
    const res = await api.post("/groups", input);
    return res.data?.data?.group as BackendGroup;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateGroup(
  groupId: string,
  updates: Partial<BackendGroup>,
) {
  try {
    const res = await api.patch(`/groups/${groupId}`, updates);
    return res.data?.data?.group as BackendGroup;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function archiveGroup(groupId: string) {
  try {
    const res = await api.delete(`/groups/${groupId}`);
    return res.data?.data?.group as BackendGroup;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function setGroupCoordinator(
  groupId: string,
  payload: {
    coordinatorProfileId?: string;
    removeCoordinator?: boolean;
  },
) {
  try {
    const res = await api.patch(`/groups/${groupId}/coordinator`, payload);
    return res.data?.data?.group as BackendGroup;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function joinGroup(groupId: string) {
  try {
    const res = await api.post(`/groups/${groupId}/join`);
    return res.data?.data?.membership as BackendGroupMembership;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function leaveGroup(groupId: string) {
  try {
    await api.post(`/groups/${groupId}/leave`);
    return true;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendGroupMember = {
  _id: string;
  userId: unknown;
  groupId: string;
  role: "member" | "coordinator" | "treasurer" | "secretary" | "admin";
  status: string;
  joinedAt: string;
  totalContributed: number;
  memberNumber?: number | null;
  memberSerial?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listGroupMembers(
  groupId: string,
  params: { search?: string; status?: string } = {},
): Promise<BackendGroupMember[]> {
  try {
    const res = await api.get(`/groups/${groupId}/members`, { params });
    return (res.data?.data?.members ?? []) as BackendGroupMember[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type GroupMemberCandidate = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

export async function listGroupMemberCandidates(
  groupId: string,
  params: { search?: string } = {},
): Promise<GroupMemberCandidate[]> {
  try {
    const res = await api.get(`/groups/${groupId}/members/candidates`, {
      params,
    });
    return (res.data?.data?.candidates ?? []) as GroupMemberCandidate[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function addGroupMembers(
  groupId: string,
  payload: { userIds: string[]; role?: "member" | "coordinator" | "treasurer" | "secretary" | "admin" },
) {
  try {
    const res = await api.post(`/groups/${groupId}/members`, payload);
    return res.data?.data as {
      added: number;
      skipped: number;
      missing: number;
      conflicts?: number;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendContribution = {
  _id: string;
  userId: unknown;
  groupId: string;
  month: number;
  year: number;
  amount: number;
  contributionType?: ContributionTypeValue | null;
  status: "pending" | "completed" | "verified" | "overdue";
  paymentReference?: string | null;
  paymentMethod?: string | null;
  verifiedBy?: unknown;
  verifiedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listGroupContributions(
  groupId: string,
  params: {
    year?: number;
    month?: number;
    status?: string;
    contributionType?: string;
    userId?: string;
  } = {},
) {
  try {
    const res = await api.get(`/groups/${groupId}/contributions`, { params });
    return (res.data?.data?.contributions ?? []) as BackendContribution[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createGroupContribution(
  groupId: string,
  payload: {
    userId?: string;
    month: number;
    year: number;
    amount: number;
    contributionType: ContributionTypeValue;
    status?: BackendContribution["status"];
    paymentReference?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
  },
) {
  try {
    const res = await api.post(`/groups/${groupId}/contributions`, payload);
    return res.data?.data?.contribution as BackendContribution;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function verifyGroupContribution(
  groupId: string,
  contributionId: string,
) {
  try {
    const res = await api.patch(
      `/groups/${groupId}/contributions/${contributionId}/verify`,
    );
    return res.data?.data?.contribution as BackendContribution;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateGroupContribution(
  groupId: string,
  contributionId: string,
  updates: Partial<
    Pick<
      BackendContribution,
      "status" | "paymentReference" | "paymentMethod" | "notes"
    >
  > &
    Partial<Pick<BackendContribution, "amount">>,
) {
  try {
    const res = await api.patch(
      `/groups/${groupId}/contributions/${contributionId}`,
      updates,
    );
    return res.data?.data?.contribution as BackendContribution;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendMeeting = {
  _id: string;
  groupId: string;
  title: string;
  description?: string;
  meetingType: "physical" | "zoom" | "google_meet";
  location?: string | null;
  meetingLink?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
  scheduledDate: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
};

export async function listGroupMeetings(
  groupId: string,
  params: { status?: string } = {},
) {
  try {
    const res = await api.get(`/groups/${groupId}/meetings`, { params });
    return (res.data?.data?.meetings ?? []) as BackendMeeting[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createMeeting(
  groupId: string,
  payload: Partial<BackendMeeting>,
) {
  try {
    const res = await api.post(`/groups/${groupId}/meetings`, payload);
    return res.data?.data?.meeting as BackendMeeting;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateMeeting(
  groupId: string,
  meetingId: string,
  payload: Partial<BackendMeeting>,
) {
  try {
    const res = await api.patch(`/groups/${groupId}/meetings/${meetingId}`, payload);
    return res.data?.data?.meeting as BackendMeeting;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteMeeting(groupId: string, meetingId: string) {
  try {
    await api.delete(`/groups/${groupId}/meetings/${meetingId}`);
    return true;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendAgendaItem = {
  _id: string;
  meetingId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function createAgendaItem(
  groupId: string,
  meetingId: string,
  payload: Omit<BackendAgendaItem, "_id" | "meetingId">,
) {
  try {
    const res = await api.post(
      `/groups/${groupId}/meetings/${meetingId}/agenda`,
      payload,
    );
    return res.data?.data?.item as BackendAgendaItem;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function upsertMeetingMinutes(
  groupId: string,
  meetingId: string,
  payload: {
    content: string;
    attendeesCount?: number;
    decisionsMade?: string[];
    actionItems?: Array<{ task: string; assignee: string; dueDate: string }>;
  },
) {
  try {
    const res = await api.put(
      `/groups/${groupId}/meetings/${meetingId}/minutes`,
      payload,
    );
    return res.data?.data?.minutes;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendGroupVote = {
  _id: string;
  groupId: string;
  title: string;
  description?: string;
  status: "active" | "closed";
  endsAt?: string | null;
  yesVotes: number;
  noVotes: number;
  totalVoters?: number;
  myChoice?: "yes" | "no" | null;
  myVote?: {
    choice: "yes" | "no";
    respondedAt?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendGroupVoteResponse = {
  _id: string;
  groupId: string;
  voteId: string;
  userId: string;
  choice: "yes" | "no";
  createdAt?: string;
  updatedAt?: string;
};

export type BackendGroupVoteParticipant = {
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  memberSerial?: string | null;
  role?: string | null;
  status: "voted" | "pending";
  choice?: "yes" | "no" | null;
  respondedAt?: string | null;
};

export type BackendVoteNotificationChannel = {
  requested: boolean;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type BackendVoteNotificationResult = {
  totalRecipients: number;
  target?: "pending" | "all";
  channels?: {
    email?: BackendVoteNotificationChannel;
    sms?: BackendVoteNotificationChannel;
    notification?: BackendVoteNotificationChannel;
  };
  failures?: Array<{ channel: string; to?: string; error?: string }>;
};

export async function listGroupVotes(
  groupId: string,
  params: { status?: "active" | "closed" } = {},
): Promise<BackendGroupVote[]> {
  try {
    const res = await api.get(`/groups/${groupId}/votes`, { params });
    return (res.data?.data?.votes ?? []) as BackendGroupVote[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createGroupVote(
  groupId: string,
  payload: {
    title: string;
    description?: string;
    status?: "active" | "closed";
    endsAt?: string | null;
    yesVotes?: number;
    noVotes?: number;
    totalVoters?: number;
  },
): Promise<BackendGroupVote> {
  try {
    const res = await api.post(`/groups/${groupId}/votes`, payload);
    return res.data?.data?.vote as BackendGroupVote;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function respondToGroupVote(
  groupId: string,
  voteId: string,
  payload: { choice: "yes" | "no" },
): Promise<{ vote: BackendGroupVote; response: BackendGroupVoteResponse }> {
  try {
    const res = await api.post(
      `/groups/${groupId}/votes/${voteId}/respond`,
      payload,
    );
    return (res.data?.data ?? {}) as {
      vote: BackendGroupVote;
      response: BackendGroupVoteResponse;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteGroupVote(
  groupId: string,
  voteId: string,
): Promise<{ voteId: string }> {
  try {
    const res = await api.delete(`/groups/${groupId}/votes/${voteId}`);
    return (res.data?.data ?? {}) as { voteId: string };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function listGroupVoteParticipants(
  groupId: string,
  voteId: string,
): Promise<{
  vote: BackendGroupVote;
  participants: BackendGroupVoteParticipant[];
  totalMembers: number;
  votedCount: number;
  pendingCount: number;
}> {
  try {
    const res = await api.get(`/groups/${groupId}/votes/${voteId}/participants`);
    return (res.data?.data ?? {}) as {
      vote: BackendGroupVote;
      participants: BackendGroupVoteParticipant[];
      totalMembers: number;
      votedCount: number;
      pendingCount: number;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function notifyGroupVoteMembers(
  groupId: string,
  voteId: string,
  payload: {
    sendEmail?: boolean;
    sendSMS?: boolean;
    sendNotification?: boolean;
    target?: "pending" | "all";
  },
): Promise<BackendVoteNotificationResult> {
  try {
    const res = await api.post(
      `/groups/${groupId}/votes/${voteId}/notify`,
      payload,
    );
    return (res.data?.data ?? {}) as BackendVoteNotificationResult;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendGroupReminderSettings = {
  _id: string;
  groupId: string;
  autoReminders: boolean;
  daysBeforeDue: number;
  overdueReminders: boolean;
  meetingReminders: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getGroupReminderSettings(
  groupId: string,
): Promise<BackendGroupReminderSettings> {
  try {
    const res = await api.get(`/groups/${groupId}/reminder-settings`);
    return res.data?.data?.settings as BackendGroupReminderSettings;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateGroupReminderSettings(
  groupId: string,
  updates: Partial<
    Pick<
      BackendGroupReminderSettings,
      "autoReminders" | "daysBeforeDue" | "overdueReminders" | "meetingReminders"
    >
  >,
): Promise<BackendGroupReminderSettings> {
  try {
    const res = await api.patch(`/groups/${groupId}/reminder-settings`, updates);
    return res.data?.data?.settings as BackendGroupReminderSettings;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function sendGroupContributionReminders(
  groupId: string,
  payload: { year?: number; month?: number } = {},
): Promise<{ sent: number; totalMembers: number; pendingMembers: number }> {
  try {
    const res = await api.post(`/groups/${groupId}/reminders/send`, payload);
    return (res.data?.data ??
      {}) as { sent: number; totalMembers: number; pendingMembers: number };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function downloadGroupContributionReportPdf(
  groupId: string,
  params: { year?: number; month?: number; contributionType?: string } = {},
): Promise<Blob> {
  try {
    const res = await api.get(`/groups/${groupId}/contributions/report`, {
      params,
      responseType: "blob",
    });
    return res.data as Blob;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type GroupContributionTargets = {
  groupId: string;
  monthlyTargets: Record<ContributionTypeCanonical, number>;
  unitAmounts?: Record<ContributionTypeCanonical, number | null>;
  minAmounts?: Record<ContributionTypeCanonical, number | null>;
};

export async function getGroupContributionTargets(
  groupId: string,
): Promise<GroupContributionTargets> {
  try {
    const res = await api.get(`/groups/${groupId}/contributions/targets`);
    return res.data?.data as GroupContributionTargets;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function downloadGroupContributionLedgerPdf(
  groupId: string,
  params: { year?: number; contributionType?: string; interestType?: string } = {},
): Promise<Blob> {
  try {
    const res = await api.get(`/groups/${groupId}/contributions/ledger`, {
      params,
      responseType: "blob",
    });
    return res.data as Blob;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type BackendGroupLoan = {
  _id: string;
  userId?: unknown;
  groupId?: string | null;
  groupName?: string | null;
  loanCode?: string | null;
  loanType?: string | null;
  loanAmount: number;
  borrowerName?: string | null;
  borrowerEmail?: string | null;
  borrowerPhone?: string | null;
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
};

export async function listGroupLoans(
  groupId: string,
  params: { status?: string } = {},
): Promise<BackendGroupLoan[]> {
  try {
    const res = await api.get(`/groups/${groupId}/loans`, { params });
    return (res.data?.data?.loans ?? []) as BackendGroupLoan[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
