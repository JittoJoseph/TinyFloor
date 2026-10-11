"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Video, X } from "@/components/ui/icons";
import { MAIN_MEETING, type MeetingInfo } from "@shared/messages";
import { useRouter } from "@/lib/i18n/navigation";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useInMeetingRoom, useMeetings } from "@/lib/meetings";
import { usePlace } from "@/components/app/place";
import { FaceStack } from "@/components/ui/Face";
import { bezel, onBezel } from "@/components/ui/bezel";
import { SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { useMeetingName } from "./hooks";

/**
 * Walking into the meeting room yourself doesn't put you in a meeting: it
 * offers one, the way a door with voices behind it does: the busiest going,
 * or the main one to start. The same in an office and in the lobby.
 */
export function MeetingRoomPrompt() {
  const inRoom = useInMeetingRoom();
  const { meeting } = useCall();
  // Closed once, it stays closed until you walk out and back in.
  const [closedFor, setClosedFor] = useState(false);
  const [wasInRoom, setWasInRoom] = useState(inRoom);
  if (wasInRoom !== inRoom) {
    setWasInRoom(inRoom);
    if (!inRoom) setClosedFor(false);
  }
  const open = inRoom && !meeting && !closedFor;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center px-3 sm:top-4">
      <AnimatePresence>
        {open && <RoomPrompt key="room" onClose={() => setClosedFor(true)} />}
      </AnimatePresence>
    </div>
  );
}

function useRise() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 },
    transition: SPRING_PANEL,
  };
}

/**
 * The meeting worth offering: the busiest one going, the main one first
 * among equals; while none is, the main one, to start.
 */
function offered(meetings: MeetingInfo[]): MeetingInfo {
  const going = meetings
    .filter((one) => one.members.length > 0)
    .sort((a, b) => b.members.length - a.members.length || Number(b.id === MAIN_MEETING) - Number(a.id === MAIN_MEETING));
  return (
    going[0] ??
    meetings.find((one) => one.id === MAIN_MEETING) ?? { id: MAIN_MEETING, name: null, by: null, startedAt: null, members: [] }
  );
}

function RoomPrompt({ onClose }: { onClose: () => void }) {
  const t = useTranslations("meetings");
  const rise = useRise();
  const router = useRouter();
  const place = usePlace();
  const { meetings } = useMeetings();
  const nameOf = useMeetingName();
  const meeting = offered(meetings);
  const live = meeting.members.length > 0;

  const join = () => {
    if (place.paths.meetings) router.push(place.paths.meetings);
    callManager.joinMeeting(meeting.id);
  };

  return (
    <motion.div
      {...rise}
      role="dialog"
      aria-label={nameOf(meeting, place.name)}
      className={cn(bezel, onBezel, "pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full p-1.5")}
    >
      {live ? (
        <FaceStack seeds={meeting.members.map((member) => member.id)} size={30} max={3} />
      ) : (
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-white/10 text-muted-foreground">
          <Video className="size-3.5" />
        </span>
      )}
      <p className="min-w-0 truncate text-[13.5px] font-semibold text-foreground">{nameOf(meeting, place.name)}</p>
      <button
        type="button"
        onClick={join}
        className={cn(
          "ms-1 inline-flex h-[30px] shrink-0 cursor-pointer items-center rounded-full px-3.5 text-[13px] font-semibold outline-none transition-[background-color,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/60",
          live ? "bg-ok text-white hover:bg-ok/90" : "bg-foreground text-background hover:bg-foreground/85",
        )}
      >
        {live ? t("join") : t("start")}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("notNow")}
        title={t("notNow")}
        className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
