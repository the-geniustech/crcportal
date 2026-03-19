import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdminAttendanceMeeting } from "@/lib/admin";

export function useCreateAdminAttendanceMeetingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createAdminAttendanceMeeting,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "attendance", "meetings"] });
    },
  });
}

