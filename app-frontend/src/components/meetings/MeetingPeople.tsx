"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MicOff, X } from "@/components/ui/icons";
import type { MeetingInfo } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { useFloor } from "@/lib/floor";
import { meetingOf, useMeetings } from "@/lib/meetings";
import { Face } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { usePlace } from "@/components/app/place";
import { cn } from "@/lib/utils";

/**
 * Everyone in the meeting, and the one place to bring more in: a panel beside
 * the stage, the way Meet's People panel sits. Who's here (you first, with
 * whose mic is off), then who on the floor could be asked in, each a press
 * away. Only someone on the floor can hear an ask, so that's who is offered.
 */
export function MeetingPeople({ meeting, onClose, className }: { meeting: MeetingInfo; onClose: () => void; className?: string }) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const { meetingPeers, micEnabled } = useCall();
  // An office's members, or in the lobby whoever is on its floor.
  const { people: members } = usePlace();
  const floor = useFloor();
  const { meetings } = useMeetings();
  const [asked, setAsked] = useState<Set<string>>(new Set());

  const mic = new Map(meetingPeers.map((peer) => [peer.id, peer.mic]));
  const inside = [...meeting.members].sort((a, b) => Number(b.id === user?.id) - Number(a.id === user?.id) || a.since - b.since);
  const here = new Set(floor.map((one) => one.id));
  const present = new Set(meeting.members.map((member) => member.id));
  const askable = members.filter((member) => member.id !== user?.id && here.has(member.id) && !present.has(member.id));

  const ask = (id: string) => {
    callManager.inviteToMeeting([id]);
    setAsked((current) => new Set(current).add(id));
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]",
        className,
      )}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 ps-4 pe-2">
        <h2 className="text-[15px] font-semibold text-foreground">
          {t("inMeeting")} <span className="font-normal tabular-nums text-muted-foreground">{meeting.members.length}</span>
        </h2>
        <IconButton label={tc("close")} size="sm" icon={<X />} onClick={onClose} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <ul>
          {inside.map((member) => {
            const me = member.id === user?.id;
            const muted = me ? !micEnabled : mic.get(member.id) === false;
            return (
              <li key={member.id} className="flex h-12 items-center gap-3 rounded-xl px-2">
                <Face seed={member.id} size={32} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">
                  {member.name}
                  {me && <span className="font-normal text-muted-foreground"> · {t("you")}</span>}
                </span>
                {muted && <MicOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
              </li>
            );
          })}
        </ul>

        <h3 className="mt-3 border-t border-border px-2 pb-1 pt-4 text-[12.5px] font-medium text-muted-foreground">{t("inviteTitle")}</h3>
        {askable.length ? (
          <ul>
            {askable.map((person) => {
              const done = asked.has(person.id);
              const busy = meetingOf(person.id, meetings);
              return (
                <li key={person.id} className="flex h-12 items-center gap-3 rounded-xl px-2">
                  <Face seed={person.id} size={32} presence="available" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-medium text-foreground">{person.displayName}</span>
                    {busy && <span className="block truncate text-[12px] text-muted-foreground">{t("inAnotherMeeting")}</span>}
                  </span>
                  <button
                    type="button"
                    disabled={done}
                    onClick={() => ask(person.id)}
                    className={cn(
                      "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors disabled:cursor-default",
                      done ? "text-muted-foreground" : "bg-foreground text-background hover:bg-foreground/85",
                    )}
                  >
                    {done && <Check className="size-3.5" />}
                    {done ? t("asked") : t("ask", { count: 0 })}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-2 py-2 text-[13px] leading-relaxed text-muted-foreground">{t("nobodyToAsk")}</p>
        )}
      </div>
    </aside>
  );
}
