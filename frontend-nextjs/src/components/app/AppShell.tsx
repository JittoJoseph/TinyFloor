"use client";

import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "@/lib/i18n/navigation";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Count } from "@/components/ui/IconButton";

export interface ShellDestination {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: number;
}

/**
 * The frame every place in the app sits in — an office or the public lobby
 * (docs/06-app-design.md). A rail that never moves, and one panel filling the
 * rest: the floor, with whichever view you opened laid over it. The floor is
 * never unmounted, so your socket, call and position survive reading a message.
 */
export function AppShell({
  mark,
  destinations,
  you,
  floor,
  children,
}: {
  /** The top of the rail: the office (a switcher) or the lobby. */
  mark: ReactNode;
  destinations: ShellDestination[];
  /** The bottom of the rail: you, and your menu. */
  you: ReactNode;
  floor: ReactNode;
  children?: ReactNode;
}) {
  const pill = useId();
  return (
    <div className="fixed inset-0 flex flex-col bg-rail text-foreground md:flex-row [--face-ring:var(--ui-rail)]">
      <nav className="hidden w-[76px] shrink-0 flex-col items-center gap-1 py-3 md:flex">
        <div className="mb-3">{mark}</div>
        {destinations.map((one) => (
          <RailLink key={one.key} destination={one} pill={pill} />
        ))}
        <div className="mt-auto flex flex-col items-center gap-2 pb-1">{you}</div>
      </nav>

      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-card [--face-ring:var(--ui-card)] md:my-2 md:me-2 md:rounded-[18px] md:border md:border-border">
        {floor}
        {children}
      </main>

      {/* Phones: the same places along the bottom, where a thumb is. */}
      <nav className="flex shrink-0 items-stretch justify-around border-t border-border px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 md:hidden">
        {destinations.map((one) => (
          <RailLink key={one.key} destination={one} pill={`${pill}-bar`} compact />
        ))}
        <div className="flex min-w-16 items-center justify-center">{you}</div>
      </nav>
    </div>
  );
}

function RailLink({ destination, pill, compact }: { destination: ShellDestination; pill: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  const { href, label, icon, active, badge } = destination;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex cursor-pointer flex-col items-center gap-1 rounded-xl outline-none",
        compact ? "min-w-16 py-1" : "w-full px-2 py-0.5",
        "focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-ring/60",
      )}
    >
      <span
        className={cn(
          "relative flex h-9 w-11 items-center justify-center rounded-xl transition-colors [&_svg]:size-[19px]",
          active ? "text-foreground" : "text-muted-foreground group-hover:bg-foreground/[0.05] group-hover:text-foreground",
        )}
      >
        {active && (
          <motion.span
            layoutId={pill}
            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
            className="absolute inset-0 rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:bg-muted"
          />
        )}
        <span className="relative">{icon}</span>
        {!!badge && <Count value={badge} />}
      </span>
      <span
        className={cn(
          "text-[11px] leading-none tracking-tight transition-colors",
          active ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * A view laid over the floor: its own column on the left, what you picked on
 * the right. On a phone there is room for one: the column, or the detail with
 * a way back.
 */
export function ShellView({
  column,
  children,
  showDetail = false,
  columnClassName,
}: {
  column: ReactNode;
  children: ReactNode;
  showDetail?: boolean;
  columnClassName?: string;
}) {
  return (
    <div className="absolute inset-0 z-[60] flex bg-card">
      <aside
        className={cn(
          "w-full shrink-0 flex-col border-border bg-background md:w-[280px] md:border-e [--face-ring:var(--ui-background)]",
          showDetail ? "hidden md:flex" : "flex",
          columnClassName,
        )}
      >
        {column}
      </aside>
      <section className={cn("min-w-0 flex-1 flex-col", showDetail ? "flex" : "hidden md:flex")}>{children}</section>
    </div>
  );
}

/** The mark for the lobby and anywhere the product speaks for itself: a floor tile, from above. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-[30%] bg-foreground text-background", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" width={size * 0.5} height={size * 0.5} shapeRendering="crispEdges">
        <rect x="1" y="1" width="6" height="6" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.45" />
        <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.45" />
        <rect x="9" y="9" width="6" height="6" fill="var(--ui-brand)" />
      </svg>
    </span>
  );
}
