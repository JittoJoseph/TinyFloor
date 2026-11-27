"use client";

import { memo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { AudioLines, MessageSquare, Users } from "web-shared/components/ui/icons";
import { pokeAt, waveAt } from "@/lib/floor";
import { did } from "@/lib/settle";
import { useRouter } from "@/lib/i18n/navigation";
import { usePlace } from "@/components/app/place";
import { surface } from "./room/ui";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { cn } from "web-shared/lib/utils";
import type { StatusNote } from "shared-protocol/messages";
import { usePerson } from "@/lib/people";
import { NoteText } from "@/components/app/StatusNote";
import { NoteGlyph } from "@/lib/noteIcons";
import { Tooltip } from "@/components/motion/tooltip";
import { statusColor } from "web-shared/lib/status";
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
 * What you can do with someone you've stopped beside, grown out of their name
 * tag in its place (ProximityOverlay): their name and status dot as the tag
 * had them, then a wave and a poke, shown as the very hand and finger they'll
 * see over the floor, a message, and talking. Talking starts with voice, like
 * stopping by a desk; the camera is in the dock once you're talking. Already
 * talking to someone, a third person is offered a meeting instead. Someone on
 * a call with others can only be messaged. Touch gets the bigger sizes, since
 * a fingertip needs more room than a cursor.
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
  // Already talking to someone else: a third person makes it a meeting, in offices.
  const meetingPath = place.paths.meetings;
  const asMeeting = peers.length > 0 && !!meetingPath;
  const busy = player.status === "in_call";
  const status = STATUSES.has(player.status) ? tStatus(`${player.status as "available"}.label`) : null;
  // What they're listening to, if they share it: a mark by their name, the rest a press away.
  const spotify = usePerson(player.guest ? null : player.id)?.spotify ?? null;
  const button = touch ? "size-10" : "size-8";
  const glyph = touch ? "text-[18px]" : "text-[15px]";

  return (
    <div className={cn(surface, "flex items-center rounded-full", touch ? "h-12 gap-0.5 pe-1 ps-4" : "h-10 gap-0.5 pe-1 ps-3.5")}>
      <Tooltip content={player.note ? <NoteText note={player.note} /> : status} side="top" delay={250}>
        <span className="flex min-w-0 items-center gap-2 pe-1">
          <span className="size-2 shrink-0 rounded-full" style={{ background: statusColor(player.status) }} />
          <span className={cn("max-w-[9rem] truncate font-semibold text-foreground", touch ? "text-[15px]" : "text-[13px]")}>{player.name}</span>
          {player.note && <NoteGlyph icon={player.note.icon} className="size-[13px] shrink-0 text-muted-foreground" />}
        </span>
      </Tooltip>

      {spotify && (
        <Menu
          side="top"
          align="start"
          width={264}
          trigger={
            <button type="button" aria-label={tSpotify(spotify.kind === "jam" ? "inJam" : "listening")} className={cn(BUTTON, "size-7")}>
              <SpotifyMark className="size-[14px] text-[#1ed760]" />
            </button>
          }
        >
          <SpotifyActivity share={spotify} name={player.name} className="bg-transparent p-1.5" />
        </Menu>
      )}

      <span aria-hidden="true" className="mx-1.5 h-4 w-px shrink-0 bg-border" />

      {busy ? (
        <span className={cn("px-1.5 text-muted-foreground", touch ? "text-[14px]" : "text-[12.5px]")}>{status}</span>
      ) : (
        <>
          <Gesture className={button} label={t("wave")} onSend={() => waveAt(player.id)} settle="wave">
            <span className={cn(EMOJI, glyph)}>👋</span>
          </Gesture>
          <Gesture className={button} label={t("poke")} onSend={() => pokeAt(player.id)}>
            <span className={cn(EMOJI, glyph)}>👉</span>
          </Gesture>
        </>
      )}
      <Tooltip content={tShell("message")} side="top" delay={250}>
        <button
          type="button"
          aria-label={tShell("message")}
          onClick={() => {
            did("hello");
            window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { id: player.id, name: player.name } }));
          }}
          className={cn(BUTTON, button)}
        >
          <MessageSquare className={touch ? "size-[18px]" : "size-[15px]"} />
        </button>
      </Tooltip>

      {busy ? null : asMeeting ? (
        <button
          type="button"
          onClick={() => {
            router.push(meetingPath!);
            callManager.startMeeting("", [player.id]);
          }}
          title={tMeetings("makeMeetingHint")}
          className={cn(PILL, "ms-1 bg-ok text-white hover:bg-ok/90 focus-visible:ring-ok/50", touch ? "h-10 px-4 text-[14px]" : "h-8 px-3.5 text-[12.5px]")}
        >
          <Users className={touch ? "size-4" : "size-3.5"} strokeWidth={2.25} />
          {tMeetings("makeMeeting")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => callManager.invite(player.id, player.name)}
          className={cn(PILL, "ms-1 bg-foreground text-background hover:bg-foreground/85 focus-visible:ring-ring/60", touch ? "h-10 px-4 text-[14px]" : "h-8 px-3.5 text-[12.5px]")}
        >
          <AudioLines className={touch ? "size-4" : "size-3.5"} strokeWidth={2.25} />
          {t("talk")}
        </button>
      )}
    </div>
  );
},
// Where they stand on screen moves every frame the camera glides; this only changes with who they are and how they are.
(before, after) =>
  before.touch === after.touch &&
  before.player.id === after.player.id &&
  before.player.name === after.player.name &&
  before.player.status === after.player.status &&
  before.player.guest === after.player.guest &&
  before.player.note === after.player.note,
);

const EMOJI = "font-[Apple_Color_Emoji,Segoe_UI_Emoji,Noto_Color_Emoji,sans-serif] leading-none";
const BUTTON =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60";
const PILL =
  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full font-semibold outline-none transition-[background-color,transform] duration-150 focus-visible:ring-2 active:scale-[0.97]";

/** How long a wave or a poke takes to be ready again: a poke is a nudge, not a drum roll. */
const GESTURE_REST_MS = 1500;

/**
 * A wave or a poke, as the hand or finger it puts on the floor (over you, or
 * jabbing at them). Pressed, it springs out as it goes, then rests a moment
 * before it can go again.
 */
function Gesture({ className, label, children, onSend, settle }: { className: string; label: string; children: ReactNode; onSend: () => void; settle?: string }) {
  const reduce = useReducedMotion();
  const [sent, setSent] = useState(0);
  const [resting, setResting] = useState(false);
  return (
    <Tooltip content={label} side="top" delay={250}>
      <button
        type="button"
        aria-label={label}
        aria-disabled={resting}
        data-settle={settle}
        className={cn(BUTTON, className, resting && "cursor-default hover:bg-transparent")}
        onClick={() => {
          if (resting) return;
          onSend();
          setSent((n) => n + 1);
          setResting(true);
          window.setTimeout(() => setResting(false), GESTURE_REST_MS);
        }}
      >
        <motion.span
          key={sent}
          className="flex"
          initial={sent && !reduce ? { scale: 1.6, rotate: -14, y: -6 } : false}
          animate={{ scale: 1, rotate: 0, y: 0, opacity: resting ? 0.4 : 1 }}
          transition={{ type: "spring", stiffness: 480, damping: 15 }}
        >
          {children}
        </motion.span>
      </button>
    </Tooltip>
  );
}
