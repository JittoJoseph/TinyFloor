"use client";

import { Clock, UserPlus, Globe, LogIn } from "lucide-react";
import { Room } from "./RoomCard";

interface ActivityItem {
  id: string;
  type: "room_created" | "room_joined" | "room_visited";
  roomName: string;
  timestamp: string;
}

interface ActivityFeedProps {
  createdRooms: Room[];
  joinedRooms: Room[];
}

export function ActivityFeed({ createdRooms, joinedRooms }: ActivityFeedProps) {
  // Generate activity items from rooms data
  const activities: ActivityItem[] = [
    ...createdRooms.map((room) => ({
      id: `created-${room.id}`,
      type: "room_created" as const,
      roomName: room.name,
      timestamp: room.createdAt,
    })),
    ...joinedRooms.map((room) => ({
      id: `joined-${room.id}`,
      type: "room_joined" as const,
      roomName: room.name,
      timestamp: room.lastActivityAt,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 4);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "room_created":
        return { Icon: Globe, color: "text-blue-600", bg: "bg-blue-50" };
      case "room_joined":
        return {
          Icon: UserPlus,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        };
      case "room_visited":
        return { Icon: LogIn, color: "text-amber-600", bg: "bg-amber-50" };
    }
  };

  const getActivityLabel = (type: ActivityItem["type"]) => {
    switch (type) {
      case "room_created":
        return "Created";
      case "room_joined":
        return "Joined";
      case "room_visited":
        return "Visited";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  if (activities.length === 0) {
    return (
      <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">
            Recent Activities
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-center py-8 text-gray-400 text-xs">
            No activity yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="font-pixel text-sm text-gray-900">
            Recent Activities
          </h3>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {activities.length}
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1 min-h-[200px] pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
        {activities.map((activity) => {
          const { Icon, color, bg } = getActivityIcon(activity.type);
          return (
            <div
              key={activity.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg} shrink-0`}
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900 truncate font-medium">
                  {activity.roomName}
                </p>
                <p className="text-[10px] text-gray-400">
                  {getActivityLabel(activity.type)}
                </p>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">
                {formatTimeAgo(activity.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
