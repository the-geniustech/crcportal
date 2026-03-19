import { useQuery } from "@tanstack/react-query";
import { listAdminAttendanceMeetings } from "@/lib/admin";

export function useAdminAttendanceMeetingsQuery(params: {
  q?: string;
  groupId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: [
      "admin",
      "attendance",
      "meetings",
      params.q ?? "",
      params.groupId ?? "all",
      params.status ?? "",
      params.from ?? "",
      params.to ?? "",
      params.limit ?? 200,
    ],
    queryFn: async () => listAdminAttendanceMeetings(params),
  });
}

