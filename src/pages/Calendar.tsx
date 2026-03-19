import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCalendarMeetingsQuery } from '@/hooks/meetings/useCalendarMeetingsQuery';
import { useUpsertMeetingRsvpMutation } from '@/hooks/meetings/useUpsertMeetingRsvpMutation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Video,
  Clock,
  Users,
  Check,
  X,
  Filter,
  Eye,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  meetingType: 'physical' | 'zoom' | 'google_meet';
  location?: string;
  meetingLink?: string;
  scheduledDate: Date;
  durationMinutes: number;
  rsvpStatus: 'pending' | 'attending' | 'not_attending' | 'maybe';
  attendeesCount: number;
  totalMembers: number;
  agenda?: string[];
}

const CalendarContent: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const queryRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const firstDay = firstOfMonth.getDay();
    const from = new Date(firstOfMonth);
    from.setDate(firstOfMonth.getDate() - firstDay);
    from.setHours(0, 0, 0, 0);

    const lastOfMonth = new Date(year, month + 1, 0);
    const lastDay = lastOfMonth.getDay();
    const to = new Date(lastOfMonth);
    to.setDate(lastOfMonth.getDate() + (6 - lastDay));
    to.setHours(23, 59, 59, 999);

    return { from, to };
  }, [currentDate]);

  const calendarMeetingsQuery = useCalendarMeetingsQuery({
    from: queryRange.from,
    to: queryRange.to,
    includeAgenda: true,
  });

  const rsvpMutation = useUpsertMeetingRsvpMutation({
    from: queryRange.from,
    to: queryRange.to,
  });

  const meetings = useMemo<Meeting[]>(() => {
    const backend = calendarMeetingsQuery.data ?? [];
    return backend.map((m) => ({
      ...m,
      scheduledDate: new Date(m.scheduledDate),
    }));
  }, [calendarMeetingsQuery.data]);

  useEffect(() => {
    if (!selectedMeeting) return;
    const updated = meetings.find((m) => m.id === selectedMeeting.id);
    if (updated) setSelectedMeeting(updated);
  }, [meetings, selectedMeeting]);

  // Get unique groups for filter
  const groups = useMemo(() => {
    const uniqueGroups = new Map();
    meetings.forEach(m => {
      if (!uniqueGroups.has(m.groupId)) {
        uniqueGroups.set(m.groupId, { id: m.groupId, name: m.groupName, color: m.groupColor });
      }
    });
    return Array.from(uniqueGroups.values());
  }, [meetings]);

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    if (filterGroup === 'all') return meetings;
    return meetings.filter(m => m.groupId === filterGroup);
  }, [meetings, filterGroup]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMeetingsForDate = (date: Date) => {
    return filteredMeetings.filter(m => 
      m.scheduledDate.getDate() === date.getDate() &&
      m.scheduledDate.getMonth() === date.getMonth() &&
      m.scheduledDate.getFullYear() === date.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleRSVP = async (meetingId: string, status: 'attending' | 'not_attending' | 'maybe') => {
    try {
      await rsvpMutation.mutateAsync({ meetingId, status });
      toast({
        title: 'RSVP Updated',
        description: status === 'attending'
          ? "You're marked as attending"
          : status === 'not_attending'
            ? "You've declined this meeting"
            : "You're marked as maybe attending",
      });
    } catch (err) {
      toast({
        title: 'Unable to update RSVP',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Generate calendar days
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50 border border-gray-100" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayMeetings = getMeetingsForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-24 md:h-32 border border-gray-100 p-1 md:p-2 cursor-pointer transition-colors ${
            isToday ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'
          } ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <div className={`text-sm font-medium mb-1 ${
            isToday ? 'text-emerald-600' : 'text-gray-700'
          }`}>
            {day}
          </div>
          <div className="space-y-1 overflow-hidden">
            {dayMeetings.slice(0, 2).map(meeting => (
              <button
                key={meeting.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMeeting(meeting);
                }}
                className="w-full text-left"
              >
                <div
                  className="text-xs p-1 rounded truncate text-white font-medium"
                  style={{ backgroundColor: meeting.groupColor }}
                >
                  <span className="hidden md:inline">{formatTime(meeting.scheduledDate)} - </span>
                  {meeting.title}
                </div>
              </button>
            ))}
            {dayMeetings.length > 2 && (
              <div className="text-xs text-gray-500 pl-1">
                +{dayMeetings.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  // Get meetings for selected date or upcoming meetings
  const displayMeetings = selectedDate 
    ? getMeetingsForDate(selectedDate)
    : filteredMeetings.filter(m => m.scheduledDate >= new Date()).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-emerald-600" />
              Meeting Calendar
            </h1>
            <p className="text-gray-600 mt-1">View and manage all your group meetings</p>
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Groups</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {renderCalendar()}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {groups.map(group => (
                <div key={group.id} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-sm text-gray-600">{group.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - Meeting List */}
          <div className="space-y-6">
            {/* Selected Date / Upcoming Meetings */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {selectedDate 
                  ? `Meetings on ${selectedDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                  : 'Upcoming Meetings'
                }
              </h3>

              {displayMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No meetings scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayMeetings.map(meeting => (
                    <div
                      key={meeting.id}
                      className="p-4 border rounded-xl hover:border-emerald-200 transition-colors cursor-pointer"
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: meeting.groupColor }}
                        >
                          {meeting.groupName}
                        </div>
                        {meeting.meetingType === 'physical' ? (
                          <MapPin className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Video className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{meeting.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(meeting.scheduledDate)}</span>
                        <span>•</span>
                        <span>{meeting.durationMinutes} min</span>
                      </div>
                      {!selectedDate && (
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(meeting.scheduledDate)}
                        </div>
                      )}
                      
                      {/* RSVP Status */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          meeting.rsvpStatus === 'attending' ? 'bg-green-100 text-green-700' :
                          meeting.rsvpStatus === 'not_attending' ? 'bg-red-100 text-red-700' :
                          meeting.rsvpStatus === 'maybe' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {meeting.rsvpStatus === 'attending' ? 'Attending' :
                           meeting.rsvpStatus === 'not_attending' ? 'Not Attending' :
                           meeting.rsvpStatus === 'maybe' ? 'Maybe' : 'Pending RSVP'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {meeting.attendeesCount}/{meeting.totalMembers} attending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Show all upcoming meetings
                </button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-4">This Month</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold">
                    {filteredMeetings.filter(m => 
                      m.scheduledDate.getMonth() === currentDate.getMonth() &&
                      m.scheduledDate.getFullYear() === currentDate.getFullYear()
                    ).length}
                  </p>
                  <p className="text-emerald-100 text-sm">Total Meetings</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {filteredMeetings.filter(m => 
                      m.scheduledDate.getMonth() === currentDate.getMonth() &&
                      m.scheduledDate.getFullYear() === currentDate.getFullYear() &&
                      m.rsvpStatus === 'attending'
                    ).length}
                  </p>
                  <p className="text-emerald-100 text-sm">Attending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mb-2"
                    style={{ backgroundColor: selectedMeeting.groupColor }}
                  >
                    {selectedMeeting.groupName}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMeeting.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CalendarIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{formatDate(selectedMeeting.scheduledDate)}</p>
                  <p className="text-gray-600">
                    {formatTime(selectedMeeting.scheduledDate)} • {selectedMeeting.durationMinutes} minutes
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedMeeting.meetingType === 'physical' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  {selectedMeeting.meetingType === 'physical' ? (
                    <MapPin className="h-6 w-6 text-orange-600" />
                  ) : (
                    <Video className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.meetingType === 'physical' 
                      ? 'Physical Meeting' 
                      : selectedMeeting.meetingType === 'zoom' 
                        ? 'Zoom Meeting'
                        : 'Google Meet'}
                  </p>
                  {selectedMeeting.location && (
                    <p className="text-gray-600">{selectedMeeting.location}</p>
                  )}
                  {selectedMeeting.meetingLink && (
                    <a
                      href={selectedMeeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mt-1"
                    >
                      Join Meeting <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Attendees */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.attendeesCount} of {selectedMeeting.totalMembers} attending
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(selectedMeeting.attendeesCount / selectedMeeting.totalMembers) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedMeeting.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedMeeting.description}</p>
                </div>
              )}

              {/* Agenda */}
              {selectedMeeting.agenda && selectedMeeting.agenda.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Agenda</h4>
                  <ul className="space-y-2">
                    {selectedMeeting.agenda.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RSVP Buttons */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Your RSVP</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRSVP(selectedMeeting.id, 'attending')}
                    className={`flex-1 gap-2 ${
                      selectedMeeting.rsvpStatus === 'attending'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    variant={selectedMeeting.rsvpStatus === 'attending' ? 'default' : 'outline'}
                  >
                    <Check className="h-4 w-4" />
                    Attending
                  </Button>
                  <Button
                    onClick={() => handleRSVP(selectedMeeting.id, 'maybe')}
                    className={`flex-1 gap-2 ${
                      selectedMeeting.rsvpStatus === 'maybe'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : ''
                    }`}
                    variant={selectedMeeting.rsvpStatus === 'maybe' ? 'default' : 'outline'}
                  >
                    Maybe
                  </Button>
                  <Button
                    onClick={() => handleRSVP(selectedMeeting.id, 'not_attending')}
                    className={`flex-1 gap-2 ${
                      selectedMeeting.rsvpStatus === 'not_attending'
                        ? 'bg-red-600 hover:bg-red-700'
                        : ''
                    }`}
                    variant={selectedMeeting.rsvpStatus === 'not_attending' ? 'default' : 'outline'}
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <Button
                onClick={() => setSelectedMeeting(null)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Calendar: React.FC = () => {
  return (
    <AuthProvider>
      <CalendarContent />
    </AuthProvider>
  );
};

export default Calendar;
