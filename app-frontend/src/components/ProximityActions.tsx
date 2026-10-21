"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Phone, Users } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { usePlace } from "@/components/app/place";
import { RoomIconButton, surface } from "./room/ui";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { Face, type Presence } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import type { StatusNote } from "@shared/messages";
import { usePerson } from "@/lib/people";
import { Menu } from "@/components/ui/Menu";
import { SpotifyActivity, SpotifyMark } from "@/components/app/SpotifyActivity";

/** Asks whichever shell holds the floor to open a conversation with someone. */
export const OPEN_CONVERSATION_EVENT = "openConversation";

export interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  guest: boolean;
  /** Their status note, which says more than their status: shown in its place. */
  note?: StatusNote | null;
}

export const TOUCH_BREAKPOINT = 768;

const STATUSES = new Set(["available", "busy", "away", "in_call"]);

/**
 * The card beside someone you have walked up to: who they are and how they
 * are, a message, and the call. A call starts with voice, like stopping by a
 * desk; the camera is in the dock once you're talking. A call is two people:
 * already on one, walking up to a third offers a meeting for the three of
 * you instead. Touch gets the bigger sizes, since a fingertip needs more room
 * than a cursor.
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
  const tMeetings = useTranslations("meetings");
  const tSpotify = useTranslations("spotify");
  const router = useRouter();
  const place = usePlace();
  const { peers } = useCall();
  const onCall = peers.some((peer) => peer.id === player.id);
  // Already talking to someone else: a third person makes it a meeting, in offices.
  const meetingPath = place.paths.meetings;
  const asMeeting = !onCall && peers.length > 0 && !!meetingPath;
  const busy = !onCall && player.status === "in_call";
  const status = STATUSES.has(player.status) ? tStatus(`${player.status as "available"}.label`) : null;
  const note = player.note ? [player.note.emoji, player.note.text].filter(Boolean).join(" ") : null;
  // What they're listening to, if they share it: their mark beside the message button, the rest a press away.
  const spotify = usePerson(player.guest ? null : player.id)?.spotify ?? null;

  return (
    <div className={cn(surface, "flex items-center rounded-full", touch ? "gap-2.5 p-2" : "gap-2 p-1.5")}>
      <Face seed={player.id} size={touch ? 40 : 32} presence={player.status as Presence} />

      <div className={cn("min-w-0 pe-1 leading-tight", note ? "max-w-[12rem]" : touch ? "max-w-[9rem]" : "max-w-[8rem]")}>
        <p className={cn("truncate font-semibold text-foreground", touch ? "text-[14px]" : "text-[13px]")}>{player.name}</p>
        {(note || status) && (
          <p title={note ?? undefined} className={cn("mt-0.5 truncate text-muted-foreground", touch ? "text-[12px]" : "text-[11.5px]")}>
            {note ?? status}
          </p>
        )}
      </div>

      {spotify && (
        <Menu
          side="top"
          align="start"
          width={264}
          trigger={
            <RoomIconButton
              size={touch ? "md" : "sm"}
              title={tSpotify(spotify.kind === "jam" ? "inJam" : "listening")}
              icon={<SpotifyMark className={cn("text-[#1ed760]", touch ? "size-[18px]" : "size-[15px]")} />}
            />
          }
        >
          <SpotifyActivity share={spotify} name={player.name} className="bg-transparent p-1.5" />
        </Menu>
      )}

      <RoomIconButton
        size={touch ? "md" : "sm"}
        onClick={() =>
          window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { id: player.id, name: player.name } }))
        }
        title={tShell("message")}
        icon={<MessageSquare className={touch ? "size-[17px]" : "size-[14px]"} />}
      />

      {asMeeting ? (
        <button
          type="button"
          onClick={() => {
            router.push(meetingPath!);
            callManager.startMeeting("", [player.id]);
          }}
          title={tMeetings("makeMeetingHint")}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ok font-semibold text-white outline-none transition-[background-color,transform] duration-150 hover:bg-ok/90 focus-visible:ring-2 focus-visible:ring-ok/50 active:scale-[0.97]",
            touch ? "h-10 px-4 text-[14px]" : "h-8 px-3.5 text-[12.5px]",
          )}
        >
          <Users className={touch ? "size-4" : "size-3.5"} strokeWidth={2.25} />
          {tMeetings("makeMeeting")}
        </button>
      ) : busy || peers.length > 0 ? null : onCall ? (
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
},
// Where they stand on screen moves every frame the camera glides; the card
// beside them only changes with who they are and how they are.
(before, after) =>
  before.touch === after.touch &&
  before.player.id === after.player.id &&
  before.player.name === after.player.name &&
  before.player.status === after.player.status &&
  before.player.guest === after.player.guest,
);
