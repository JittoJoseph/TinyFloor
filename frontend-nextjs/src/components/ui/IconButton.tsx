"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { Tooltip } from "@/components/motion/tooltip";
import { SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type IconTone = "ghost" | "soft" | "solid" | "danger" | "off";

const TONES: Record<IconTone, string> = {
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
  soft: "bg-muted text-foreground hover:bg-foreground/[0.08]",
  solid: "bg-foreground text-background hover:bg-foreground/90",
  danger: "bg-destructive text-white hover:bg-destructive/90",
  // Something you turned off (a microphone): it should read as off at a glance.
  off: "bg-muted text-destructive hover:bg-destructive/10",
};

const SIZES = { sm: "size-8 rounded-full", md: "size-10 rounded-full", lg: "size-11 rounded-full" };

/** An icon you press, with its name in a tooltip rather than on the screen. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    icon: ReactNode;
    tone?: IconTone;
    size?: keyof typeof SIZES;
    /** A badge or dot in the corner. */
    mark?: ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    /** Leave the tooltip out, when the button sits in something that has its own. */
    bare?: boolean;
  } & Omit<HTMLMotionProps<"button">, "children">
>(function IconButton({ label, icon, tone = "ghost", size = "md", mark, side = "top", bare, className, ...rest }, ref) {
  const reduce = useReducedMotion();
  const button = (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      whileTap={reduce ? undefined : { scale: 0.9 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:size-[18px]",
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {mark}
    </motion.button>
  );
  return bare ? button : <Tooltip content={label} side={side}>{button}</Tooltip>;
});

/** The unread count on an icon. */
export function Count({ value, className }: { value: number; className?: string }) {
  if (value <= 0) return null;
  return (
    <span
      className={cn(
        "pointer-events-none absolute -end-1 -top-1 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-[18px] text-brand-foreground tabular-nums ring-2 ring-[var(--face-ring,var(--ui-rail))]",
        className,
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

/** A keyboard key, for shortcuts in hints and menus. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-muted px-1 font-sans text-[11px] text-muted-foreground">
      {children}
    </kbd>
  );
}
