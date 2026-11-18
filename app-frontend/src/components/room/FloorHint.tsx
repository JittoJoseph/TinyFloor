"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Kbd } from "@/components/ui/IconButton";
import { doAction, useActionHint } from "@/lib/actions";
import { useDecorate } from "@/lib/decorate";
import { EASE_OUT } from "@/lib/ease";
import { touchFirst } from "@/lib/touch";

/**
 * What you can do where you stand (sit, stand up, open the whiteboard), at the
 * top right of the floor whenever something is at hand: its key and a word or
 * two, gone as you walk away. A press does it too, which is how a finger does.
 */
export function FloorHint() {
  const t = useTranslations("actions");
  const reduce = useReducedMotion();
  const action = useActionHint();
  // Decorating a desk, the floor is the desk's: nothing to do here meanwhile.
  const { desk: decorating } = useDecorate();
  const shown = action && !decorating ? action : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {shown && (
        <motion.button
          key={shown}
          type="button"
          onClick={doAction}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 6 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          className="pointer-events-auto flex h-8 cursor-pointer items-center gap-2 rounded-full border border-border bg-card/92 pe-3 ps-1.5 text-[12.5px] font-medium text-foreground shadow-float backdrop-blur-md transition-colors hover:bg-card"
        >
          {touchFirst() ? <span className="w-0.5" /> : <Kbd>E</Kbd>}
          {t(shown)}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
