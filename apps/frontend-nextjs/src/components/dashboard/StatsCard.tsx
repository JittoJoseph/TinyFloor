"use client";

import { TrendingUp, Users, Zap } from "lucide-react";

interface StatsCardProps {
  totalRooms: number;
  activeRooms: number;
  totalCollaborators: number;
}

export function StatsCard({
  totalRooms,
  activeRooms,
  totalCollaborators,
}: StatsCardProps) {
  const hasNoActivity = totalRooms === 0 && totalCollaborators === 0;

  return (
    <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-gray-400" />
        <h3 className="font-pixel text-sm text-gray-900">Stats</h3>
      </div>

      {hasNoActivity ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-gray-400 text-xs">Create your first room!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 flex-1 items-center">
          {/* Total Rooms */}
          <div className="text-center p-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <div className="w-6 h-6 rounded-lg bg-white border border-blue-200 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="font-pixel text-lg text-blue-700">{totalRooms}</div>
            <div className="text-[9px] text-blue-500 font-medium uppercase tracking-wide">
              Rooms
            </div>
          </div>

          {/* Active Now */}
          <div className="text-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="w-6 h-6 rounded-lg bg-white border border-emerald-200 flex items-center justify-center mx-auto mb-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-pixel text-lg text-emerald-700">
              {activeRooms}
            </div>
            <div className="text-[9px] text-emerald-500 font-medium uppercase tracking-wide">
              Active
            </div>
          </div>

          {/* Collaborators */}
          <div className="text-center p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <div className="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center mx-auto mb-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="font-pixel text-lg text-amber-700">
              {totalCollaborators}
            </div>
            <div className="text-[9px] text-amber-500 font-medium uppercase tracking-wide">
              People
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
