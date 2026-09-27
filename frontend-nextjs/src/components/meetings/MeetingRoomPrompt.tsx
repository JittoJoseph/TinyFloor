"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Video, X } from "lucide-react";
import { MAIN_MEETING, type MeetingInfo } from "@shared/messages";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useInMeetingRoom, useMeetings } from "@/lib/meetings";
import { usePlace } from "@/components/app/place";
import { FaceStack } from "@/components/ui/Face";
import { bezel, bezelPanel, onBezel } from "@/components/ui/bezel";
import { SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { useMeetingName } from "./hooks";

/**
 * Walking into the meeting room yourself doesn't put you in a meeting: it
 * offers one, the way a door with voices behind it does. The office's main
 * meeting first, and any others going on; in the lobby, where there are no
 * meetings, it says where they are.
 */
export function MeetingRoomPrompt() {
  const inRoom = useInMeetingRoom();
  const { meeting } = useCall();
  const place = usePlace();
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
        {open &&
          (place.kind === "office" ? (
            <OfficePrompt key="office" onClose={() => setClosedFor(true)} />
          ) : (
            <LobbyPrompt key="lobby" onClose={() => setClosedFor(true)} />
          ))}
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

function OfficePrompt({ onClose }: { onClose: () => void }) {
  const t = useTranslations("meetings");
  const rise = useRise();
  const router = useRouter();
  const place = usePlace();
  const { meetings } = useMeetings();
  const nameOf = useMeetingName();
  const main: MeetingInfo = meetings.find((one) => one.id === MAIN_MEETING) ?? {
    id: MAIN_MEETING,
    name: null,
    by: null,
    startedAt: null,
    members: [],
  };
  const others = meetings.filter((one) => one.id !== MAIN_MEETING);

  const join = (id: string) => {
    if (place.paths.meetings) router.push(place.paths.meetings);
    callManager.joinMeeting(id);
  };

  const row = (one: MeetingInfo, first: boolean) => {
    const live = one.members.length > 0;
    return (
      <div key={one.id} className={cn("flex items-center gap-3 px-2 py-1.5", !first && "border-t border-border")}>
        {live ? (
          <FaceStack seeds={one.members.map((member) => member.id)} size={26} max={3} />
        ) : (
          <span className="flex size-[26px] items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Video className="size-3.5" />
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13.5px] font-semibold text-foreground">{nameOf(one, place.name)}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {live ? t("people", { count: one.members.length }) : t("quiet")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => join(one.id)}
          className={cn(
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold outline-none transition-[background-color,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/60",
            live ? "bg-ok text-white hover:bg-ok/90" : "bg-foreground text-background hover:bg-foreground/85",
          )}
        >
          {live ? t("join") : t("start")}
        </button>
      </div>
    );
  };

  return (
    <motion.div {...rise} role="dialog" aria-label={t("roomTitle")} className={cn(bezel, "pointer-events-auto w-full max-w-[24rem] rounded-[26px] p-1.5")}>
      <div className={cn(onBezel, "flex items-center gap-2 px-3 pb-2 pt-1.5")}>
        <p className="flex-1 text-[12.5px] font-medium text-muted-foreground">{t("roomTitle")}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("notNow")}
          title={t("notNow")}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className={cn(bezelPanel, "rounded-[20px] p-1.5")}>
        {[main, ...others].map((one, index) => row(one, index === 0))}
      </div>
    </motion.div>
  );
}

/** In the lobby the meeting room is only a room: meetings come with an office of your own. */
function LobbyPrompt({ onClose }: { onClose: () => void }) {
  const t = useTranslations("meetings");
  const rise = useRise();
  const place = usePlace();
  return (
    <motion.div {...rise} role="dialog" aria-label={t("roomTitle")} className={cn(bezel, onBezel, "pointer-events-auto flex w-full max-w-[24rem] items-center gap-3 rounded-full p-1.5 ps-4")}>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">{t("lobbyRoom")}</p>
      {place.paths.yourOffice && (
        <Link
          href={place.paths.yourOffice}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-foreground px-3.5 text-[13px] font-semibold text-background outline-none transition-colors hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {t("getOffice")}
        </Link>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("notNow")}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
