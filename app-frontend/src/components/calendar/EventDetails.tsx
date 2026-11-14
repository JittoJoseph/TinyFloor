"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, X } from "web-shared/components/ui/icons";
import { MAIN_MEETING } from "shared-protocol/messages";
import type { CalendarEvent } from "web-shared/lib/api";
import { callManager } from "@/lib/CallManager";
import { placeOf } from "@/lib/calendar";

/** How far an event's card keeps from the screen's edges. */
const EDGE = 12;

/**
 * One of your meetings, opened: when, where it happens online and the way in
 * (ours joins the office's meeting, anything else opens), whether it's
 * private, and the event in Google Calendar. A small card beside where it was
 * pressed, kept on screen; Escape or a press outside closes it.
 */
export function EventDetails({ event, at, now, onClose }: { event: CalendarEvent; at: { x: number; y: number }; now: number; onClose: () => void }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const card = box.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    setPlace({
      left: Math.max(EDGE, Math.min(at.x + 8, innerWidth - width - EDGE)),
      top: Math.max(EDGE, Math.min(at.y + 8, innerHeight - height - EDGE)),
    });
  }, [at]);

  useEffect(() => {
    const away = (pointer: PointerEvent) => !box.current?.contains(pointer.target as Node) && onClose();
    const key = (keyboard: KeyboardEvent) => keyboard.key === "Escape" && onClose();
    // On the next turn, so the press that opened it doesn't close it.
    const timer = setTimeout(() => addEventListener("pointerdown", away));
    addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", key);
    };
  }, [onClose]);

  const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const where = event.link ? placeOf(event.link) : null;
  const over = event.end <= now;

  return (
    <div
      ref={box}
      role="dialog"
      aria-label={event.title || t("untitled")}
      className="fixed z-[80] w-[19rem] rounded-2xl border border-border bg-popover p-4 shadow-float"
      style={place ?? { left: at.x, top: at.y, visibility: "hidden" }}
    >
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{event.title || t("untitled")}</h3>
        <button type="button" aria-label={t("close")} onClick={onClose} className="-me-1.5 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {day.format(event.start)}
        {!event.allDay && (
          <>
            <br />
            <span className="tabular-nums text-foreground">
              {time.format(event.start)} – {time.format(event.end)}
            </span>
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
        {event.kind !== "event" && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t(`kind.${event.kind}`)}</span>}
        {!event.busy && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t("markedFree")}</span>}
        {event.private && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t("privateNote")}</span>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {where && !over &&
          (where === "tinyfloor" ? (
            <button
              type="button"
              onClick={() => {
                callManager.joinMeeting(MAIN_MEETING);
                onClose();
              }}
              className="h-9 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {t("joinHere")}
            </button>
          ) : (
            <a
              href={event.link!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {t(`joinOn.${where}`)}
              <ExternalLink className="size-3.5" />
            </a>
          ))}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("inGoogle")}
          </a>
        )}
      </div>
    </div>
  );
}
