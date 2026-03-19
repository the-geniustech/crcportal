import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAdminGroupsQuery } from "@/hooks/admin/useAdminGroupsQuery";
import { useAdminAttendanceMeetingsQuery } from "@/hooks/admin/useAdminAttendanceMeetingsQuery";
import { useCreateAdminAttendanceMeetingMutation } from "@/hooks/admin/useCreateAdminAttendanceMeetingMutation";
import { useAdminMeetingAttendanceRosterQuery } from "@/hooks/admin/useAdminMeetingAttendanceRosterQuery";
import { useUpsertAdminMeetingAttendanceMutation } from "@/hooks/admin/useUpsertAdminMeetingAttendanceMutation";
import type { AdminAttendanceMeetingRow, AdminMeetingAttendanceRosterItem } from "@/lib/admin";

type AttendanceStatus = "present" | "absent" | "excused" | "late";
type MeetingType = "physical" | "zoom" | "google_meet";

function getStatusIcon(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case "absent":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "excused":
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case "late":
      return <Clock className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
}

function getStatusBadge(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return <Badge className="bg-emerald-100 text-emerald-700">Present</Badge>;
    case "absent":
      return <Badge className="bg-red-100 text-red-700">Absent</Badge>;
    case "excused":
      return <Badge className="bg-amber-100 text-amber-700">Excused</Badge>;
    case "late":
      return <Badge className="bg-blue-100 text-blue-700">Late</Badge>;
    default:
      return null;
  }
}

function safeDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AttendanceTracker() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<AdminAttendanceMeetingRow | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);

  const groupsQuery = useAdminGroupsQuery({ includeMetrics: false, limit: 200 });
  const groups = groupsQuery.data?.groups ?? [];

  const meetingsQuery = useAdminAttendanceMeetingsQuery({
    q: searchQuery.trim() || undefined,
    groupId: groupFilter === "all" ? undefined : groupFilter,
    limit: 250,
  });

  const meetings = useMemo(() => meetingsQuery.data ?? [], [meetingsQuery.data]);
  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      const d = safeDate(m.scheduledDate);
      return d ? d.getTime() >= now.getTime() : false;
    });
  }, [meetings]);
  const pastMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      const d = safeDate(m.scheduledDate);
      return d ? d.getTime() < now.getTime() : false;
    });
  }, [meetings]);

  const overallRate = useMemo(() => {
    const totalPresent = meetings.reduce((sum, m) => sum + (m.present ?? 0), 0);
    const totalExpected = meetings.reduce((sum, m) => sum + (m.totalMembers ?? 0), 0);
    return totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;
  }, [meetings]);

  const createMeetingMutation = useCreateAdminAttendanceMeetingMutation();
  const upsertAttendanceMutation = useUpsertAdminMeetingAttendanceMutation();

  const rosterQuery = useAdminMeetingAttendanceRosterQuery(
    showAttendanceModal ? selectedMeeting?.id ?? null : null,
    showAttendanceModal,
  );

  const roster: AdminMeetingAttendanceRosterItem[] = rosterQuery.data?.roster ?? [];

  const [newMeeting, setNewMeeting] = useState<{
    groupId: string;
    title: string;
    description: string;
    meetingType: MeetingType;
    scheduledDateLocal: string;
    durationMinutes: string;
    location: string;
    meetingLink: string;
  }>({
    groupId: "",
    title: "",
    description: "",
    meetingType: "physical",
    scheduledDateLocal: "",
    durationMinutes: "60",
    location: "",
    meetingLink: "",
  });

  const openMeetingDetails = (meeting: AdminAttendanceMeetingRow) => {
    setSelectedMeeting(meeting);
    setShowAttendanceModal(true);
  };

  const handleMarkAttendance = (memberId: string, status: AttendanceStatus) => {
    if (!selectedMeeting) return;
    upsertAttendanceMutation.mutate(
      { meetingId: selectedMeeting.id, userId: memberId, status },
      {
        onError: (err) => {
          toast({
            title: "Error",
            description:
              err instanceof Error ? err.message : "Failed to update attendance.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const submitNewMeeting = async () => {
    const gid = newMeeting.groupId.trim();
    const title = newMeeting.title.trim();
    if (!gid) {
      toast({
        title: "Missing Group",
        description: "Please select a group.",
        variant: "destructive",
      });
      return;
    }
    if (!title) {
      toast({
        title: "Missing Title",
        description: "Please enter a meeting title.",
        variant: "destructive",
      });
      return;
    }
    if (!newMeeting.scheduledDateLocal) {
      toast({
        title: "Missing Date",
        description: "Please choose a date and time.",
        variant: "destructive",
      });
      return;
    }

    const scheduled = new Date(newMeeting.scheduledDateLocal);
    if (Number.isNaN(scheduled.getTime())) {
      toast({
        title: "Invalid Date",
        description: "Please choose a valid date and time.",
        variant: "destructive",
      });
      return;
    }

    const duration = parseInt(newMeeting.durationMinutes, 10);
    if (!Number.isFinite(duration) || duration < 1) {
      toast({
        title: "Invalid Duration",
        description: "Duration must be at least 1 minute.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMeetingMutation.mutateAsync({
        groupId: gid,
        title,
        description: newMeeting.description.trim() || undefined,
        meetingType: newMeeting.meetingType,
        location: newMeeting.location.trim() || null,
        meetingLink: newMeeting.meetingLink.trim() || null,
        scheduledDate: scheduled.toISOString(),
        durationMinutes: duration,
      });

      toast({
        title: "Meeting Created",
        description: "The meeting has been scheduled successfully.",
      });
      setShowCreateMeetingModal(false);
      setNewMeeting({
        groupId: "",
        title: "",
        description: "",
        meetingType: "physical",
        scheduledDateLocal: "",
        durationMinutes: "60",
        location: "",
        meetingLink: "",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create meeting.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{meetings.length}</p>
              <p className="text-sm text-gray-500">Total Meetings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingMeetings.length}</p>
              <p className="text-sm text-gray-500">Upcoming</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {overallRate.toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500">Overall Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pastMeetings.length}</p>
              <p className="text-sm text-gray-500">Past Meetings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings..."
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g._id} value={g._id}>
                    {g.groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            onClick={() => setShowCreateMeetingModal(true)}
          >
            <Plus className="w-4 h-4" />
            Create Meeting
          </Button>
        </div>

        {meetingsQuery.isError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(meetingsQuery.error as Error)?.message || "Failed to load meetings."}
          </div>
        )}
      </div>

      {/* Meetings Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
            <Badge className="bg-blue-100 text-blue-700">
              {upcomingMeetings.length} scheduled
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Meeting
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Group
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meetingsQuery.isLoading && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!meetingsQuery.isLoading && upcomingMeetings.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>
                      No upcoming meetings.
                    </td>
                  </tr>
                )}
                {upcomingMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{meeting.title}</p>
                      <p className="text-xs text-gray-500">
                        {meeting.totalMembers} expected
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {safeDate(meeting.scheduledDate)?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {meeting.groupName}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMeetingDetails(meeting)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Past */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Past Meetings</h3>
            <Badge className="bg-gray-100 text-gray-700">
              {pastMeetings.length} completed
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Meeting
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Attendance
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meetingsQuery.isLoading && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!meetingsQuery.isLoading && pastMeetings.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>
                      No past meetings.
                    </td>
                  </tr>
                )}
                {pastMeetings.map((meeting) => {
                  const rate =
                    meeting.totalMembers > 0
                      ? (meeting.present / meeting.totalMembers) * 100
                      : 0;

                  return (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {meeting.title}
                        </p>
                        <p className="text-xs text-gray-500">{meeting.groupName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                rate >= 80
                                  ? "bg-emerald-500"
                                  : rate >= 60
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {rate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {safeDate(meeting.scheduledDate)?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMeetingDetails(meeting)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMeeting?.title} - Attendance
            </DialogTitle>
          </DialogHeader>

          {selectedMeeting && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {selectedMeeting.groupName}
                    </p>
                    <p className="font-medium">
                      {safeDate(selectedMeeting.scheduledDate)?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">
                        {selectedMeeting.present}
                      </p>
                      <p className="text-xs text-gray-500">Present</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">
                        {selectedMeeting.absent}
                      </p>
                      <p className="text-xs text-gray-500">Absent</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {selectedMeeting.late}
                      </p>
                      <p className="text-xs text-gray-500">Late</p>
                    </div>
                  </div>
                </div>
              </div>

              {rosterQuery.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {(rosterQuery.error as Error)?.message || "Failed to load attendance."}
                </div>
              )}

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {rosterQuery.isLoading && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    Loading…
                  </div>
                )}

                {!rosterQuery.isLoading &&
                  roster.map((record) => (
                    <div
                      key={record.memberId}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.memberName}
                          </p>
                          {record.checkInTime && (
                            <p className="text-xs text-gray-500">
                              Check-in: {record.checkInTime}
                            </p>
                          )}
                          {record.notes && (
                            <p className="text-xs text-gray-500 italic">
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(record.status)}
                        <Select
                          value={record.status}
                          onValueChange={(value) =>
                            handleMarkAttendance(
                              record.memberId,
                              value as AttendanceStatus,
                            )
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                {!rosterQuery.isLoading && roster.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No members found for this group.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAttendanceModal(false)}>
                  Close
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowAttendanceModal(false)}
                  disabled={upsertAttendanceMutation.isPending}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Meeting Modal */}
      <Dialog open={showCreateMeetingModal} onOpenChange={setShowCreateMeetingModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Group
              </label>
              <Select
                value={newMeeting.groupId}
                onValueChange={(value) => setNewMeeting((s) => ({ ...s, groupId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g._id} value={g._id}>
                      {g.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Title
              </label>
              <Input
                value={newMeeting.title}
                onChange={(e) => setNewMeeting((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g. Monthly General Meeting"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Description (Optional)
              </label>
              <Textarea
                value={newMeeting.description}
                onChange={(e) => setNewMeeting((s) => ({ ...s, description: e.target.value }))}
                placeholder="Add a short agenda or note…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Meeting Type
                </label>
                <Select
                  value={newMeeting.meetingType}
                  onValueChange={(value) =>
                    setNewMeeting((s) => ({ ...s, meetingType: value as MeetingType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Duration (Minutes)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={newMeeting.durationMinutes}
                  onChange={(e) =>
                    setNewMeeting((s) => ({ ...s, durationMinutes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={newMeeting.scheduledDateLocal}
                  onChange={(e) =>
                    setNewMeeting((s) => ({
                      ...s,
                      scheduledDateLocal: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Location (Optional)
                </label>
                <Input
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting((s) => ({ ...s, location: e.target.value }))}
                  placeholder="e.g. Church Hall"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Meeting Link (Optional)
              </label>
              <Input
                value={newMeeting.meetingLink}
                onChange={(e) => setNewMeeting((s) => ({ ...s, meetingLink: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateMeetingModal(false)}
                disabled={createMeetingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={submitNewMeeting}
                disabled={createMeetingMutation.isPending}
              >
                {createMeetingMutation.isPending ? "Creating…" : "Create Meeting"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
