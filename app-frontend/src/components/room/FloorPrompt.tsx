"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { isDesk } from "@shared/map";
import { Check, Desk, X } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/IconButton";
import { usePlace } from "@/components/app/place";
import { useAuth } from "@/contexts/AuthContext";
import { doAction, useActionHint } from "@/lib/actions";
import { claimDesk, deskAt, deskOf, useDesks } from "@/lib/desks";
import { EASE_OUT } from "@/lib/ease";
import { touchFirst } from "@/lib/touch";

/** How long "Your desk" stays once you've made it yours. */
const CLAIMED_MS = 2200;

const PILL =
  "pointer-events-auto flex h-10 items-center rounded-full border border-border bg-card/95 text-[13px] font-medium text-foreground shadow-float backdrop-blur-md";

/**
 * The one prompt above the dock (docs/product.md), so the floor never stacks
 * them: sitting at a free desk offers it, one press making it yours (or
 * moving yours here), and the desk then shows your face when you're away;
 * otherwise what you can do where you stand (sit, stand, open the
 * whiteboard), until you've done it once.
 */
export function FloorPrompt() {
  const t = useTranslations("actions");
  const td = useTranslations("desk");
  const reduce = useReducedMotion();
  const action = useActionHint();
  const place = usePlace();
  const { user } = useAuth();
  const { desks, seat } = useDesks();
  const [notNow, setNotNow] = useState<number | null>(null);
  const [claimed, setClaimed] = useState<number | null>(null);
  // Said once, briefly, however you move meanwhile: it never comes back on sitting down again.
  useEffect(() => {
    if (claimed === null) return;
    const timer = setTimeout(() => setClaimed(null), CLAIMED_MS);
    return () => clearTimeout(timer);
  }, [claimed]);

  // A desk is a member's, in an office: not a guest's, and not in the lobby.
  const me = place.kind === "office" && place.role !== "guest" && user ? user.id : null;
  const mine = me ? deskOf(desks, me) : undefined;
  const freeDesk = seat !== null && isDesk(seat) && !deskAt(desks, seat);
  const offer = !!me && freeDesk && notNow !== seat && claimed === null ? seat : null;
  const done = claimed !== null && seat === claimed && mine?.seat === claimed;
  const key = done ? "claimed" : offer !== null ? `desk-${offer}` : (action ?? null);

  const motionProps = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 },
    transition: { duration: 0.2, ease: EASE_OUT },
  };

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div key="claimed" role="status" {...motionProps} className={`${PILL} gap-2 ps-3.5 pe-4`}>
          <Check className="size-4 text-ok" />
          {td("yours")}
        </motion.div>
      ) : offer !== null ? (
        <motion.div key={key} {...motionProps} className={`${PILL} p-1`}>
          <button
            type="button"
            onClick={() => {
              setClaimed(offer);
              claimDesk(offer);
            }}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-full ps-2.5 pe-3 transition-colors hover:bg-foreground/[0.06]"
          >
            <Desk className="size-4 text-brand" />
            {mine ? td("move") : td("claim")}
          </button>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            aria-label={td("notNow")}
            title={td("notNow")}
            onClick={() => setNotNow(offer)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </motion.div>
      ) : action ? (
        <motion.button key={key} type="button" onClick={doAction} {...motionProps} className={`${PILL} cursor-pointer gap-2 ps-2 pe-3.5 hover:bg-card`}>
          {!touchFirst() && <Kbd>E</Kbd>}
          {t(action)}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
