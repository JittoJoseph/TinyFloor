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
import { cancelClaim, clearClaimed, confirmClaim, deskAt, deskOf, requestClaim, setCanClaim, useDesks } from "@/lib/desks";
import { EASE_OUT } from "@/lib/ease";
import { touchFirst } from "@/lib/touch";

/** How long "Your desk" stays once you've claimed it. */
const CLAIMED_MS = 2200;

const PILL =
  "pointer-events-auto flex min-h-10 items-center rounded-full border border-border bg-card/95 text-[13px] font-medium text-foreground shadow-float backdrop-blur-md";
const BUTTON = "flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full transition-colors hover:bg-foreground/[0.06]";

/**
 * The one prompt above the dock (docs/product.md), so the floor never stacks
 * them. Sitting at a free desk offers to claim it; the desk itself offers the
 * same as you walk up (DeskPlate). Claiming one while you have another asks
 * first, here, since yours is given up. Once it's yours, it says so, briefly.
 * Otherwise what you can do where you stand (sit, stand, open the
 * whiteboard), until you've done it once.
 */
export function FloorPrompt() {
  const t = useTranslations("actions");
  const td = useTranslations("desk");
  const reduce = useReducedMotion();
  const action = useActionHint();
  const place = usePlace();
  const { user } = useAuth();
  const { desks, seat, asking, claimed } = useDesks();
  const [notNow, setNotNow] = useState<number | null>(null);

  // A desk is a member's, in an office: not a guest's, and not in the lobby.
  const me = place.kind === "office" && place.role !== "guest" && user ? user.id : null;
  useEffect(() => {
    setCanClaim(!!me);
    return () => {
      setCanClaim(false);
    };
  }, [me]);
  // Said once, briefly, however you move meanwhile: it never comes back on sitting down again.
  useEffect(() => {
    if (claimed === null) return;
    const timer = setTimeout(clearClaimed, CLAIMED_MS);
    return () => clearTimeout(timer);
  }, [claimed]);

  const mine = me ? deskOf(desks, me) : undefined;
  const freeDesk = seat !== null && isDesk(seat) && !deskAt(desks, seat);
  const offer = !!me && freeDesk && notNow !== seat && claimed === null ? seat : null;
  const done = claimed !== null && mine?.seat === claimed;
  const key = asking !== null && asking === seat ? `ask-${asking}` : done ? "claimed" : offer !== null ? `desk-${offer}` : (action ?? null);

  const motionProps = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 },
    transition: { duration: 0.2, ease: EASE_OUT },
  };
  const dismiss = (label: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      <X className="size-3.5" />
    </button>
  );

  return (
    <AnimatePresence mode="wait">
      {/* Asked from the desk itself, the desk answers; sitting at it, here. */}
      {asking !== null && asking === seat && me ? (
        <motion.div key={key} role="alertdialog" aria-label={td("claimAsk")} {...motionProps} className={`${PILL} max-w-[min(30rem,calc(100vw-1.5rem))] gap-1 py-1 ps-4 pe-1`}>
          <span className="min-w-0 flex-1 text-[12.5px] leading-snug">{td("claimAsk")}</span>
          <button
            type="button"
            onClick={() => confirmClaim(asking)}
            className="flex h-8 shrink-0 cursor-pointer items-center rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/85"
          >
            {td("claimConfirm")}
          </button>
          {dismiss(td("keepMine"), cancelClaim)}
        </motion.div>
      ) : done ? (
        <motion.div key="claimed" role="status" {...motionProps} className={`${PILL} gap-2 ps-3.5 pe-4`}>
          <Check className="size-4 text-ok" />
          {td("yours")}
        </motion.div>
      ) : offer !== null ? (
        <motion.div key={key} {...motionProps} className={`${PILL} p-1`}>
          <button type="button" onClick={() => me && requestClaim(offer, me)} className={`${BUTTON} ps-2.5 pe-3`}>
            <Desk className="size-4 text-muted-foreground" />
            {td("claim")}
          </button>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
          {dismiss(td("notNow"), () => setNotNow(offer))}
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
