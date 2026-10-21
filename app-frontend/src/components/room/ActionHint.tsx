"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Kbd } from "@/components/ui/IconButton";
import { doAction, useActionHint } from "@/lib/actions";
import { touchFirst } from "@/lib/touch";
import { enter } from "./Desks";

/**
 * What you can do where you stand (sit, stand, open the whiteboard), said
 * once: shown until you've done it, then never again in this browser. The
 * key is there for a keyboard, and the pill is a button for a finger.
 */
export function ActionHint() {
  const t = useTranslations("actions");
  const reduce = useReducedMotion();
  const action = useActionHint();
  return (
    <AnimatePresence mode="wait">
      {action && (
        <motion.button
          key={action}
          type="button"
          onClick={doAction}
          {...enter(reduce)}
          className="pointer-events-auto flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-card/95 ps-2 pe-3.5 text-[13px] font-medium text-foreground shadow-float backdrop-blur-md transition-colors hover:bg-card"
        >
          {!touchFirst() && <Kbd>E</Kbd>}
          {t(action)}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
