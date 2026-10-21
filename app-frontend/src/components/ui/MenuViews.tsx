"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "@/components/ui/icons";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/**
 * A menu that changes what it shows in place, instead of opening a dropdown
 * inside it: the rows that aren't needed fade out, the menu grows or shrinks
 * to what replaces them, and the row that was pressed heads the new view with
 * its chevron turned up, the way back. Only height, opacity and a few pixels
 * of movement animate.
 */
export function MenuViews({ view, children }: { view: string; children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  // Into a view comes from below, back out of one from above.
  const deeper = view !== "main";

  useLayoutEffect(() => {
    const element = inner.current;
    if (!element) return;
    const measure = () => setHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduce ? { duration: 0 } : { duration: 0.26, ease: EASE_OUT }}
      className="relative overflow-hidden"
    >
      <div ref={inner} className="flex flex-col">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={view}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: deeper ? 8 : -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT, delay: 0.04 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * A row that opens a view: what it is now, and a chevron. At the head of its
 * own view the chevron turns up, and pressing it goes back.
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
  /** At the head of its view. */
  open?: boolean;
  /** A small control of its own on the right (play, clear), pressed without opening the view. */
  action?: ReactNode;
  label?: string;
}) {
  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-label={label}
        disabled={!onClick}
        className={cn(
          "flex min-h-9 w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-start text-[13px] text-foreground outline-none transition-colors",
          onClick && "cursor-pointer hover:bg-muted focus-visible:bg-muted",
          open && "font-medium",
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
