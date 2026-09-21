"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Video, Mic, MessageSquare } from "lucide-react";
import { RoomIconButton, surface } from "./room/ui";
import { callManager } from "@/lib/CallManager";
import { Face, type Presence } from "@/components/ui/Face";

/** Asks whichever shell holds the floor to open a conversation with someone. */
export const OPEN_CONVERSATION_EVENT = "openConversation";

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
  const tShell = useTranslations("shell");
  const size = touch ? "md" : "sm";
  const icon = touch ? "w-[17px] h-[17px]" : "w-[14px] h-[14px]";

  return (
    <div className={`${surface} rounded-full flex items-center gap-1.5 p-1.5`}>
      <Face seed={player.id} size={touch ? 40 : 32} presence={player.status as Presence} title={player.name} />

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
        onClick={() =>
          window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { id: player.id, name: player.name } }))
        }
        title={tShell("message")}
        icon={<MessageSquare className={icon} />}
      />
    </div>
  );
});
