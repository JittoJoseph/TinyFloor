"use client";

import { memo } from "react";
import { Video, Mic, MessageSquare, User } from "lucide-react";
import { callManager } from "@/lib/CallManager";

export interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  guest: boolean;
}

export const TOUCH_BREAKPOINT = 768;

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-500",
  in_call: "bg-blue-500",
};

const SIZES = {
  pointer: {
    chip: "w-7 h-7",
    icon: "w-[13px] h-[13px]",
    gap: "gap-1.5",
    pad: "p-1.5",
    initial: "text-xs",
    dot: "w-2 h-2",
  },
  touch: {
    chip: "w-9 h-9",
    icon: "w-[17px] h-[17px]",
    gap: "gap-2",
    pad: "p-2",
    initial: "text-sm",
    dot: "w-2.5 h-2.5",
  },
};

export const ProximityActions = memo(function ProximityActions({
  player,
  touch = false,
}: {
  player: NearbyPlayer;
  touch?: boolean;
}) {
  const size = touch ? SIZES.touch : SIZES.pointer;
  const actionClass = `cursor-pointer ${size.chip} rounded-full bg-white border border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all flex items-center justify-center shrink-0`;

  return (
    <div
      className={`flex items-center ${size.gap} ${size.pad} bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-full shadow-md`}
    >
      <div
        className={`relative ${size.chip} rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] font-bold ${size.initial} shrink-0`}
      >
        {player.name.charAt(0).toUpperCase()}
        <span
          className={`absolute bottom-0 right-0 ${size.dot} rounded-full border-[1.5px] border-[#fbfbf9] ${
            STATUS_COLORS[player.status] || "bg-gray-400"
          }`}
        />
      </div>

      <button
        onClick={() => callManager.invite(player.id, player.name, true)}
        className={actionClass}
        title="Video call"
      >
        <Video className={size.icon} />
      </button>
      <button
        onClick={() => callManager.invite(player.id, player.name, false)}
        className={actionClass}
        title="Audio call"
      >
        <Mic className={size.icon} />
      </button>
      <button
        onClick={() => window.dispatchEvent(new Event("openChat"))}
        className={actionClass}
        title="Room chat"
      >
        <MessageSquare className={size.icon} />
      </button>
      {!player.guest && (
        <button
          onClick={() =>
            window.open(
              `/dashboard?user=${player.id}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
          className={actionClass}
          title="View profile"
        >
          <User className={size.icon} />
        </button>
      )}
    </div>
  );
});
