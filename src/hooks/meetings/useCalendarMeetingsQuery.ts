import { useQuery } from "@tanstack/react-query";
import { listMyCalendarMeetings } from "@/lib/meetings";
import { calendarMeetingsKey } from "./queryKeys";

export function useCalendarMeetingsQuery(params?: {
  from?: Date;
  to?: Date;
  includeAgenda?: boolean;
}) {
  const fromIso = params?.from ? params.from.toISOString() : "";
  const toIso = params?.to ? params.to.toISOString() : "";

  return useQuery({
    queryKey: calendarMeetingsKey(fromIso, toIso),
    enabled: Boolean(fromIso && toIso),
    queryFn: async () => {
      if (!fromIso || !toIso) return [];
      return listMyCalendarMeetings({
        from: fromIso,
        to: toIso,
        includeAgenda: params?.includeAgenda ?? true,
      });
    },
  });
}

