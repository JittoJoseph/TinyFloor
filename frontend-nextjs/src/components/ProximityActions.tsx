"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Video, Mic, MessageSquare } from "lucide-react";
import { RoomIconButton, surface } from "./room/ui";
import { callManager } from "@/lib/CallManager";
import { statusColor } from "@/lib/status";

export interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  guest: boolean;
}

export const TOUCH_BREAKPOINT = 768;

/**
 * The little bar beside someone you have walked up to: who they are, and the
 * two ways to talk. Touch gets the bigger buttons, since a fingertip needs
 * more room than a cursor.
 */
export const ProximityActions = memo(function ProximityActions({
  player,
  touch = false,
}: {
  player: NearbyPlayer;
  touch?: boolean;
}) {
  const t = useTranslations("proximity");
  const tChat = useTranslations("chat");
  const size = touch ? "md" : "sm";
  const icon = touch ? "w-[17px] h-[17px]" : "w-[14px] h-[14px]";
  const face = touch ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";

  return (
    <div className={`${surface} rounded-full flex items-center gap-1.5 p-1.5`}>
      <span
        className={`relative ${face} rounded-full bg-[var(--color-braun-text)]/[0.06] flex items-center justify-center font-body font-semibold text-[var(--color-braun-text)] shrink-0`}
        title={player.name}
      >
        {player.name.charAt(0).toUpperCase()}
        <span
          aria-hidden="true"
          className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full border-2 border-[#fbfbf9]"
          style={{ backgroundColor: statusColor(player.status) }}
        />
      </span>

      <RoomIconButton
        size={size}
        onClick={() => callManager.invite(player.id, player.name, true)}
        title={t("videoCall")}
        icon={<Video className={icon} />}
      />
      <RoomIconButton
        size={size}
        onClick={() => callManager.invite(player.id, player.name, false)}
        title={t("audioCall")}
        icon={<Mic className={icon} />}
      />
      <RoomIconButton
        size={size}
        onClick={() => window.dispatchEvent(new Event("openChat"))}
        title={tChat("title")}
        icon={<MessageSquare className={icon} />}
      />
    </div>
  );
});
