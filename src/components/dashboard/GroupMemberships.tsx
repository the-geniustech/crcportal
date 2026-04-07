import React from "react";
import { GROUP_ROLE, type GroupRole } from "@/lib/roles";

export interface Group {
  id: string;
  name: string;
  location: string;
  memberCount: number;
  role: GroupRole;
  contributionStatus:
    | "active"
    | "pending"
    | "inactive"
    | "suspended"
    | "rejected"
    | "paused"
    | "defaulted";
  totalContributed: number;
  monthlyContribution: number;
  expectedMonthlyContribution?: number;
  nextMeeting: string;
  imageUrl?: string;
}

interface GroupMembershipsProps {
  groups: Group[];
  onViewGroup: (groupId: string) => void;
  onContribute: (groupId: string) => void;
}

const GroupMemberships: React.FC<GroupMembershipsProps> = ({
  groups,
  onViewGroup,
  onContribute,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRoleBadge = (role: Group["role"]) => {
    const colors: Record<GroupRole, string> = {
      [GROUP_ROLE.MEMBER]: "bg-gray-100 text-gray-700",
      [GROUP_ROLE.TREASURER]: "bg-blue-100 text-blue-700",
      [GROUP_ROLE.SECRETARY]: "bg-purple-100 text-purple-700",
      [GROUP_ROLE.CHAIRMAN]: "bg-amber-100 text-amber-700",
      [GROUP_ROLE.COORDINATOR]: "bg-indigo-100 text-indigo-700",
      [GROUP_ROLE.ADMIN]: "bg-rose-100 text-rose-700",
    };
    return colors[role] ?? "bg-gray-100 text-gray-700";
  };

  const getStatusColor = (status: Group["contributionStatus"]) => {
    const colors = {
      active: "text-emerald-600",
      pending: "text-amber-600",
      inactive: "text-gray-500",
      suspended: "text-rose-600",
      rejected: "text-rose-600",
      paused: "text-yellow-600",
      defaulted: "text-red-600",
    };
    return colors[status] ?? "text-gray-500";
  };

  const navigate = (path: string) => {
    window.location.href = path;
  };

  if (groups.length === 0) {
    return (
      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <h3 className="mb-4 font-semibold text-gray-900 text-lg">My Groups</h3>
        <div className="py-8 text-center">
          <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500">You haven't joined any groups yet</p>
          <button
            onClick={() => navigate("/groups")}
            className="bg-emerald-500 hover:bg-emerald-600 mt-4 px-4 py-2 rounded-lg font-medium text-white transition-colors"
          >
            Browse Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">My Groups</h3>
        <button
          onClick={() => navigate("/groups")}
          className="font-medium text-emerald-600 hover:text-emerald-700 text-sm"
        >
          Browse More
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="p-4 border border-gray-100 hover:border-gray-200 rounded-xl transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-shrink-0 justify-center items-center bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl w-14 h-14 font-bold text-white text-lg">
                {group.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 truncate">
                      {group.name}
                    </h4>
                    <p className="flex items-center gap-1 text-gray-500 text-sm">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {group.location}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(group.role)}`}
                  >
                    {group.role}
                  </span>
                </div>

                <div className="gap-4 grid grid-cols-2 mt-3">
                  <div>
                    <p className="text-gray-500 text-xs">Total Contributed</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(group.totalContributed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">
                      {group.expectedMonthlyContribution !== undefined
                        ? "Expected Monthly"
                        : "Monthly"}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(
                        group.expectedMonthlyContribution ??
                          group.monthlyContribution,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-gray-100 border-t">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      {group.memberCount} members
                    </span>
                    <span
                      className={`flex items-center gap-1 capitalize ${getStatusColor(group.contributionStatus)}`}
                    >
                      <span className="bg-current rounded-full w-2 h-2"></span>
                      {group.contributionStatus}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewGroup(group.id)}
                      className="px-3 py-1.5 font-medium text-gray-600 hover:text-gray-900 text-sm transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onContribute(group.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-medium text-white text-sm transition-colors"
                    >
                      Contribute
                    </button>
                  </div>
                </div>

                {group.nextMeeting && (
                  <div className="flex items-center gap-2 bg-gray-50 mt-3 px-3 py-2 rounded-lg text-gray-500 text-sm">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Next meeting: {group.nextMeeting}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupMemberships;
