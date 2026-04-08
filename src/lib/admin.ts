import { api, getApiErrorMessage } from "@/lib/api/client";
import type {
  ContributionTypeCanonical,
  ContributionTypeValue,
} from "@/lib/contributionPolicy";

export type AdminApplicant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  groupName: string;
  applicationDate: string;
  status: "pending" | "approved" | "rejected";
  notes?: string | null;
};

export async function listMemberApprovals(
  params: { status?: string; groupId?: string } = {},
) {
  try {
    const res = await api.get("/admin/member-approvals", { params });
    return (res.data?.data?.applicants ?? []) as AdminApplicant[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function approveMemberApproval(
  membershipId: string,
  payload: { notes?: string } = {},
) {
  try {
    const res = await api.patch(
      `/admin/member-approvals/${membershipId}/approve`,
      payload,
    );
    return res.data?.data?.membership;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function rejectMemberApproval(
  membershipId: string,
  payload: { notes?: string } = {},
) {
  try {
    const res = await api.patch(
      `/admin/member-approvals/${membershipId}/reject`,
      payload,
    );
    return res.data?.data?.membership;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminContributionTrackerRecord = {
  id: string; // `${userId}|${groupId}|${year}|${month}`
  userId: string;
  groupId: string;
  memberName: string;
  memberSerial?: string | null;
  groupName: string;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string;
  status: "paid" | "partial" | "pending" | "defaulted";
  monthsDefaulted: number;
};

export async function listContributionTracker(
  params: { month?: number; year?: number; groupId?: string } = {},
) {
  try {
    const res = await api.get("/admin/contributions/tracker", { params });
    return (res.data?.data?.contributions ??
      []) as AdminContributionTrackerRecord[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type ContributionReminderRecipient = {
  userId: string;
  groupId: string;
};

export type ContributionReminderResponse = {
  totalRecipients: number;
  channels: {
    email: { requested: boolean; attempted: number; sent: number; failed: number; skipped: number };
    sms: { requested: boolean; attempted: number; sent: number; failed: number; skipped: number };
    notification: {
      requested: boolean;
      attempted: number;
      sent: number;
      failed: number;
      skipped: number;
    };
  };
  failures?: { channel: "email" | "sms" | "notification"; to?: string; error: string }[];
};

export async function sendContributionReminders(payload: {
  year: number;
  month: number;
  recipients: ContributionReminderRecipient[];
  sendEmail?: boolean;
  sendSMS?: boolean;
  sendNotification?: boolean;
}): Promise<ContributionReminderResponse> {
  try {
    const res = await api.post("/admin/contributions/remind", payload);
    return res.data?.data as ContributionReminderResponse;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function markContributionPaid(payload: {
  userId: string;
  groupId: string;
  month: number;
  year: number;
  amount: number;
  contributionType?: ContributionTypeValue;
  notes?: string;
}) {
  try {
    const res = await api.post("/admin/contributions/mark-paid", payload);
    return res.data?.data?.contribution;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminGroupRow = {
  _id: string;
  groupNumber: number;
  groupName: string;
  imageUrl?: string | null;
  isOpen?: boolean | string | null;
  rules?: string | null;
  coordinatorId?: string | null;
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
  coordinatorEmail?: string | null;
  category?: string | null;
  description?: string | null;
  location?: string | null;
  meetingFrequency?: string | null;
  meetingDay?: string | null;
  monthlyContribution: number;
  totalSavings?: number;
  memberCount?: number;
  maxMembers: number;
  isSpecial?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  activeMemberCount?: number;
  expectedContributions?: number;
  collectedContributions?: number;
  collectionRate?: number;
};

export async function listAdminGroups(
  params: {
    search?: string;
    status?: string;
    category?: string;
    location?: string;
    sort?: string;
    page?: number;
    limit?: number;
    includeMetrics?: boolean;
    year?: number;
    month?: number;
  } = {},
) {
  try {
    const res = await api.get("/admin/groups", { params });
    const payload = res.data ?? {};
    return {
      groups: (payload?.data?.groups ?? []) as AdminGroupRow[],
      summary: payload?.data?.summary as
        | {
            totalGroups: number;
            totalMembers?: number;
            withCoordinators: number;
            contributionPeriod: { year: number; month: number };
            totalCollected: number;
            categories?: string[];
            locations?: string[];
            contributionTypeTotalsYtd?: {
              revolving: number;
              special: number;
              endwell: number;
              festive: number;
            };
          }
        | undefined,
      meta: {
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? params.page ?? 1),
        limit: Number(payload?.limit ?? params.limit ?? 0),
        results: Number(payload?.results ?? 0),
      },
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminFinancialMonthlyRow = {
  month: string;
  contributions: number;
  loans: number;
  repayments: number;
  interest: number;
};

export type AdminFinancialGroupPerformanceRow = {
  groupName: string;
  totalContributions: number;
  activeLoans: number;
  collectionRate: number;
  memberCount: number;
  expectedTotal?: number;
  collectedTotal?: number;
  collectionGap?: number;
};

export type AdminFinancialReportsResponse = {
  monthlyData: AdminFinancialMonthlyRow[];
  groupPerformance: AdminFinancialGroupPerformanceRow[];
  summary: {
    contributionsChangePct: number;
    loansChangePct: number;
    repaymentRatePct: number;
    interestRatePct: number;
  };
  period?: { months: number; end: { year: number; month: number } };
};

export async function getAdminFinancialReports(
  params: {
    period?: "3months" | "6months" | "12months";
    year?: number;
    month?: number;
  } = {},
) {
  try {
    const res = await api.get("/admin/financial-reports", { params });
    return res.data?.data as AdminFinancialReportsResponse;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminContributionInterestRate = {
  month: number;
  label: string;
  shortLabel?: string;
  ratePerThousand: number;
  ratePct: number;
};

export type AdminContributionInterestSettings = {
  year: number;
  rates: AdminContributionInterestRate[];
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export async function getAdminContributionInterestSettings(params: {
  year?: number;
} = {}) {
  try {
    const res = await api.get("/admin/contributions/interest-settings", {
      params,
    });
    return res.data?.data as AdminContributionInterestSettings;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateAdminContributionInterestSettings(payload: {
  year: number;
  rates: Record<number, number> | Array<{ month: number; ratePerThousand: number }>;
}) {
  try {
    const res = await api.put("/admin/contributions/interest-settings", payload);
    return res.data?.data as AdminContributionInterestSettings;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminContributionIncomeRow = {
  month: number;
  label: string;
  shortLabel?: string;
  ratePerThousand: number;
  ratePct: number;
  contributions: number;
  interest: number;
  total: number;
  cumulativeTotal: number;
};

export type AdminContributionIncomeSummary = {
  year: number;
  contributionType?: ContributionTypeCanonical | null;
  monthsComputed?: number;
  months: AdminContributionIncomeRow[];
  totals: {
    contributions: number;
    interest: number;
    total: number;
  };
};

export async function getAdminContributionIncomeSummary(params: {
  year?: number;
  contributionType?: ContributionTypeCanonical;
} = {}) {
  try {
    const res = await api.get("/admin/contributions/summary-income", {
      params,
    });
    return res.data?.data as AdminContributionIncomeSummary;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminInterestSharingCategory = {
  key: string;
  label: string;
  percentage: number;
  amount: number;
  amountShared: number;
};

export type AdminInterestSharingSummary = {
  year: number;
  contributionType?: ContributionTypeCanonical | null;
  monthsComputed?: number;
  totalInterest: number;
  categories: AdminInterestSharingCategory[];
};

export async function getAdminContributionInterestSharing(params: {
  year?: number;
  contributionType?: ContributionTypeCanonical;
} = {}) {
  try {
    const res = await api.get("/admin/contributions/interest-sharing", {
      params,
    });
    return res.data?.data as AdminInterestSharingSummary;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

function extractFilename(value: unknown): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const match = /filename="?([^"]+)"?/i.exec(String(raw));
  return match?.[1] || null;
}

export async function downloadAdminContributionIncomeSummary(params: {
  year?: number;
  contributionType?: ContributionTypeCanonical;
  format: "csv" | "pdf";
}): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get("/admin/contributions/summary-income/export", {
      params,
      responseType: "blob",
    });
    const filename =
      extractFilename(res.headers?.["content-disposition"]) ||
      `summary-income-${params.year ?? "all"}.${params.format}`;
    return { blob: res.data as Blob, filename };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function downloadAdminContributionInterestSharing(params: {
  year?: number;
  contributionType?: ContributionTypeCanonical;
  format: "csv" | "pdf";
}): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await api.get("/admin/contributions/interest-sharing/export", {
      params,
      responseType: "blob",
    });
    const filename =
      extractFilename(res.headers?.["content-disposition"]) ||
      `interest-sharing-${params.year ?? "all"}.${params.format}`;
    return { blob: res.data as Blob, filename };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminAttendanceMeetingRow = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  scheduledDate: string;
  durationMinutes: number;
  status: string;
  meetingType: string;
  location?: string | null;
  meetingLink?: string | null;
  totalMembers: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
};

export async function listAdminAttendanceMeetings(
  params: {
    q?: string;
    groupId?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {},
) {
  try {
    const res = await api.get("/admin/attendance/meetings", { params });
    return (res.data?.data?.meetings ?? []) as AdminAttendanceMeetingRow[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createAdminAttendanceMeeting(payload: {
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
  status?: "scheduled" | "completed" | "cancelled";
}) {
  try {
    const res = await api.post("/admin/attendance/meetings", payload);
    return res.data?.data?.meeting as
      | {
          id: string;
          title: string;
          groupId: string;
          groupName: string;
          scheduledDate: string;
          durationMinutes: number;
          status: string;
          meetingType: string;
          location?: string | null;
          meetingLink?: string | null;
        }
      | undefined;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminMeetingAttendanceRosterItem = {
  id: string;
  memberId: string;
  memberName: string;
  status: "present" | "absent" | "excused" | "late";
  checkInTime?: string | null;
  notes?: string | null;
};

export async function getAdminMeetingAttendanceRoster(meetingId: string) {
  try {
    const res = await api.get(
      `/admin/attendance/meetings/${meetingId}/attendance`,
    );
    return res.data?.data as {
      meeting: {
        id: string;
        title: string;
        groupId: string;
        groupName: string;
        scheduledDate: string;
        durationMinutes: number;
        status: string;
        meetingType: string;
        location?: string | null;
        meetingLink?: string | null;
      };
      roster: AdminMeetingAttendanceRosterItem[];
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function upsertAdminMeetingAttendance(payload: {
  meetingId: string;
  userId: string;
  status: "present" | "absent" | "excused" | "late";
  checkInTime?: string | null;
  notes?: string | null;
}) {
  try {
    const res = await api.put(
      `/admin/attendance/meetings/${payload.meetingId}/attendance`,
      {
        userId: payload.userId,
        status: payload.status,
        checkInTime: payload.checkInTime ?? null,
        notes: payload.notes ?? null,
      },
    );
    return res.data?.data?.attendance;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminAnnouncementPayload = {
  title?: string;
  message: string;
  target: "all" | "selected";
  groupNumbers?: number[];
  sendEmail?: boolean;
  sendSMS?: boolean;
  sendNotification?: boolean;
  senderName?: string;
};

export type AdminAnnouncementDispatchResult = {
  target: string;
  groupsMatched: number;
  channels: {
    email: {
      requested: boolean;
      attempted: number;
      sent: number;
      failed: number;
      skipped: number;
    };
    sms: {
      requested: boolean;
      attempted: number;
      sent: number;
      failed: number;
      skipped: number;
    };
    notification: {
      requested: boolean;
      attempted: number;
      sent: number;
      failed: number;
      skipped: number;
    };
  };
  failures: {
    channel: "email" | "sms" | "notification";
    to: string;
    error: string;
  }[];
};

export async function createAdminAnnouncement(
  payload: AdminAnnouncementPayload,
) {
  try {
    const res = await api.post("/admin/announcements", payload);
    return res.data?.data?.announcement as
      | AdminAnnouncementDispatchResult
      | undefined;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminSmsTemplate = {
  _id: string;
  key: string;
  name: string;
  body: string;
  isActive?: boolean;
};

export async function listAdminSmsTemplates() {
  try {
    const res = await api.get("/admin/sms/templates");
    return (res.data?.data?.templates ?? []) as AdminSmsTemplate[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminSmsStats = {
  today: { attempted: number; sent: number; failed: number };
  month: { attempted: number; sent: number; failed: number };
  deliveryRatePct: number;
};

export async function getAdminSmsStats() {
  try {
    const res = await api.get("/admin/sms/stats");
    return res.data?.data as AdminSmsStats;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminBulkSmsPayload = {
  message: string;
  target: "all" | "coordinators" | "defaulters" | "selected";
  groupNumbers?: number[];
  year?: number;
  month?: number;
};

export type AdminBulkSmsDispatchResult = {
  target: string;
  channels: {
    sms: {
      requested: boolean;
      attempted: number;
      sent: number;
      failed: number;
      skipped: number;
    };
  };
  failures: { channel: "sms"; to: string; error: string }[];
};

export async function sendAdminBulkSms(payload: AdminBulkSmsPayload) {
  try {
    const res = await api.post("/admin/sms/send", payload);
    return res.data?.data?.dispatch as AdminBulkSmsDispatchResult | undefined;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminContributionTrackingMonth = {
  month: number;
  status: "pending" | "completed" | "verified";
  expectedAmount: number;
  paidAmount: number;
  hasVerified: boolean;
};

export type AdminContributionTrackingGroup = {
  groupId: string;
  groupNumber: number;
  groupName: string;
  isSpecial: boolean;
  monthlyContribution: number;
  activeMembers: number;
  totalPaid: number;
  months: AdminContributionTrackingMonth[];
};

export async function getAdminContributionTracking(params: {
  year: number;
  month?: number;
  contributionType: ContributionTypeCanonical;
}) {
  try {
    const res = await api.get("/admin/contributions/tracking", { params });
    return res.data?.data as {
      year: number;
      month?: number | null;
      contributionType: string;
      groups: AdminContributionTrackingGroup[];
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export type AdminSpecialContributionSummary = {
  type: Exclude<ContributionTypeCanonical, "revolving">;
  totalCollected: number;
  contributors: number;
};

export async function getAdminSpecialContributionSummary(params: {
  year: number;
}) {
  try {
    const res = await api.get("/admin/contributions/special-summary", {
      params,
    });
    return res.data?.data as {
      year: number;
      group: { id: string; groupNumber: number; groupName: string } | null;
      summary: AdminSpecialContributionSummary[];
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
