"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Kbd } from "@/components/ui/IconButton";
import { usePlace } from "@/components/app/place";
import { useAuth } from "@/contexts/AuthContext";
import { doAction, useActionHint } from "@/lib/actions";
import { clearClaimed, setCanClaim, useDesks } from "@/lib/desks";
import { EASE_OUT } from "@/lib/ease";
import { touchFirst } from "@/lib/touch";

/** How long a claim is remembered as just made, for the desk's "Claimed" (DeskPlate). */
const CLAIMED_MS = 2200;

/**
 * The one prompt above the dock (docs/product.md): what you can do where you
 * stand (sit, stand, open the whiteboard), until you've done it once. Desks
 * are claimed on the desks themselves (DeskPlate), never down here; this only
 * tells the floor whether you can claim one in this place.
 */
export function FloorPrompt() {
  const t = useTranslations("actions");
  const reduce = useReducedMotion();
  const action = useActionHint();
  const place = usePlace();
  const { user } = useAuth();
  const { claimed } = useDesks();

  // A desk is a member's, in an office: not a guest's, and not in the lobby.
  const canClaim = place.kind === "office" && place.role !== "guest" && !!user;
  useEffect(() => {
    setCanClaim(canClaim);
    return () => {
      setCanClaim(false);
    };
  }, [canClaim]);
  // Said once, briefly: the claim is forgotten after the desk has said it.
  useEffect(() => {
    if (claimed === null) return;
    const timer = setTimeout(clearClaimed, CLAIMED_MS);
    return () => clearTimeout(timer);
  }, [claimed]);

  return (
    <AnimatePresence mode="wait">
      {action && (
        <motion.button
          key={action}
          type="button"
          onClick={doAction}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="pointer-events-auto flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-card/95 ps-2 pe-3.5 text-[13px] font-medium text-foreground shadow-float backdrop-blur-md hover:bg-card"
        >
          {!touchFirst() && <Kbd>E</Kbd>}
          {t(action)}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
