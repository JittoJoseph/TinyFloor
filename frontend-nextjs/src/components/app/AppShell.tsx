"use client";

import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link } from "@/lib/i18n/navigation";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/motion/tooltip";

/**
 * Whether the view on screen has a presence dock with you in it. When it does,
 * the rail leaves you out, so your own face is never shown twice side by side.
 */
const DockContext = createContext<((shown: boolean) => void) | null>(null);

/** Called by the presence dock: while it is mounted, it holds you. */
export function useDockHoldsYou() {
  const report = useContext(DockContext);
  useEffect(() => {
    if (!report) return;
    report(true);
    return () => report(false);
  }, [report]);
}

export interface ShellDestination {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: number;
  /** A small dot instead of a count: something new to look at. */
  dot?: boolean;
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
  settings,
  you,
  floor,
  children,
}: {
  /** The top of the rail: the office (a switcher) or the lobby. */
  mark: ReactNode;
  destinations: ShellDestination[];
  /** Settings sit at the foot of the rail, above you; on a phone they are in your menu. */
  settings?: ShellDestination;
  /** The bottom of the rail: you, and your menu. */
  you: ReactNode;
  floor: ReactNode;
  children?: ReactNode;
}) {
  const indicator = useId();
  const reduce = useReducedMotion();
  const [docks, setDocks] = useState(0);
  const report = useCallback((shown: boolean) => setDocks((count) => count + (shown ? 1 : -1)), []);
  return (
    <DockContext.Provider value={report}>
      <div className="fixed inset-0 flex flex-col bg-rail text-foreground md:flex-row [--face-ring:var(--ui-rail)]">
        <nav className="relative hidden w-[72px] shrink-0 flex-col items-center py-3 md:flex">
          <div className="mb-2">{mark}</div>
          <span aria-hidden className="mb-2 h-px w-8 bg-border" />
          <div className="flex w-full flex-col items-center gap-1.5">
            {destinations.map((one) => (
              <RailItem key={one.key} destination={one} indicator={indicator} />
            ))}
          </div>
          <div className="mt-auto flex w-full flex-col items-center gap-2">
            {settings && <RailItem destination={settings} indicator={indicator} quiet />}
            <AnimatePresence initial={false}>
              {docks === 0 && (
                <motion.div
                  key="you"
                  initial={reduce ? false : { opacity: 0, scale: 0.6, height: 0 }}
                  animate={{ opacity: 1, scale: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, height: 0 }}
                  transition={SPRING_LAYOUT}
                  className="pt-1"
                >
                  {you}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-card [--face-ring:var(--ui-card)] md:my-2 md:me-2 md:rounded-[18px] md:border md:border-border md:shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          {floor}
          {children}
        </main>

        {/* Phones: the same places along the bottom, where a thumb is. */}
        <nav className="flex shrink-0 items-stretch justify-around border-t border-border bg-rail px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5 md:hidden">
          {destinations.map((one) => (
            <BarItem key={one.key} destination={one} indicator={`${indicator}-bar`} />
          ))}
          <div className="flex min-w-14 flex-1 items-center justify-center">{you}</div>
        </nav>
      </div>
    </DockContext.Provider>
  );
}

function RailItem({
  destination,
  indicator,
  quiet,
}: {
  destination: ShellDestination;
  indicator: string;
  /** Settings: no label under it, since it stands apart at the foot. */
  quiet?: boolean;
}) {
  const reduce = useReducedMotion();
  const { href, label, icon, active, badge, dot } = destination;
  const link = (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative flex w-full cursor-pointer flex-col items-center gap-1 outline-none"
    >
      {/* The bar at the rail's edge that says where you are, gliding between places. */}
      {active && (
        <motion.span
          layoutId={indicator}
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute start-0 top-1.5 h-7 w-[3px] rounded-e-full bg-foreground"
        />
      )}
      <span
        className={cn(
          "relative flex size-10 items-center justify-center rounded-[12px] transition-[background-color,color,transform] duration-150 group-active:scale-95",
          "group-focus-visible:ring-2 group-focus-visible:ring-ring",
          active
            ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--ui-border)] dark:bg-muted"
            : "text-muted-foreground group-hover:bg-foreground/[0.06] group-hover:text-foreground",
        )}
      >
        <Icon icon={icon} active={active} />
        {!!badge && (
          <span className="absolute -end-1.5 -top-1.5 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-[18px] text-brand-foreground tabular-nums ring-2 ring-rail">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {dot && !badge && <span className="absolute end-1 top-1 size-2 rounded-full bg-brand ring-2 ring-rail" />}
      </span>
      {!quiet && (
        <span
          className={cn(
            "max-w-full truncate px-1 text-[10.5px] leading-none tracking-tight transition-colors",
            active ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {label}
        </span>
      )}
    </Link>
  );
  return quiet ? (
    <Tooltip content={label} side="right" wrapperClassName="w-full">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function BarItem({ destination, indicator }: { destination: ShellDestination; indicator: string }) {
  const reduce = useReducedMotion();
  const { href, label, icon, active, badge, dot } = destination;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group flex min-w-14 flex-1 cursor-pointer flex-col items-center gap-1 py-0.5 outline-none"
    >
      <span className="relative flex h-8 w-14 items-center justify-center">
        {active && (
          <motion.span
            layoutId={indicator}
            transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
            className="absolute inset-0 rounded-full bg-foreground/[0.08]"
          />
        )}
        <span className={cn("relative", active ? "text-foreground" : "text-muted-foreground")}>
          <Icon icon={icon} active={active} />
        </span>
        {!!badge && (
          <span className="absolute end-1.5 -top-0.5 min-w-[17px] rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-[17px] text-brand-foreground tabular-nums ring-2 ring-rail">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {dot && !badge && <span className="absolute end-3 top-1 size-2 rounded-full bg-brand ring-2 ring-rail" />}
      </span>
      <span className={cn("text-[11px] leading-none", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </Link>
  );
}

/**
 * A rail icon: outlined, and filled where you are, with a small spring as it
 * fills. Phosphor icons take a weight; anything else is drawn as it is.
 */
function Icon({ icon, active }: { icon: ReactNode; active: boolean }) {
  const reduce = useReducedMotion();
  if (!isValidElement(icon)) return <>{icon}</>;
  const drawn = cloneElement(icon as ReactElement<{ weight?: string; size?: number }>, {
    weight: active ? "fill" : "regular",
    size: 22,
  });
  return (
    <motion.span
      key={active ? "on" : "off"}
      initial={reduce || !active ? false : { scale: 0.78 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 18, mass: 0.6 }}
      className="flex transition-transform duration-200 group-hover:-translate-y-px group-active:translate-y-0"
    >
      {drawn}
    </motion.span>
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
