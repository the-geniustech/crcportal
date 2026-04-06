import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { sendContributionReminders } from "@/lib/admin";

interface ContributionRecord {
  id: string;
  userId: string;
  groupId: string;
  memberName: string;
  memberSerial?: string | null;
  groupName: string;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string;
  status: "paid" | "partial" | "pending" | "defaulted";
  monthsDefaulted: number;
}

interface ContributionTrackerProps {
  contributions: ContributionRecord[];
  onMarkPaid: (memberId: string) => void;
  year: number;
  month: number;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  canManageActions?: boolean;
}

export default function ContributionTracker({
  contributions,
  onMarkPaid,
  year,
  month,
  onYearChange,
  onMonthChange,
  canManageActions = true,
}: ContributionTrackerProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTargets, setReminderTargets] = useState<ContributionRecord[]>(
    [],
  );
  const [reminderChannels, setReminderChannels] = useState({
    email: false,
    sms: false,
    notification: true,
  });
  const [sendingReminder, setSendingReminder] = useState(false);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, idx) => currentYear - idx);
  }, []);

  const monthOptions = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    [],
  );

  const groups = [...new Set(contributions.map((c) => c.groupName))];

  const filteredContributions = contributions.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.memberName.toLowerCase().includes(query) ||
      c.groupName.toLowerCase().includes(query) ||
      (c.memberSerial ? c.memberSerial.toLowerCase().includes(query) : false);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesGroup = groupFilter === "all" || c.groupName === groupFilter;
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const defaulters = contributions.filter((c) => c.status === "defaulted");
  const exportCsv = () => {
    const headers = [
      "Member Serial",
      "Member Name",
      "Group",
      "Expected",
      "Paid",
      "Due Date",
      "Status",
      "Months Defaulted",
    ];

    const rows = filteredContributions.map((record) => [
      record.memberSerial ?? "-",
      record.memberName,
      record.groupName,
      record.expectedAmount,
      record.paidAmount,
      record.dueDate,
      record.status,
      record.monthsDefaulted,
    ]);

    const csvEscape = (value: string | number) => {
      const raw = String(value ?? "");
      if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const csvBody = [headers, ...rows]
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\n");
    const csv = `\uFEFF${csvBody}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contribution-tracker-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalExpected = contributions.reduce(
    (sum, c) => sum + c.expectedAmount,
    0,
  );
  const totalPaid = contributions.reduce((sum, c) => sum + c.paidAmount, 0);
  const collectionRate =
    totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  const getStatusBadge = (status: string, monthsDefaulted: number) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle className="mr-1 w-3 h-3" />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Clock className="mr-1 w-3 h-3" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="mr-1 w-3 h-3" />
            Pending
          </Badge>
        );
      case "defaulted":
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="mr-1 w-3 h-3" />
            {monthsDefaulted}mo Defaulted
          </Badge>
        );
      default:
        return null;
    }
  };

  const openReminderModal = (targets: ContributionRecord[]) => {
    if (!canManageActions) return;
    if (targets.length === 0) {
      toast({
        title: "No recipients",
        description:
          "There are no members to remind for the current selection.",
      });
      return;
    }
    setReminderTargets(targets);
    setReminderOpen(true);
  };

  const reminderSummary = useMemo(() => {
    if (reminderTargets.length === 0) return "No recipients selected";
    if (reminderTargets.length === 1) {
      return `Send reminder to ${reminderTargets[0].memberName}`;
    }
    return `Send reminders to ${reminderTargets.length} members`;
  }, [reminderTargets]);

  const canSendReminder =
    reminderChannels.email ||
    reminderChannels.sms ||
    reminderChannels.notification;

  const buildChannelSummary = (
    label: string,
    channel?: {
      requested: boolean;
      sent: number;
      failed: number;
      skipped: number;
    },
  ) => {
    if (!channel || !channel.requested) return null;
    const segments = [`${label}: ${channel.sent} sent`];
    if (channel.failed > 0) segments.push(`${channel.failed} failed`);
    if (channel.skipped > 0) segments.push(`${channel.skipped} skipped`);
    return segments.join(", ");
  };

  const handleSendReminder = async () => {
    if (!canManageActions) return;
    if (!canSendReminder || reminderTargets.length === 0) return;
    setSendingReminder(true);
    try {
      const recipients = reminderTargets.map((target) => ({
        userId: target.userId,
        groupId: target.groupId,
      }));
      const response = await sendContributionReminders({
        year,
        month,
        recipients,
        sendEmail: reminderChannels.email,
        sendSMS: reminderChannels.sms,
        sendNotification: reminderChannels.notification,
      });
      const channelSummaries = [
        buildChannelSummary("Email", response.channels?.email),
        buildChannelSummary("SMS", response.channels?.sms),
        buildChannelSummary("In-app", response.channels?.notification),
      ].filter(Boolean);
      const summary =
        channelSummaries.length > 0
          ? channelSummaries.join(" | ")
          : "Delivery queued.";
      const recipientLabel =
        reminderTargets.length === 1 ? "member" : "members";
      toast({
        title: `Reminders sent to ${reminderTargets.length} ${recipientLabel}`,
        description: summary,
      });
      setReminderOpen(false);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Unable to send reminders.";
      toast({
        title: "Reminder failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards frontend/src/components/admin/ContributionTracker.tsx */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Collection Rate</p>
              <p className="font-bold text-emerald-600 text-2xl">
                {collectionRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <Progress value={collectionRate} className="mt-2 h-2" />
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <p className="text-gray-500 text-sm">Total Expected</p>
          <p className="font-bold text-gray-900 text-2xl">
            ₦{totalExpected.toLocaleString()}
          </p>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <p className="text-gray-500 text-sm">Total Collected</p>
          <p className="font-bold text-emerald-600 text-2xl">
            ₦{totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Defaulters</p>
              <p className="font-bold text-red-600 text-2xl">
                {defaulters.length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Defaulter Alert */}
      {defaulters.length > 0 && (
        <div className="bg-red-50 p-4 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 w-5 h-5 text-red-600" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Defaulter Alert</h4>
              <p className="mt-1 text-red-600 text-sm">
                {defaulters.length} member(s) have outstanding contributions.
                {defaulters.filter((d) => d.monthsDefaulted >= 3).length > 0 &&
                  ` ${defaulters.filter((d) => d.monthsDefaulted >= 3).length} have been defaulting for 3+ months.`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {defaulters.slice(0, 5).map((d) => (
                  <Badge
                    key={d.id}
                    variant="outline"
                    className="bg-white border-red-300 text-red-700"
                  >
                    {d.memberName}
                    {d.memberSerial ? ` · ${d.memberSerial}` : ""} (
                    {d.monthsDefaulted}mo)
                  </Badge>
                ))}
                {defaulters.length > 5 && (
                  <Badge
                    variant="outline"
                    className="bg-white border-red-300 text-red-700"
                  >
                    +{defaulters.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
            {canManageActions && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => openReminderModal(defaulters)}
              >
                Send Reminders
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow-sm p-4 border border-gray-100 rounded-xl">
        <div className="flex md:flex-row flex-col gap-4">
          <div className="relative flex-1">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="defaulted">Defaulted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(value) => onYearChange?.(Number(value))}
            disabled={!onYearChange}
          >
            <SelectTrigger className="w-full md:w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month)}
            onValueChange={(value) => onMonthChange?.(Number(value))}
            disabled={!onMonthChange}
          >
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((label, idx) => (
                <SelectItem key={label} value={String(idx + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Contribution Table */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Member
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Group
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Expected
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Paid
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Due Date
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                  Status
                </th>
                {canManageActions && (
                  <th className="px-4 py-3 font-medium text-gray-600 text-sm text-left">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContributions.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.memberName}
                      </p>
                      {record.memberSerial && (
                        <p className="text-gray-400 text-xs">
                          {record.memberSerial}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {record.groupName}
                  </td>
                  <td className="px-4 py-3 font-medium text-sm">
                    ₦{record.expectedAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        record.paidAmount >= record.expectedAmount
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    >
                      ₦{record.paidAmount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    <div className="space-y-1">
                      <div>{new Date(record.dueDate).toLocaleDateString()}</div>
                      <span className="inline-flex bg-emerald-50 px-2 py-0.5 rounded-full font-medium text-[11px] text-emerald-700">
                        Open: 27th-4th
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.status, record.monthsDefaulted)}
                  </td>
                  {canManageActions && (
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openReminderModal([record])}
                          >
                            Remind
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onMarkPaid(record.id)}
                            disabled={record.status === "paid"}
                          >
                            Mark Paid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Contribution Reminder</DialogTitle>
            <DialogDescription>{reminderSummary}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-email"
                  checked={reminderChannels.email}
                  onCheckedChange={(value) =>
                    setReminderChannels((prev) => ({
                      ...prev,
                      email: Boolean(value),
                    }))
                  }
                />
                <Label htmlFor="reminder-email">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-sms"
                  checked={reminderChannels.sms}
                  onCheckedChange={(value) =>
                    setReminderChannels((prev) => ({
                      ...prev,
                      sms: Boolean(value),
                    }))
                  }
                />
                <Label htmlFor="reminder-sms">SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reminder-notification"
                  checked={reminderChannels.notification}
                  onCheckedChange={(value) =>
                    setReminderChannels((prev) => ({
                      ...prev,
                      notification: Boolean(value),
                    }))
                  }
                />
                <Label htmlFor="reminder-notification">
                  In-app notification
                </Label>
              </div>
            </div>

            {!canSendReminder && (
              <p className="text-rose-500 text-sm">
                Select at least one channel to send reminders.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!canSendReminder || sendingReminder}
              onClick={handleSendReminder}
            >
              {sendingReminder ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
