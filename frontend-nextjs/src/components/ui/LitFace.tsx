"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Face } from "./Face";

/**
 * A face (or an office's mark) large, lit softly in its own colour on the
 * ground behind it. It springs a little when its seed changes, so a mark
 * coloured by a name answers the typing. `phone` is its size on a phone.
 */
export function LitFace({
  seed,
  size = 80,
  phone = size,
  square,
  className,
}: {
  seed: string;
  size?: number;
  phone?: number;
  square?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // Drawn at its full size and scaled down on a phone, so one face serves both.
  const scale = phone / size;
  return (
    <div
      aria-hidden
      className={cn("relative shrink-0 [height:var(--lit-phone)] [width:var(--lit-phone)] sm:[height:var(--lit)] sm:[width:var(--lit)]", className)}
      style={{ "--lit": `${size}px`, "--lit-phone": `${phone}px`, "--lit-scale": scale } as React.CSSProperties}
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [scale:var(--lit-scale)] sm:[scale:1]">
        <span className="pointer-events-none absolute inset-0 scale-150 opacity-40 blur-3xl dark:opacity-30">
          <Face seed={seed} size={size} square={square} />
        </span>
        <motion.span
          key={seed}
          initial={reduce ? false : { scale: 0.88, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
          className="relative flex"
        >
          <Face seed={seed} size={size} square={square} />
        </motion.span>
      </div>
    </div>
  );
}
