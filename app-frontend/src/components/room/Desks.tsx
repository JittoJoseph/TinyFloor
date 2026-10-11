"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { isDesk } from "@shared/map";
import { Check, Desk, X } from "@/components/ui/icons";
import { usePlace } from "@/components/app/place";
import { useAuth } from "@/contexts/AuthContext";
import { claimDesk, deskAt, deskOf, useDesks } from "@/lib/desks";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/** Who can have a desk: a member of an office, not a guest, not in the lobby. */
function useCanHaveDesk(): string | null {
  const place = usePlace();
  const { user } = useAuth();
  return place.kind === "office" && place.role !== "guest" && user ? user.id : null;
}

const enter = (reduce: boolean | null) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.22, ease: EASE_OUT },
});

/**
 * Sitting down at a free desk offers it (docs/26): the moment someone has
 * already chosen a spot is the moment to make it theirs. One press, and from
 * then on they arrive sitting there. Someone with a desk elsewhere is offered
 * the move instead. Once it's theirs, it says so, briefly.
 */
export function DeskOffer() {
  const t = useTranslations("desk");
  const reduce = useReducedMotion();
  const me = useCanHaveDesk();
  const { desks, seat } = useDesks();
  const [notNow, setNotNow] = useState<number | null>(null);
  const [asked, setAsked] = useState<number | null>(null);

  const mine = me ? deskOf(desks, me) : undefined;
  const free = seat !== null && isDesk(seat) && !deskAt(desks, seat);
  const offering = !!me && free && notNow !== seat && asked !== seat;
  const done = asked !== null && mine?.seat === asked && seat === asked;

  // The confirmation says it once, then the desk speaks for itself.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setAsked(null), 2600);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-3 sm:bottom-24">
      <AnimatePresence mode="wait">
        {offering && seat !== null ? (
          <motion.div
            key="offer"
            {...enter(reduce)}
            role="dialog"
            aria-label={mine ? t("moveTitle") : t("claimTitle")}
            className="pointer-events-auto flex w-full max-w-[25rem] items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 ps-3.5 shadow-float backdrop-blur-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <Desk className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold leading-tight text-foreground">
                {mine ? t("moveTitle") : t("claimTitle")}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{mine ? t("moveBody") : t("claimBody")}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setAsked(seat);
                  claimDesk(seat);
                }}
                className="h-9 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/85"
              >
                {mine ? t("move") : t("claim")}
              </button>
              <button
                type="button"
                aria-label={t("notNow")}
                title={t("notNow")}
                onClick={() => setNotNow(seat)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </span>
          </motion.div>
        ) : done ? (
          <motion.div
            key="done"
            {...enter(reduce)}
            role="status"
            className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3.5 py-2 text-[13px] font-medium text-foreground shadow-float backdrop-blur-md"
          >
            <Check className="size-4 text-ok" />
            {t("claimed")}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const HINT_KEY = (office: string) => `tinyfloor:desk-hint:${office}`;
const subscribeNothing = () => () => {};

/**
 * Someone in an office without a desk yet is told, once, that they can have
 * one (docs/26): a short line, not a tour, gone while they sit and once they
 * have a desk, and never again in that office once closed.
 */
export function DeskHint() {
  const t = useTranslations("desk");
  const reduce = useReducedMotion();
  const place = usePlace();
  const me = useCanHaveDesk();
  const { desks, seat, ready } = useDesks();
  const seen = useSyncExternalStore(
    subscribeNothing,
    () => {
      try {
        return localStorage.getItem(HINT_KEY(place.id)) === "1";
      } catch {
        return true;
      }
    },
    () => true,
  );
  const [closed, setClosed] = useState(false);
  const hasDesk = !!me && !!deskOf(desks, me);

  const dismiss = () => {
    setClosed(true);
    try {
      localStorage.setItem(HINT_KEY(place.id), "1");
    } catch {}
  };

  const show = !!me && ready && !seen && !closed && !hasDesk && seat === null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-3 sm:top-[4.5rem]">
      <AnimatePresence>
        {show && (
          <motion.div
            {...enter(reduce)}
            role="status"
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-full border border-border bg-card/95 py-1.5 ps-3 pe-1.5 text-[12.5px] text-muted-foreground shadow-float backdrop-blur-md",
            )}
          >
            <Desk className="size-4 shrink-0 text-foreground" />
            <span>{t("hint")}</span>
            <button
              type="button"
              aria-label={t("notNow")}
              onClick={dismiss}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
