import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertAdminMeetingAttendance } from "@/lib/admin";
import type { AdminMeetingAttendanceRosterItem } from "@/lib/admin";

export function useUpsertAdminMeetingAttendanceMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: upsertAdminMeetingAttendance,
    onMutate: async (payload) => {
      const key = ["admin", "attendance", "meeting", payload.meetingId, "roster"] as const;

      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{
        meeting: unknown;
        roster: AdminMeetingAttendanceRosterItem[];
      }>(key);

      if (prev?.roster) {
        qc.setQueryData(key, {
          ...prev,
          roster: prev.roster.map((r) =>
            String(r.memberId) === String(payload.userId) ? { ...r, status: payload.status } : r,
          ),
        });
      }

      return { prev, key };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.prev && ctx?.key) {
        qc.setQueryData(ctx.key, ctx.prev);
      }
    },
    onSettled: (_data, _err, payload) => {
      void qc.invalidateQueries({ queryKey: ["admin", "attendance", "meetings"] });
      void qc.invalidateQueries({ queryKey: ["admin", "attendance", "meeting", payload.meetingId, "roster"] });
    },
  });
}
