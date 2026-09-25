"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Phone } from "lucide-react";
import { RoomIconButton, surface } from "./room/ui";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { Face, type Presence } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

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

const STATUSES = new Set(["available", "busy", "away", "in_call"]);

/**
 * The card beside someone you have walked up to: who they are and how they
 * are, a message, and the call. A call starts with voice, like stopping by a
 * desk; the camera is in the dock once you're talking. Touch gets the bigger
 * sizes, since a fingertip needs more room than a cursor.
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
  const tStatus = useTranslations("status");
  const { peers } = useCall();
  const onCall = peers.some((peer) => peer.id === player.id);
  const status = STATUSES.has(player.status) ? tStatus(`${player.status as "available"}.label`) : null;

  return (
    <div className={cn(surface, "flex items-center rounded-full", touch ? "gap-2.5 p-2" : "gap-2 p-1.5")}>
      <Face seed={player.id} size={touch ? 40 : 32} presence={player.status as Presence} />

      <div className={cn("min-w-0 pe-1 leading-tight", touch ? "max-w-[9rem]" : "max-w-[8rem]")}>
        <p className={cn("truncate font-semibold text-foreground", touch ? "text-[14px]" : "text-[13px]")}>{player.name}</p>
        {status && <p className={cn("mt-0.5 truncate text-muted-foreground", touch ? "text-[12px]" : "text-[11.5px]")}>{status}</p>}
      </div>

      <RoomIconButton
        size={touch ? "md" : "sm"}
        onClick={() =>
          window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { id: player.id, name: player.name } }))
        }
        title={tShell("message")}
        icon={<MessageSquare className={touch ? "size-[17px]" : "size-[14px]"} />}
      />

      {onCall ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok/12 font-semibold text-ok",
            touch ? "h-10 px-4 text-[13.5px]" : "h-8 px-3 text-[12.5px]",
          )}
        >
          <span className="size-1.5 rounded-full bg-ok" />
          {t("onCall")}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => callManager.invite(player.id, player.name)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-foreground font-semibold text-background outline-none transition-[background-color,transform] duration-150 hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]",
            touch ? "h-10 px-4 text-[14px]" : "h-8 px-3.5 text-[12.5px]",
          )}
        >
          <Phone className={touch ? "size-4" : "size-3.5"} strokeWidth={2.25} />
          {t("call")}
        </button>
      )}
    </div>
  );
});
