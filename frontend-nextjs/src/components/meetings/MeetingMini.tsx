"use client";

import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useCall } from "@/lib/useCall";
import { usePlace } from "@/components/app/place";
import { cn } from "@/lib/utils";
import { MeetingTile } from "./MeetingTile";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "./hooks";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Your meeting, while you look at the floor: whoever is talking, small, and
 * the way back to the stage. Out here only one small video is received.
 */
export function MeetingMini() {
  const t = useTranslations("meetings");
  const router = useRouter();
  const place = usePlace();
  const { user } = useAuth();
  const { meetingPeers, stage } = useCall();
  const meeting = useMyMeeting();
  const nameOf = useMeetingName();
  const elapsed = useElapsed(meeting?.startedAt ?? null);
  if (!meeting || !place.paths.meetings) return null;

  const others = meeting.members.filter((member) => member.id !== user?.id);
  const onCamera = others.find((member) => member.id === stage.cameras[0]);
  const shown = onCamera ?? others.find((member) => member.speaking) ?? others[others.length - 1];
  const peer = shown && meetingPeers.find((one) => one.id === shown.id);
  const meetingsPath = place.paths.meetings;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute end-3 top-16 z-40 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-float",
        "sm:bottom-4 sm:end-4 sm:top-auto sm:w-64",
      )}
    >
      {shown ? (
        <MeetingTile
          id={shown.id}
          name={shown.name}
          character={shown.character}
          video={onCamera && peer?.cameraOn ? peer.camera : null}
          speaking={shown.speaking}
          micOff={!!peer && !peer.mic}
          compact
          className="aspect-video w-full rounded-none"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted px-4 text-center text-[12px] text-muted-foreground">
          {t("aloneShort")}
        </div>
      )}
      <button
        type="button"
        onClick={() => router.push(meetingsPath)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
      >
        <span className="size-2 shrink-0 rounded-full bg-ok" aria-hidden />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12.5px] font-semibold text-foreground">{nameOf(meeting, place.name)}</span>
          <span className="block text-[11.5px] tabular-nums text-muted-foreground">
            {clock(elapsed)} · {t("people", { count: meeting.members.length })}
          </span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-label={t("open")} />
      </button>
    </div>
  );
}
