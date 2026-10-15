"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "@/components/ui/icons";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/**
 * A one-line pill whose icon and label trade places with a check and a short
 * "done" once it has done its job: the floor's Invite, and Copy beside an
 * invite link. The icon sits in its own dot, which turns green.
 */
export function DoneChip({
  done,
  icon,
  label,
  doneLabel,
  onClick,
  disabled,
  className,
  labelClassName,
}: {
  done: boolean;
  icon: ReactNode;
  label: string;
  doneLabel: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** Where the label shows: the floor hides it on phones. */
  labelClassName?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      layout={!reduce}
      whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      className={cn(
        "flex h-10 shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-border bg-card ps-1.5 pe-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50",
        className,
      )}
    >
      <motion.span
        layout={!reduce ? "position" : false}
        className={cn(
          "flex size-7 items-center justify-center rounded-full transition-colors duration-200",
          done ? "bg-ok text-white" : "bg-foreground text-background",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={done ? "done" : "ready"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="flex [&_svg]:size-3.5"
          >
            {done ? <Check strokeWidth={2.75} /> : icon}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={done ? "done" : "ready"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className={cn("whitespace-nowrap", labelClassName)}
        >
          {done ? doneLabel : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
