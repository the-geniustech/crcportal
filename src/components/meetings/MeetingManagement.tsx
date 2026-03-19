import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { upsertMeetingMinutes } from "@/lib/groups";
import { useCreateMeetingFlowMutation } from "@/hooks/groups/useCreateMeetingFlowMutation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  X,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  GripVertical,
  MessageSquare,
} from "lucide-react";

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  presenter?: string;
}

interface MeetingFormData {
  title: string;
  description: string;
  meetingType: "physical" | "zoom" | "google_meet";
  location: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  sendReminders: boolean;
  reminderTypes: ("sms" | "email" | "whatsapp")[];
}

interface MeetingManagementProps {
  groupId: string;
  groupName: string;
  members: Array<{ id: string; name: string; phone: string; email: string }>;
  onMeetingCreated?: () => void;
}

const MeetingManagement: React.FC<MeetingManagementProps> = ({
  groupId,
  groupName,
  members,
  onMeetingCreated,
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "agenda" | "minutes">(
    "create",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  const [formData, setFormData] = useState<MeetingFormData>({
    title: "",
    description: "",
    meetingType: "physical",
    location: "",
    scheduledDate: "",
    scheduledTime: "",
    durationMinutes: 60,
    sendReminders: true,
    reminderTypes: ["sms"],
  });

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState({
    title: "",
    description: "",
    duration: 10,
    presenter: "",
  });

  const [minutes, setMinutes] = useState({
    content: "",
    attendeesCount: 0,
    decisions: [""],
    actionItems: [{ task: "", assignee: "", dueDate: "" }],
  });

  const createMeetingFlowMutation = useCreateMeetingFlowMutation(groupId);

  const handleInputChange = <K extends keyof MeetingFormData>(
    field: K,
    value: MeetingFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addAgendaItem = () => {
    if (!newAgendaItem.title) return;

    setAgendaItems((prev) => [
      ...prev,
      { ...newAgendaItem, id: Date.now().toString() },
    ]);
    setNewAgendaItem({
      title: "",
      description: "",
      duration: 10,
      presenter: "",
    });
  };

  const removeAgendaItem = (id: string) => {
    setAgendaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const createVirtualMeeting = async () => {
    if (formData.meetingType === "physical") return null;

    try {
      // Backend-only: virtual meeting auto-creation is not yet implemented.
      // Generate a placeholder link so the UI can still display something.
      const meetingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const meeting_link =
        formData.meetingType === "zoom"
          ? `https://zoom.us/j/${meetingId}`
          : `https://meet.google.com/${meetingId.slice(0, 3)}-${meetingId.slice(3, 7)}-${meetingId.slice(7, 10)}`;

      return { meeting_link, meeting_id: meetingId, password: null };
    } catch (error) {
      console.error("Error creating virtual meeting:", error);
      return null;
    }
  };

  const sendMeetingReminders = async (
    meetingId: string,
    meetingDetails: unknown,
  ) => {
    if (!formData.sendReminders || formData.reminderTypes.length === 0) return;

    // Backend-only: reminders delivery (SMS/WhatsApp/Email) is not yet implemented.
    // Keep the existing interface and skip actual sending for now.
    void meetingId;
    void meetingDetails;

    const dateObj = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}`,
    );
    const formattedDate = dateObj.toLocaleDateString("en-NG", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const formattedTime = dateObj.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    void formattedDate;
    void formattedTime;
    void members;
  };

  const handleCreateMeeting = async () => {
    if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create virtual meeting if needed
      let virtualMeetingData = null;
      if (formData.meetingType !== "physical") {
        virtualMeetingData = await createVirtualMeeting();
        if (virtualMeetingData?.meeting_link) {
          setMeetingLink(virtualMeetingData.meeting_link);
        }
      }

      const meeting = await createMeetingFlowMutation.mutateAsync({
        meeting: {
          title: formData.title,
          description: formData.description,
          meetingType: formData.meetingType,
          location:
            formData.meetingType === "physical" ? formData.location : null,
          meetingLink: virtualMeetingData?.meeting_link ?? null,
          meetingId: virtualMeetingData?.meeting_id ?? null,
          meetingPassword: virtualMeetingData?.password ?? null,
          scheduledDate: `${formData.scheduledDate}T${formData.scheduledTime}:00`,
          durationMinutes: formData.durationMinutes,
          status: "scheduled",
        },
        agendaItems: agendaItems.map((item, index) => ({
          title: item.title,
          description: item.description,
          durationMinutes: item.duration,
          orderIndex: index,
        })),
      });

      // Send reminders
      await sendMeetingReminders(meeting._id, virtualMeetingData);

      toast({
        title: "Meeting Created",
        description: `${formData.title} has been scheduled successfully`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        meetingType: "physical",
        location: "",
        scheduledDate: "",
        scheduledTime: "",
        durationMinutes: 60,
        sendReminders: true,
        reminderTypes: ["sms"],
      });
      setAgendaItems([]);
      setIsCreating(false);

      onMeetingCreated?.();
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMinutes = async (meetingId: string) => {
    try {
      await upsertMeetingMinutes(groupId, meetingId, {
        content: minutes.content,
        attendeesCount: minutes.attendeesCount,
        decisionsMade: minutes.decisions.filter((d) => d.trim()),
        actionItems: minutes.actionItems.filter((a) => a.task.trim()),
      });

      toast({
        title: "Minutes Saved",
        description: "Meeting minutes have been recorded successfully",
      });
    } catch (error) {
      console.error("Error saving minutes:", error);
      toast({
        title: "Error",
        description: "Failed to save minutes",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-gray-900 text-2xl">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Meeting Management
          </h2>
          <p className="text-gray-600">{groupName}</p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white shadow-sm border rounded-xl">
          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: "create", label: "Meeting Details", icon: Calendar },
              { id: "agenda", label: "Agenda", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as "create" | "agenda" | "minutes")
                }
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-emerald-600 border-b-2 border-emerald-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "create" && (
              <div className="space-y-6">
                {/* Meeting Title */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Meeting Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Monthly Group Meeting"
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="What will be discussed in this meeting?"
                    rows={3}
                  />
                </div>

                {/* Meeting Type */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Meeting Type *
                  </label>
                  <div className="gap-3 grid grid-cols-3">
                    {[
                      { id: "physical", label: "Physical", icon: MapPin },
                      { id: "zoom", label: "Zoom", icon: Video },
                      { id: "google_meet", label: "Google Meet", icon: Video },
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() =>
                          handleInputChange("meetingType", type.id)
                        }
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          formData.meetingType === type.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <type.icon
                          className={`h-6 w-6 ${
                            formData.meetingType === type.id
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            formData.meetingType === type.id
                              ? "text-emerald-700"
                              : "text-gray-600"
                          }`}
                        >
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location (for physical meetings) */}
                {formData.meetingType === "physical" && (
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Location *
                    </label>
                    <Input
                      value={formData.location}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      placeholder="Enter meeting address"
                      className="w-full"
                    />
                  </div>
                )}

                {/* Virtual meeting info */}
                {formData.meetingType !== "physical" && (
                  <div className="bg-blue-50 p-4 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Video className="w-5 h-5" />
                      <span className="font-medium">
                        {formData.meetingType === "zoom"
                          ? "Zoom"
                          : "Google Meet"}{" "}
                        link will be generated automatically
                      </span>
                    </div>
                    {meetingLink && (
                      <div className="bg-white mt-2 p-2 border rounded">
                        <p className="text-gray-600 text-sm">Meeting Link:</p>
                        <a
                          href={meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {meetingLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Date and Time */}
                <div className="gap-4 grid grid-cols-2">
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) =>
                        handleInputChange("scheduledDate", e.target.value)
                      }
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-gray-700 text-sm">
                      Time *
                    </label>
                    <Input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) =>
                        handleInputChange("scheduledTime", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() =>
                          handleInputChange("durationMinutes", mins)
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.durationMinutes === mins
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reminders */}
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        Send Reminders
                      </span>
                    </div>
                    <label className="inline-flex relative items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sendReminders}
                        onChange={(e) =>
                          handleInputChange("sendReminders", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="peer after:top-[2px] after:left-[2px] after:absolute bg-gray-200 after:bg-white peer-checked:bg-emerald-600 after:border after:border-gray-300 peer-checked:after:border-white rounded-full after:rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 w-11 after:w-5 h-6 after:h-5 after:content-[''] after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  {formData.sendReminders && (
                    <div className="flex gap-3">
                      {[
                        { id: "sms", label: "SMS" },
                        { id: "whatsapp", label: "WhatsApp" },
                        { id: "email", label: "Email" },
                      ].map((type) => (
                        <label
                          key={type.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.reminderTypes.includes(
                              type.id as "sms" | "email" | "whatsapp",
                            )}
                            onChange={(e) => {
                              const newTypes = e.target.checked
                                ? [
                                    ...formData.reminderTypes,
                                    type.id as "sms" | "email" | "whatsapp",
                                  ]
                                : formData.reminderTypes.filter(
                                    (t) => t !== type.id,
                                  );
                              handleInputChange("reminderTypes", newTypes);
                            }}
                            className="rounded focus:ring-emerald-500 w-4 h-4 text-emerald-600"
                          />
                          <span className="text-gray-700 text-sm">
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member count */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span>{members.length} members will be invited</span>
                </div>
              </div>
            )}

            {activeTab === "agenda" && (
              <div className="space-y-6">
                {/* Existing agenda items */}
                {agendaItems.length > 0 && (
                  <div className="space-y-3">
                    {agendaItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl"
                      >
                        <GripVertical className="mt-1 w-5 h-5 text-gray-400 cursor-move" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex justify-center items-center bg-emerald-100 rounded-full w-6 h-6 font-medium text-emerald-700 text-sm">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-gray-900">
                              {item.title}
                            </h4>
                            <span className="text-gray-500 text-sm">
                              ({item.duration} min)
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-1 ml-8 text-gray-600 text-sm">
                              {item.description}
                            </p>
                          )}
                          {item.presenter && (
                            <p className="mt-1 ml-8 text-emerald-600 text-sm">
                              Presenter: {item.presenter}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeAgendaItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new agenda item */}
                <div className="p-4 border-2 border-gray-200 border-dashed rounded-xl">
                  <h4 className="mb-4 font-medium text-gray-900">
                    Add Agenda Item
                  </h4>
                  <div className="space-y-4">
                    <Input
                      value={newAgendaItem.title}
                      onChange={(e) =>
                        setNewAgendaItem((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Agenda item title"
                    />
                    <Textarea
                      value={newAgendaItem.description}
                      onChange={(e) =>
                        setNewAgendaItem((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Description (optional)"
                      rows={2}
                    />
                    <div className="gap-4 grid grid-cols-2">
                      <div>
                        <label className="block mb-1 text-gray-600 text-sm">
                          Duration (minutes)
                        </label>
                        <Input
                          type="number"
                          value={newAgendaItem.duration}
                          onChange={(e) =>
                            setNewAgendaItem((prev) => ({
                              ...prev,
                              duration: parseInt(e.target.value) || 10,
                            }))
                          }
                          min={5}
                          max={120}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-gray-600 text-sm">
                          Presenter (optional)
                        </label>
                        <Input
                          value={newAgendaItem.presenter}
                          onChange={(e) =>
                            setNewAgendaItem((prev) => ({
                              ...prev,
                              presenter: e.target.value,
                            }))
                          }
                          placeholder="Who will present?"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addAgendaItem}
                      variant="outline"
                      className="gap-2"
                      disabled={!newAgendaItem.title}
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Total duration */}
                {agendaItems.length > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-lg text-emerald-700">
                    <Clock className="w-5 h-5" />
                    <span>
                      Total agenda duration:{" "}
                      {agendaItems.reduce(
                        (sum, item) => sum + item.duration,
                        0,
                      )}{" "}
                      minutes
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center bg-gray-50 p-6 border-t">
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMeeting}
              disabled={
                isSubmitting ||
                !formData.title ||
                !formData.scheduledDate ||
                !formData.scheduledTime
              }
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Meeting
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingManagement;
