import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertMyMeetingRsvp, type CalendarRsvpStatus } from "@/lib/meetings";
import { calendarMeetingsKey } from "./queryKeys";

export function useUpsertMeetingRsvpMutation(opts?: {
  from?: Date;
  to?: Date;
}) {
  const queryClient = useQueryClient();

  const fromIso = opts?.from ? opts.from.toISOString() : "";
  const toIso = opts?.to ? opts.to.toISOString() : "";

  return useMutation({
    mutationFn: async (vars: {
      meetingId: string;
      status: CalendarRsvpStatus;
    }) => {
      return upsertMyMeetingRsvp(vars.meetingId, { status: vars.status });
    },
    onMutate: async ({ meetingId, status }) => {
      if (!fromIso || !toIso) return;

      const key = calendarMeetingsKey(fromIso, toIso);
      await queryClient.cancelQueries({ queryKey: key });

      const prev = queryClient.getQueryData<unknown[]>(key);
      if (!prev) return { prev };

      queryClient.setQueryData<unknown[]>(key, (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (m.id !== meetingId) return m;
          const wasAttending = m.rsvpStatus === "attending";
          const nowAttending = status === "attending";
          const attendeesCount =
            wasAttending && !nowAttending
              ? Math.max(0, Number(m.attendeesCount || 0) - 1)
              : !wasAttending && nowAttending
                ? Number(m.attendeesCount || 0) + 1
                : Number(m.attendeesCount || 0);

          return { ...m, rsvpStatus: status, attendeesCount };
        });
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (!fromIso || !toIso) return;
      const key = calendarMeetingsKey(fromIso, toIso);
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: async () => {
      if (!fromIso || !toIso) return;
      const key = calendarMeetingsKey(fromIso, toIso);
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
