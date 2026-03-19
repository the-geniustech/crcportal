export function calendarMeetingsKey(fromIso: string, toIso: string) {
  return ["meetings", "me", "calendar", fromIso, toIso] as const;
}

