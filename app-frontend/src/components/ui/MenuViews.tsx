"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "@/components/ui/icons";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/**
 * The choices under a menu row, opened in place: the menu grows to make room
 * and they sit inset beneath the row, so they read as its options rather than
 * a new menu. Only one is open at a time; only height and opacity animate.
 */
export function MenuExpand({ open, children }: { open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="options"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { height: { duration: 0.26, ease: EASE_OUT }, opacity: { duration: 0.18 } }}
          className="overflow-hidden"
        >
          <div className="mx-1 mb-1 mt-0.5 rounded-[12px] bg-foreground/[0.045] p-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A row that opens its choices beneath it: what it is now, and a chevron that
 * turns up while they're open.
 */
export function MenuRow({
  icon,
  children,
  hint,
  onClick,
  open = false,
  action,
  label,
}: {
  icon: ReactNode;
  children: ReactNode;
  /** Something quiet before the chevron. */
  hint?: ReactNode;
  onClick?: () => void;
  open?: boolean;
  /** A small control of its own on the right (play, clear), pressed without opening the choices. */
  action?: ReactNode;
  label?: string;
}) {
  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={onClick ? open : undefined}
        aria-label={label}
        disabled={!onClick}
        className={cn(
          "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-start text-[13px] text-foreground outline-none transition-colors",
          onClick && "cursor-pointer hover:bg-muted focus-visible:bg-muted",
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 flex-1">{children}</span>
        {hint && <span className="shrink-0 text-[12px] text-faint">{hint}</span>}
        {/* Room for the row's own control, which sits over the button. */}
        {action && <span aria-hidden className="w-7 shrink-0" />}
        {onClick && (
          <ChevronDown
            className={cn("size-3.5 shrink-0 text-faint transition-transform duration-200", open && "rotate-180 text-muted-foreground")}
          />
        )}
      </button>
      {action && <span className="absolute end-7 top-1/2 -translate-y-1/2">{action}</span>}
    </div>
  );
}
