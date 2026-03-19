import React from "react";
import { Users, MapPin, Calendar, TrendingUp } from "lucide-react";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string;
    location: string;
    memberCount: number;
    maxMembers: number;
    monthlyContribution: number;
    totalSavings: number;
    category: string;
    nextMeeting?: string;
    image: string;
    isOpen: boolean;
  };
  isMember?: boolean;
  onViewDetails: (id: string) => void;
  onJoinRequest: (id: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isMember = false,
  onViewDetails,
  onJoinRequest,
}) => {
  return (
    <div className="group bg-white shadow-sm hover:shadow-lg border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300">
      {/* Group Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={group.image}
          alt={group.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="top-3 left-3 absolute">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              group.isOpen
                ? "bg-emerald-500 text-white"
                : "bg-gray-500 text-white"
            }`}
          >
            {group.isOpen ? "Open" : "Closed"}
          </span>
        </div>
        <div className="top-3 right-3 absolute">
          <span className="bg-white/90 px-3 py-1 rounded-full font-medium text-gray-700 text-xs">
            {group.category}
          </span>
        </div>
      </div>

      {/* Group Info */}
      <div className="p-5">
        <h3 className="mb-2 font-bold text-gray-900 text-lg line-clamp-1">
          {group.name}
        </h3>
        <p className="mb-4 text-gray-600 text-sm line-clamp-2">
          {group.description}
        </p>

        {/* Stats */}
        <div className="gap-3 grid grid-cols-2 mb-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Users className="w-4 h-4 text-emerald-500" />
            <span>
              {group.memberCount}/{group.maxMembers}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="truncate">{group.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>₦{(group.monthlyContribution / 1000).toFixed(0)}K/mo</span>
          </div>
          {group.nextMeeting && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="truncate">{group.nextMeeting}</span>
            </div>
          )}
        </div>

        {/* Total Savings */}
        <div className="bg-emerald-50 mb-4 p-3 rounded-xl">
          <p className="mb-1 text-emerald-600 text-xs">Total Group Savings</p>
          <p className="font-bold text-emerald-700 text-lg">
            ₦{group.totalSavings.toLocaleString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(group.id)}
            className="flex-1 bg-emerald-50 hover:bg-emerald-100 py-2.5 rounded-xl font-medium text-emerald-600 text-sm transition-colors"
          >
            View Details
          </button>
          {!isMember && group.isOpen && (
            <button
              onClick={() => onJoinRequest(group.id)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-2.5 rounded-xl font-medium text-white text-sm transition-colors"
            >
              Join Group
            </button>
          )}

          {/* To be implemented later */}
          {/* {isMember && (
            <button
              onClick={() => onViewDetails(group.id)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 py-2.5 rounded-xl font-medium text-white text-sm transition-colors"
            >
              Open Chat
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
