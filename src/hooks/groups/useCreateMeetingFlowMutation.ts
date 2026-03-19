import { useMutation } from "@tanstack/react-query";
import {
  createAgendaItem,
  createMeeting,
  upsertMeetingMinutes,
  type BackendAgendaItem,
  type BackendMeeting,
} from "@/lib/groups";

export function useCreateMeetingFlowMutation(groupId: string) {
  return useMutation({
    mutationFn: async (input: {
      meeting: Partial<BackendMeeting>;
      agendaItems?: Array<
        Omit<BackendAgendaItem, "_id" | "meetingId" | "createdAt" | "updatedAt">
      >;
      minutes?: {
        content: string;
        attendeesCount?: number;
        decisionsMade?: string[];
        actionItems?: Array<{ task: string; assignee: string; dueDate: string }>;
      };
    }) => {
      const meeting = await createMeeting(groupId, input.meeting);

      const agendaItems = input.agendaItems ?? [];
      for (const item of agendaItems) {
        await createAgendaItem(groupId, meeting._id, item);
      }

      if (input.minutes?.content?.trim()) {
        await upsertMeetingMinutes(groupId, meeting._id, input.minutes);
      }

      return meeting;
    },
  });
}

