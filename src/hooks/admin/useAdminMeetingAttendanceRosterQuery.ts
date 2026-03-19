import { useQuery } from "@tanstack/react-query";
import { getAdminMeetingAttendanceRoster } from "@/lib/admin";

export function useAdminMeetingAttendanceRosterQuery(meetingId: string | null, enabled = true) {
  return useQuery({
    enabled: Boolean(meetingId) && enabled,
    queryKey: ["admin", "attendance", "meeting", meetingId ?? "none", "roster"],
    queryFn: async () => {
      if (!meetingId) throw new Error("Missing meetingId");
      return getAdminMeetingAttendanceRoster(meetingId);
    },
  });
}

