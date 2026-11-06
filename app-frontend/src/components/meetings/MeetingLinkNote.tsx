"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "web-shared/components/ui/icons";
import { useCall } from "@/lib/useCall";
import { cn } from "web-shared/lib/utils";

/** Connecting for less than this isn't worth saying: joining is usually quicker. */
const CONNECTING_AFTER_MS = 1500;

/**
 * The meeting's connection, said only while it isn't up: still being made
 * after a moment, or dropped and coming back (the meeting rejoins by itself
 * if it stays down, CallManager.recoverMeeting). Up, nothing shows.
 */
export function MeetingLinkNote({ className }: { className?: string }) {
  const t = useTranslations("room");
  const { meetingLink } = useCall();
  const [slow, setSlow] = useState(false);
  // A new state starts the wait over.
  const [seen, setSeen] = useState(meetingLink);
  if (seen !== meetingLink) {
    setSeen(meetingLink);
    setSlow(false);
  }

  useEffect(() => {
    if (meetingLink !== "connecting") return;
    const timer = setTimeout(() => setSlow(true), CONNECTING_AFTER_MS);
    return () => clearTimeout(timer);
  }, [meetingLink]);

  const shown = meetingLink === "reconnecting" || (meetingLink === "connecting" && slow);
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-foreground shadow-float",
            className,
          )}
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          <span className="whitespace-nowrap">{meetingLink === "reconnecting" ? t("reconnecting") : t("connecting")}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
