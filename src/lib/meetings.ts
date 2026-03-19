import { api, getApiErrorMessage } from "@/lib/api/client";

export type CalendarRsvpStatus = "pending" | "attending" | "not_attending" | "maybe";

export type BackendCalendarMeeting = {
  id: string;
  title: string;
  description: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  meetingType: "physical" | "zoom" | "google_meet";
  location?: string;
  meetingLink?: string;
  scheduledDate: string;
  durationMinutes: number;
  rsvpStatus: CalendarRsvpStatus;
  attendeesCount: number;
  totalMembers: number;
  agenda?: string[];
};

export async function listMyCalendarMeetings(params: {
  from: string;
  to: string;
  groupId?: string;
  includeAgenda?: boolean;
}) {
  try {
    const res = await api.get("/meetings/me/calendar", { params });
    return (res.data?.data?.meetings ?? []) as BackendCalendarMeeting[];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function upsertMyMeetingRsvp(meetingId: string, payload: { status: CalendarRsvpStatus }) {
  try {
    const res = await api.put(`/meetings/${meetingId}/rsvp`, payload);
    return res.data?.data as { rsvp: { status: CalendarRsvpStatus }; attendeesCount: number };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

