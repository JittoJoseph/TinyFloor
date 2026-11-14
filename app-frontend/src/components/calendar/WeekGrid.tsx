"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Video } from "web-shared/components/ui/icons";
import type { BusyBlock, CalendarEvent } from "web-shared/lib/api";
import { cn } from "web-shared/lib/utils";
import { placeOf } from "@/lib/calendar";

const HOUR = 60 * 60_000;
const SLOT = 30 * 60_000;
/** How tall an hour is. */
const HOUR_PX = 48;
/** Anything this long is a day out, shown along the top rather than down the day. */
const ALL_DAY = 20 * HOUR;

/** A teammate's calendar, shown over yours in their colour. */
export type Overlay = { id: string; name: string; color: string; blocks: BusyBlock[] };

type Item = {
  key: string;
  start: number;
  end: number;
  color: string;
  /** What it is (yours), or whose (a teammate's). */
  label: string;
  /** A teammate's: what they're doing then. */
  sub?: string;
  /** Yours: opens its details. */
  event?: CalendarEvent;
  /** A teammate's: whose. */
  who?: string;
  kind: "event" | "out" | "focus";
  call?: boolean;
  free?: boolean;
};

/**
 * The week (or a day, on a phone) as a calendar has it: the days across, the
 * hours down, each meeting where it falls, side by side where they overlap,
 * the day's all-day things along the top, and a red line at now. Yours are in
 * your colour and open their details; the teammates you've ticked show over
 * them in theirs, busy, out or focusing (a title only where they share it).
 * An empty half hour is the way to put a meeting there.
 */
export function WeekGrid({
  days,
  now,
  events,
  color,
  overlays,
  onOpen,
  onSchedule,
}: {
  days: number[];
  now: number;
  events: CalendarEvent[];
  color: string;
  overlays: Overlay[];
  onOpen: (event: CalendarEvent, at: { x: number; y: number }) => void;
  onSchedule: (start: number) => void;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const hourLabel = new Intl.DateTimeFormat(locale, { hour: "numeric" });
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });

  const items: Item[] = [
    ...events.map((event) => ({
      key: `me:${event.id}`,
      start: event.start,
      end: event.end,
      color,
      label: event.title || t("untitled"),
      event,
      kind: event.kind,
      call: !!event.link && placeOf(event.link) !== "tinyfloor",
      free: !event.busy,
    })),
    ...overlays.flatMap((overlay) =>
      overlay.blocks.map((block, index) => ({
        key: `${overlay.id}:${index}`,
        start: block.start,
        end: block.end,
        color: overlay.color,
        label: overlay.name,
        sub: block.kind === "out" ? t("kind.out") : block.title || (block.kind === "focus" ? t("kind.focus") : t("busy")),
        who: overlay.id,
        kind: block.kind,
        call: block.call,
      })),
    ),
  ];
  const isAllDay = (item: Item) => item.event?.allDay || item.end - item.start >= ALL_DAY;

  // Opened, the hours scroll to an hour before now, or to the morning.
  const scroller = useRef<HTMLDivElement>(null);
  const showsToday = days.some((day) => now >= day && now < day + 24 * HOUR);
  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const hour = showsToday ? new Date(now).getHours() + new Date(now).getMinutes() / 60 - 1.5 : 7.5;
    box.scrollTop = Math.max(0, hour * HOUR_PX);
    // Only when the days change, not as the clock moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0], days.length]);

  const allDay = days.map((day) => items.filter((item) => isAllDay(item) && item.start < day + 24 * HOUR && item.end > day));
  const hasAllDay = allDay.some((list) => list.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The days across, and their all-day things. */}
      <div className="flex shrink-0 border-b border-border pe-[var(--scrollbar,0px)]">
        <div className="w-14 shrink-0" />
        {days.map((day, index) => {
          const today = now >= day && now < day + 24 * HOUR;
          return (
            <div key={day} className="min-w-0 flex-1 border-s border-border/70 px-1.5 pb-1.5 pt-2">
              <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
                {weekday.format(day)}
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] font-semibold tabular-nums",
                    today ? "bg-destructive text-white" : "text-foreground",
                  )}
                >
                  {new Date(day).getDate()}
                </span>
              </p>
              {hasAllDay && (
                <div className="mt-1.5 flex min-h-5 flex-col gap-0.5">
                  {allDay[index].slice(0, 3).map((item) => (
                    <Chip key={item.key} item={item} now={now} onOpen={onOpen} />
                  ))}
                  {allDay[index].length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{allDay[index].length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* The hours down, and each day's meetings. */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
          <div className="relative w-14 shrink-0">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <span key={hour} className="absolute end-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: hour * HOUR_PX }}>
                {hourLabel.format(new Date(days[0]).setHours(hour))}
              </span>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn
              key={day}
              day={day}
              now={now}
              items={items.filter((item) => !isAllDay(item) && item.start < day + 24 * HOUR && item.end > day)}
              time={time}
              onOpen={onOpen}
              onSchedule={onSchedule}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  now,
  items,
  time,
  onOpen,
  onSchedule,
}: {
  day: number;
  now: number;
  items: Item[];
  time: Intl.DateTimeFormat;
  onOpen: (event: CalendarEvent, at: { x: number; y: number }) => void;
  onSchedule: (start: number) => void;
}) {
  const t = useTranslations("calendar");
  const [slot, setSlot] = useState<number | null>(null);
  const today = now >= day && now < day + 24 * HOUR;
  const y = (ms: number) => ((Math.min(Math.max(ms, day), day + 24 * HOUR) - day) / HOUR) * HOUR_PX;
  const placed = arrange(items);

  return (
    <div
      className={cn("relative min-w-0 flex-1 border-s border-border/70", today && "bg-foreground/[0.015]")}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const start = day + Math.floor(((event.clientY - box.top) / HOUR_PX) * 2) * SLOT;
        setSlot(start + SLOT > now ? start : null);
      }}
      onPointerLeave={() => setSlot(null)}
    >
      {/* Hours and half hours, faintly. */}
      {Array.from({ length: 24 }, (_, hour) => (
        <span key={hour} aria-hidden>
          <span className="absolute inset-x-0 h-px bg-border/70" style={{ top: hour * HOUR_PX }} />
          <span className="absolute inset-x-0 h-px bg-border/30" style={{ top: hour * HOUR_PX + HOUR_PX / 2 }} />
        </span>
      ))}
      {slot !== null && (
        <button
          type="button"
          onClick={() => onSchedule(slot)}
          title={t("scheduleAt", { time: time.format(slot) })}
          className="absolute inset-x-1 z-[1] flex cursor-pointer items-start rounded-md border border-dashed border-foreground/30 px-1.5 pt-0.5 text-[11px] text-muted-foreground hover:border-foreground/60 hover:text-foreground"
          style={{ top: y(slot) + 1, height: HOUR_PX / 2 - 2 }}
        >
          + {time.format(slot)}
        </button>
      )}
      {placed.map(({ item, left, width }) => {
        const top = y(item.start);
        const height = Math.max(18, y(item.end) - top - 2);
        const tall = height >= 34;
        const roomy = height >= 60;
        const Tag = item.event ? "button" : "div";
        const when = sameDay(item.start, item.end) ? time.formatRange(item.start, item.end) : `${time.format(item.start)} – ${time.format(item.end)}`;
        return (
          <Tag
            key={item.key}
            {...(item.event ? { type: "button" as const, onClick: (click: React.MouseEvent) => onOpen(item.event!, { x: click.clientX, y: click.clientY }) } : {})}
            title={`${item.label}${item.sub ? ` · ${item.sub}` : ""} · ${when}`}
            className={cn(
              "cal-event absolute z-[2] flex flex-col data-[now]:z-[4] overflow-hidden rounded-[6px] pe-1.5 ps-[11px] text-start transition-[background-color]",
              tall ? "pt-1" : "justify-center",
              item.event && "cursor-pointer",
            )}
            {...look(item, now)}
            style={{
              "--c": item.color,
              top: top + 1,
              height,
              left: `calc(${left * 100}% + 1px)`,
              width: `calc(${width * 100}% - 4px)`,
            } as React.CSSProperties}
          >
            <span aria-hidden className={cn("absolute start-[4px] w-[3px] rounded-full", tall ? "inset-y-[4px]" : "inset-y-[3px]")} style={{ background: "var(--bar)" }} />
            {tall ? (
              <>
                <span className={cn("text-[12px] font-medium leading-4", roomy ? "line-clamp-2" : "truncate")}>{item.label}</span>
                <span className="flex min-w-0 items-center gap-1 text-[11px] leading-4 tabular-nums opacity-80">
                  {item.call && <Video className="size-3 shrink-0" />}
                  <span className="truncate">{item.sub ?? when}</span>
                </span>
              </>
            ) : (
              <span className="flex min-w-0 items-baseline gap-1.5 text-[11.5px] leading-4">
                <span className="truncate font-medium">{item.label}</span>
                {width > 0.7 && <span className="shrink-0 text-[11px] tabular-nums opacity-80">{item.sub ?? time.format(item.start)}</span>}
              </span>
            )}
          </Tag>
        );
      })}
      {today && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 z-[3] h-0.5 bg-destructive" style={{ top: y(now) }}>
          <span className="absolute -start-1 -top-[3px] size-2 rounded-full bg-destructive" />
        </span>
      )}
    </div>
  );
}

/** An all-day thing along the top of its day. */
function Chip({ item, now, onOpen }: { item: Item; now: number; onOpen: (event: CalendarEvent, at: { x: number; y: number }) => void }) {
  const Tag = item.event ? "button" : "div";
  const label = item.sub ? `${item.label} · ${item.sub}` : item.label;
  return (
    <Tag
      {...(item.event ? { type: "button" as const, onClick: (click: React.MouseEvent) => onOpen(item.event!, { x: click.clientX, y: click.clientY }) } : {})}
      title={label}
      className={cn("cal-event relative h-5 truncate rounded-[5px] pe-1.5 ps-[11px] text-start text-[11.5px] font-medium leading-5", item.event && "cursor-pointer")}
      {...look(item, now, true)}
      style={{ "--c": item.color } as React.CSSProperties}
    >
      <span aria-hidden className="absolute inset-y-[3px] start-[4px] w-[3px] rounded-full" style={{ background: "var(--bar)" }} />
      {label}
    </Tag>
  );
}

/**
 * Which look a meeting takes (see .cal-event): a teammate's a shade lighter
 * than yours, faded once it's over, solid while it's on, an outline when it's
 * marked free, and striped for out of office and focus time.
 */
function look(item: Item, now: number, allDay = false) {
  const on = !allDay && !!item.event && item.start <= now && item.end > now && !item.free;
  return {
    "data-team": item.who ? "" : undefined,
    "data-past": item.end <= now ? "" : undefined,
    "data-now": on ? "" : undefined,
    "data-free": item.free ? "" : undefined,
    "data-hatch": item.kind === "out" || item.kind === "focus" ? "" : undefined,
  };
}

/** Whether two times fall on the same day (a range across midnight says both days' times plainly). */
function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b - 1).toDateString();
}

/** How far each step of a meeting that starts inside another is set in, as a share of the day's width. */
const INDENT = 0.14;
/** Meetings starting closer together than this share the width; later than this, the later one sits over the earlier, set in. */
const SHARE = 30 * 60_000;

/**
 * Where each meeting sits across its day, the way calendars lay them out:
 * ones that start together share the width side by side; one that starts well
 * inside another (its title clear of the first's) is set in a step and drawn
 * over it, so both keep most of the width. Drawn in this order, later on top.
 */
function arrange(items: Item[]): Array<{ item: Item; left: number; width: number }> {
  type Row = { indent: number; members: Item[] };
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end || (a.who ? 1 : 0) - (b.who ? 1 : 0));
  const rowOf = new Map<Item, Row>();
  const placed: Item[] = [];
  for (const item of sorted) {
    const over = placed.filter((one) => one.end > item.start);
    const close = over.find((one) => item.start - one.start < SHARE);
    if (close) {
      rowOf.get(close)!.members.push(item);
      rowOf.set(item, rowOf.get(close)!);
    } else {
      const indent = over.length ? Math.max(...over.map((one) => rowOf.get(one)!.indent)) + 1 : 0;
      rowOf.set(item, { indent, members: [item] });
    }
    placed.push(item);
  }
  return placed.map((item) => {
    const row = rowOf.get(item)!;
    const start = Math.min(row.indent * INDENT, 0.5);
    const share = (1 - start) / row.members.length;
    return { item, left: start + row.members.indexOf(item) * share, width: share };
  });
}
