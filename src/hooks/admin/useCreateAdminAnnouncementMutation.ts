import { useMutation } from "@tanstack/react-query";
import { createAdminAnnouncement, type AdminAnnouncementPayload } from "@/lib/admin";

export function useCreateAdminAnnouncementMutation() {
  return useMutation({
    mutationFn: async (payload: AdminAnnouncementPayload) => createAdminAnnouncement(payload),
  });
}

