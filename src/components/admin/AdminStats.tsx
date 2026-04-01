import {
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";

type AdminStatKey =
  | "totalMembers"
  | "pendingApprovals"
  | "activeLoans"
  | "totalContributions"
  | "defaulters"
  | "attendanceRate";

interface AdminStatsProps {
  stats: {
    totalMembers: number;
    pendingApprovals: number;
    activeLoans: number;
    pendingLoans: number;
    totalContributions: number;
    defaulters: number;
    upcomingMeetings: number;
    attendanceRate: number;
  };
  visibleCards?: AdminStatKey[];
}

export default function AdminStats({ stats, visibleCards }: AdminStatsProps) {
  const statCards = [
    {
      id: "totalMembers",
      title: "Total Members",
      value: stats.totalMembers.toLocaleString(),
      icon: Users,
      color: "bg-blue-500",
      change: "+12 this month",
    },
    {
      id: "pendingApprovals",
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: CheckCircle,
      color: "bg-amber-500",
      change: "Requires attention",
    },
    {
      id: "activeLoans",
      title: "Active Loans",
      value: stats.activeLoans,
      icon: CreditCard,
      color: "bg-emerald-500",
      change: `${stats.pendingLoans} pending review`,
    },
    {
      id: "totalContributions",
      title: "Total Contributions",
      value: `₦${(stats.totalContributions / 1000000).toFixed(1)}M`,
      icon: TrendingUp,
      color: "bg-purple-500",
      change: "+8.2% this month",
    },
    {
      id: "defaulters",
      title: "Defaulters",
      value: stats.defaulters,
      icon: AlertTriangle,
      color: "bg-red-500",
      change: "Action required",
    },
    {
      id: "attendanceRate",
      title: "Attendance Rate",
      value: `${stats.attendanceRate}%`,
      icon: Calendar,
      color: "bg-cyan-500",
      change: `${stats.upcomingMeetings} meetings scheduled`,
    },
  ];

  const visibleSet = visibleCards ? new Set(visibleCards) : null;
  const visibleStats = visibleSet
    ? statCards.filter((stat) => visibleSet.has(stat.id as AdminStatKey))
    : statCards;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {visibleStats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className={`${stat.color} p-2 rounded-lg`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-gray-500">{stat.change}</span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
