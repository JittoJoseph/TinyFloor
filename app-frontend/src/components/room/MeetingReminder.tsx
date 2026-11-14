"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Calendar, ExternalLink } from "web-shared/components/ui/icons";
import { MAIN_MEETING } from "shared-protocol/messages";
import { Button } from "@/components/motion/button/base";
import { callManager } from "@/lib/CallManager";
import { isOurs, useCalendar } from "@/lib/calendar";
import { EASE_OUT } from "@/lib/ease";
import { useCall } from "@/lib/useCall";

/** From a minute before a meeting starts until a few minutes into it, it's offered. */
const BEFORE_MS = 60_000;
const INTO_MS = 5 * 60_000;

/**
 * A meeting on your calendar about to start, over the dock: its name, and the
 * way in (ours joins the office's meeting; a Meet or Zoom link opens it), or
 * "Not now". Only for meetings that are somewhere online, and not while
 * you're already in one of ours.
 */
export function MeetingReminder({ onShown }: { onShown: (shown: boolean) => void }) {
  const t = useTranslations("meetings.reminder");
  const reduce = useReducedMotion();
  const { status, events } = useCalendar();
  const { meeting } = useCall();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  const due =
    status === "on" && !meeting
      ? events.find((event) => event.link && !event.allDay && !dismissed.includes(event.id) && event.start - BEFORE_MS <= now && now < event.start + INTO_MS)
      : undefined;
  const shown = !!due;
  useEffect(() => onShown(shown), [shown, onShown]);
  const dismiss = (id: string) => setDismissed((was) => [...was, id]);

  return (
    <AnimatePresence>
      {due && (
        <motion.div
          key={due.id}
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="pointer-events-auto flex max-w-[min(30rem,calc(100vw-1.5rem))] items-center gap-3 rounded-2xl border border-border bg-card/95 py-2 pe-2 ps-3 shadow-float backdrop-blur-md"
        >
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{due.title || t("untitled")}</p>
            <p className="text-[12px] text-muted-foreground">{due.start > now ? t("soon") : t("started")}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-[12.5px]" onClick={() => dismiss(due.id)}>
            {t("notNow")}
          </Button>
          {isOurs(due.link!) ? (
            <Button
              size="sm"
              className="h-8 px-3.5 text-[12.5px]"
              onClick={() => {
                dismiss(due.id);
                callManager.joinMeeting(MAIN_MEETING);
              }}
            >
              {t("join")}
            </Button>
          ) : (
            <a
              href={due.link!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dismiss(due.id)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {t("open")}
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
