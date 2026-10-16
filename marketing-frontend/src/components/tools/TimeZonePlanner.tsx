"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { STONE } from "@/components/home/Blocks";
import {
  SLOT,
  ZONES,
  cityOf,
  clock,
  offsetMinutes,
  overlap,
  utcLabel,
  type Member,
  type TimeZonesContent,
} from "@/lib/tools/time-zones";

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

/** A team across three continents with two hours in common, so the first render already shows an answer. */
const START: Member[] = [
  { zone: "America/Sao_Paulo", start: 9, end: 17 },
  { zone: "Europe/London", start: 9, end: 17 },
  { zone: "Europe/Berlin", start: 9, end: 17 },
  { zone: "America/New_York", start: 9, end: 17 },
];
const MAX = 12;
const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

/**
 * Each person's time zone and working hours, a day of half hours in the first
 * person's time showing who's working, and the stretch that suits the most
 * people, in everyone's own time.
 */
export function TimeZonePlanner({
  locale,
  labels,
}: {
  locale: string;
  labels: TimeZonesContent["planner"];
}) {
  const [members, setMembers] = useState<Member[]>(START);
  // Offsets for today, so summer time is counted; the day doesn't change while the page is open.
  const [now] = useState(() => new Date());
  const result = useMemo(() => overlap(members, now), [members, now]);
  const city = cityOf(members[0].zone);

  const update = (index: number, change: Partial<Member>) =>
    setMembers((current) =>
      current.map((member, at) =>
        at === index ? { ...member, ...change } : member,
      ),
    );

  const addMine = () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setMembers((current) =>
      [...current, { zone, start: 9, end: 17 }].slice(0, MAX),
    );
  };

  const options = useMemo(
    () =>
      ZONES.map((one) => ({ ...one, offset: offsetMinutes(one.zone, now) }))
        .sort((a, b) => a.offset - b.offset)
        .map((one) => ({
          value: one.zone,
          label: `${one.city} (${utcLabel(one.offset)})`,
        })),
    [now],
  );
  const optionsFor = (zone: string) =>
    options.some((one) => one.value === zone)
      ? options
      : [
          {
            value: zone,
            label: `${cityOf(zone)} (${utcLabel(offsetMinutes(zone, now))})`,
          },
          ...options,
        ];

  const range = (from: number, to: number) =>
    `${clock(from, locale)}–${clock(to, locale)}`;
  const summary =
    result.most === 0
      ? labels.nobody
      : result.everyone
        ? fill(labels.everyone, {
            from: clock(result.from, locale),
            to: clock(result.to, locale),
            city,
          })
        : fill(labels.best, {
            from: clock(result.from, locale),
            to: clock(result.to, locale),
            city,
            count: result.most,
            total: members.length,
          });

  const select =
    "h-9 min-w-0 cursor-pointer rounded-full bg-background/80 px-3 text-[13.5px] text-foreground";

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <ol className="grid gap-2">
        {members.map((member, index) => (
          <li
            key={index}
            className="grid gap-2 rounded-[18px] bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
          >
            <label className="grid">
              <span className="sr-only">{labels.zone}</span>
              <select
                value={member.zone}
                onChange={(event) =>
                  update(index, { zone: event.target.value })
                }
                className={select}
              >
                {optionsFor(member.zone).map((one) => (
                  <option key={one.value} value={one.value}>
                    {one.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between gap-2 sm:contents">
              <div className="flex items-center gap-1.5">
                <select
                  aria-label={labels.hours}
                  value={member.start}
                  onChange={(event) =>
                    update(index, { start: Number(event.target.value) })
                  }
                  className={select}
                >
                  {HOURS.slice(0, 24).map((hour) => (
                    <option key={hour} value={hour}>
                      {clock(hour * 60, locale)}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">–</span>
                <select
                  aria-label={labels.hours}
                  value={member.end}
                  onChange={(event) =>
                    update(index, { end: Number(event.target.value) })
                  }
                  className={select}
                >
                  {HOURS.slice(1).map((hour) => (
                    <option key={hour} value={hour}>
                      {clock(hour * 60, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={members.length <= 2}
                onClick={() =>
                  setMembers((current) =>
                    current.filter((_, at) => at !== index),
                  )
                }
                className="h-9 cursor-pointer rounded-full px-3 text-[13px] text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-40"
              >
                {labels.remove}
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={members.length >= MAX}
          onClick={() =>
            setMembers((current) => [
              ...current,
              { zone: current[current.length - 1].zone, start: 9, end: 17 },
            ])
          }
          className={cn(
            STONE,
            "cursor-pointer disabled:cursor-default disabled:opacity-40",
          )}
        >
          {labels.add}
        </button>
        <button
          type="button"
          disabled={members.length >= MAX}
          onClick={addMine}
          className={cn(
            STONE,
            "cursor-pointer disabled:cursor-default disabled:opacity-40",
          )}
        >
          {labels.addMine}
        </button>
      </div>

      <p
        aria-live="polite"
        className="mt-8 text-balance text-[22px] font-normal leading-[1.25] tracking-[-0.02em] sm:text-[26px]"
      >
        {summary}
      </p>
      {result.most > 0 && (
        <div className="mt-4">
          <p className="text-[13.5px] text-muted-foreground">
            {labels.eachLocal}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14.5px] tabular-nums">
            {members.map((member, index) => (
              <li
                key={index}
                className={cn(
                  !result.slots[result.from / SLOT][index] &&
                    "text-muted-foreground line-through",
                )}
              >
                {cityOf(member.zone)}{" "}
                {range(result.local[index].from, result.local[index].to)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The day in half hours of the first person's time: a bar per person, then how many are in. */}
      <div className="mt-8" aria-hidden>
        <p className="text-[12.5px] text-muted-foreground">
          {fill(labels.timesIn, { city })}
        </p>
        <div className="mt-2 grid grid-cols-[repeat(48,minmax(0,1fr))] text-[11px] text-faint">
          {[0, 6, 12, 18].map((hour) => (
            <span
              key={hour}
              style={{ gridColumn: `${hour * 2 + 1} / span 12` }}
            >
              {clock(hour * 60, locale)}
            </span>
          ))}
        </div>
        <div className="mt-1 grid gap-1">
          {members.map((member, person) => (
            <div
              key={person}
              className="grid grid-cols-[repeat(48,minmax(0,1fr))] gap-px overflow-hidden rounded-[6px]"
            >
              {result.slots.map((row, slot) => (
                <span
                  key={slot}
                  className={cn(
                    "h-3.5",
                    row[person] ? "bg-foreground/55" : "bg-background/70",
                  )}
                />
              ))}
            </div>
          ))}
          <div className="mt-1 grid grid-cols-[repeat(48,minmax(0,1fr))] gap-px overflow-hidden rounded-[6px]">
            {result.counts.map((count, slot) => (
              <span
                key={slot}
                className={cn(
                  "h-3.5",
                  count === members.length
                    ? "bg-brand"
                    : count === result.most && count > 0
                      ? "bg-brand/45"
                      : "bg-background/70",
                )}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-[12.5px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-foreground/55" />
            {labels.working}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-brand" />
            {labels.all}
          </span>
        </div>
      </div>
    </div>
  );
}
