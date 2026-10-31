"use client";

import { useId, useState } from "react";
import { useLocale } from "next-intl";
import { AlertCircle, ChevronRight, Inbox as InboxIcon, Refresh, TimerOff } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face } from "@/components/ui/Face";
import type { AdminSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge, Flag, hours, planName, Short, useCountryName } from "./pieces";
import type { View } from "./views";

/**
 * The team's dashboard: the numbers that say how it's going, across the top,
 * each against the week before where there's one to compare; sign-ups over a
 * month; what needs someone (unread help, failed card payments, plans
 * ending); the offices meeting the most; how offices split across plans; the
 * newest people; and where people come from. Every office and person in it
 * opens their page. Revenue, refunds and history are in Creem's own dashboard.
 */
export function Overview({ summary, recount, open }: { summary: AdminSummary; recount: () => void; open: (view: View, id: string) => void }) {
  const locale = useLocale();
  const { counts, plans, signups } = summary;
  const [spinning, setSpinning] = useState(false);
  const thisWeek = sum(signups.slice(-7));
  const lastWeek = sum(signups.slice(-14, -7));
  const paying = sum(Object.values(plans.paid));

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="me-auto">
            <p className="text-[12.5px] text-muted-foreground">{new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="text-[22px] font-semibold tracking-tight">Overview</h1>
          </div>
          <IconButton
            label="Refresh"
            tone="soft"
            size="sm"
            icon={<Refresh className={cn(spinning && "animate-spin")} />}
            onClick={() => {
              setSpinning(true);
              recount();
              setTimeout(() => setSpinning(false), 700);
            }}
          />
        </header>

        {/* The headline numbers, in one band. */}
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border md:grid-cols-5 [&>*]:border-border max-md:[&>*:nth-child(odd)]:border-e max-md:[&>*:nth-child(-n+4)]:border-b md:[&>*:not(:last-child)]:border-e">
          <Headline label="Accounts" value={counts.accounts} note={<Change up={counts.newWeek}>this week</Change>} />
          <Headline label="Sign-ups this week" value={thisWeek} note={<Versus now={thisWeek} before={lastWeek} />} />
          <Headline label="Around today" value={counts.activeDay} note={`${share(counts.activeDay, counts.accounts)} of accounts`} />
          <Headline label="Around this week" value={counts.activeWeek} note={`${share(counts.activeWeek, counts.accounts)} of accounts`} />
          <Headline label="Paying offices" value={paying} note={`of ${counts.offices.toLocaleString()} offices`} className="max-md:col-span-2" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title="Sign-ups" note="Accounts made each day, the last 30 days" className="lg:col-span-2">
            <SignupChart days={signups} dates={summary.signupDays} />
          </Card>

          {/* Beside the chart: what needs someone, and how offices split across plans. */}
          <div className="flex flex-col gap-4">
            <Card title="Needs you">
              <Attention
                rows={[
                  { icon: <InboxIcon />, label: "Unread in the Inbox", count: counts.helpUnread, onClick: () => open("inbox", "") },
                  { icon: <AlertCircle />, label: "Card payments failed", count: plans.pastDue, tone: "danger", onClick: () => open("offices", "") },
                  { icon: <TimerOff />, label: "Plans ending", count: plans.ending, onClick: () => open("offices", "") },
                ]}
              />
            </Card>

            <Card title="Plans" note={`${counts.offices.toLocaleString()} offices`}>
              <Plans offices={counts.offices} paying={paying} given={plans.given} />
            </Card>

          </div>

          <Card title="Meeting the most" note={`${hours(summary.meetingSeconds)} meeting hours across every office this month`} className="lg:col-span-2">
            <Busiest offices={summary.busiest} open={(id) => open("offices", id)} />
          </Card>

          <Card title="Newest people">
            <ul className="-mx-2 flex flex-col">
              {summary.newest.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => open("people", person.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 text-start transition-colors hover:bg-foreground/[0.035]"
                  >
                    <Face seed={person.id} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{person.displayName}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">{person.email}</span>
                    </span>
                    {person.country && <Flag code={person.country} />}
                    <span className="w-10 text-end text-[11.5px] text-faint">
                      <Short at={person.createdAt} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Where people come from" note="By the country of their last sign-in, accounts and guests" className="lg:col-span-3">
            <Countries countries={summary.countries} total={counts.accounts + counts.guests} />
          </Card>
        </div>
      </div>
    </div>
  );
}

const sum = (numbers: number[]) => numbers.reduce((total, one) => total + one, 0);
const share = (part: number, whole: number) => `${whole ? Math.round((part / whole) * 100) : 0}%`;

// ---------- pieces of the dashboard ----------

function Headline({ label, value, note, className }: { label: string; value: number; note: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 px-4 py-4 sm:px-5", className)}>
      <p className="truncate text-[12.5px] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none tabular-nums tracking-tight">{value.toLocaleString()}</p>
      <p className="mt-2 truncate text-[12px] text-faint">{note}</p>
    </div>
  );
}

/** A number gained, in green with its sign. */
function Change({ up, children }: { up: number; children: React.ReactNode }) {
  return (
    <>
      <span className={cn("font-medium tabular-nums", up > 0 ? "text-ok" : "text-muted-foreground")}>+{up.toLocaleString()}</span> {children}
    </>
  );
}

/** This week against the last: up in green, down in red, by how much. */
function Versus({ now, before }: { now: number; before: number }) {
  if (!before) return <>{now ? "none the week before" : "none either week"}</>;
  const change = Math.round(((now - before) / before) * 100);
  return (
    <>
      <span className={cn("font-medium tabular-nums", change > 0 ? "text-ok" : change < 0 ? "text-destructive" : "text-muted-foreground")}>
        {change > 0 ? "+" : ""}
        {change}%
      </span>{" "}
      on last week
    </>
  );
}

function Card({ title, note, className, children }: { title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-border p-4 sm:p-5", className)}>
      <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
      {note && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{note}</p>}
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/**
 * Sign-ups a day as a line over the month, the area under it shaded: where
 * the pointer is, that day and its count. Grid lines at a third and two
 * thirds of the busiest day.
 */
function SignupChart({ days, dates }: { days: number[]; dates: string[] }) {
  const locale = useLocale();
  const gradient = useId();
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(3, ...days);
  const [w, h] = [600, 180];
  const x = (index: number) => (index / Math.max(1, days.length - 1)) * w;
  const y = (count: number) => h - (count / top) * (h - 12) - 2;
  const points = days.map((count, index) => [x(index), y(count)] as const);
  // A gentle curve through the days: each corner rounded at the midpoints between them.
  const line = points.reduce((path, [px, py], index) => {
    if (index === 0) return `M${px},${py}`;
    const [qx, qy] = points[index - 1];
    return `${path} Q${qx},${qy} ${(qx + px) / 2},${(qy + py) / 2}`;
  }, "") + ` L${points.at(-1)![0]},${points.at(-1)![1]}`;
  const label = (index: number) => new Date(`${dates[index]}T12:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const total = sum(days);

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 flex items-baseline gap-2">
        <span className="text-[24px] font-semibold tabular-nums tracking-tight">{hover === null ? total : days[hover]}</span>
        <span className="text-[12.5px] text-muted-foreground">{hover === null ? "in 30 days" : label(hover)}</span>
      </p>
      {/* As tall as the card beside it lets it be. */}
      <div className="relative min-h-44 flex-1" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ui-foreground)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--ui-foreground)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[1 / 3, 2 / 3, 1].map((part) => (
            <line key={part} x1="0" x2={w} y1={y(top * part)} y2={y(top * part)} stroke="var(--ui-border)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke="var(--ui-border-strong)" vectorEffect="non-scaling-stroke" />
          <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gradient})`} />
          <path d={line} fill="none" stroke="var(--ui-foreground)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={h} stroke="var(--ui-border-strong)" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hover !== null && (
          <span
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground"
            style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(days[hover]) / h) * 100}%` }}
          />
        )}
        {/* A strip a day, for the pointer to find. */}
        <div className="absolute inset-0 flex">
          {days.map((count, index) => (
            <div key={index} className="h-full flex-1" onMouseEnter={() => setHover(index)} title={`${label(index)}: ${count}`} />
          ))}
        </div>
        <span className="absolute end-0 top-0 -translate-y-1/2 text-[10.5px] tabular-nums text-faint">{top}</span>
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] tabular-nums text-faint">
        <span>{label(0)}</span>
        <span>{label(Math.floor(days.length / 2))}</span>
        <span>{label(days.length - 1)}</span>
      </div>
    </div>
  );
}

/** What needs someone: each a count and the way to it; quiet when it's nothing. */
function Attention({ rows }: { rows: Array<{ icon: React.ReactNode; label: string; count: number; tone?: "danger"; onClick: () => void }> }) {
  const any = rows.some((row) => row.count > 0);
  return (
    <div className="flex h-full flex-col">
      <ul className="-mx-2 flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.label}>
            <button
              type="button"
              onClick={row.onClick}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2.5 text-start transition-colors hover:bg-foreground/[0.035]"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4",
                  row.count > 0 ? (row.tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-foreground text-background") : "bg-muted text-faint",
                )}
              >
                {row.icon}
              </span>
              <span className={cn("flex-1 text-[13px]", row.count > 0 ? "font-medium" : "text-muted-foreground")}>{row.label}</span>
              <span className={cn("text-[14px] font-semibold tabular-nums", row.count > 0 ? "" : "text-faint")}>{row.count}</span>
              <ChevronRight className="size-3.5 text-faint rtl:rotate-180" />
            </button>
          </li>
        ))}
      </ul>
      {!any && <p className="mt-auto pt-4 text-[12.5px] text-muted-foreground">Nothing waiting. All caught up.</p>}
    </div>
  );
}

/** The offices meeting the most this month, each with a bar against the busiest. */
function Busiest({ offices, open }: { offices: AdminSummary["busiest"]; open: (id: string) => void }) {
  if (offices.length === 0) return <p className="py-8 text-center text-[13px] text-muted-foreground">No meetings yet this month.</p>;
  const top = Math.max(1, ...offices.map((one) => one.meetingSeconds));
  return (
    <ul className="-mx-2 flex flex-col">
      {offices.map((office) => (
        <li key={office.id}>
          <button
            type="button"
            onClick={() => open(office.id)}
            className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_3.5rem] items-center gap-3 rounded-[10px] px-2 py-2 text-start transition-colors hover:bg-foreground/[0.035]"
          >
            <Face seed={office.id} size={30} square />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium">{office.name}</span>
                {office.plan !== "free" && <Badge tone="strong">{planName(office.plan)}</Badge>}
              </span>
              <span className="block text-[12px] text-muted-foreground">{office.members === 1 ? "1 person" : `${office.members} people`}</span>
            </span>
            <span className="h-1.5 rounded-full bg-muted">
              <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${(office.meetingSeconds / top) * 100}%` }} />
            </span>
            <span className="text-end text-[13px] font-medium tabular-nums">{hours(office.meetingSeconds)} h</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Offices by how they're on a plan: paying, given one, or free, as one bar and a legend. */
function Plans({ offices, paying, given }: { offices: number; paying: number; given: number }) {
  const free = Math.max(0, offices - paying - given);
  const parts = [
    { label: "Paying", count: paying, color: "bg-foreground" },
    { label: "Given Pro", count: given, color: "bg-ok" },
    { label: "Free", count: free, color: "bg-foreground/15" },
  ];
  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {parts.map((part) => part.count > 0 && <span key={part.label} className={part.color} style={{ flexGrow: part.count }} />)}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center gap-2.5 text-[13px]">
            <span className={cn("size-2.5 rounded-[3px]", part.color)} />
            <span className="flex-1">{part.label}</span>
            <span className="font-medium tabular-nums">{part.count.toLocaleString()}</span>
            <span className="w-10 text-end tabular-nums text-faint">{share(part.count, offices)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The top countries, in columns on a wide screen: a flag, a name, a bar against the first, a count and its share. */
function Countries({ countries, total }: { countries: AdminSummary["countries"]; total: number }) {
  if (countries.length === 0) return <p className="py-8 text-center text-[13px] text-muted-foreground">No countries yet.</p>;
  const top = Math.max(1, ...countries.map((one) => one.people));
  return (
    <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {countries.slice(0, 12).map((one) => (
        <CountryRow key={one.country} code={one.country} people={one.people} bar={one.people / top} share={share(one.people, total)} />
      ))}
    </ul>
  );
}

function CountryRow({ code, people, bar, share: part }: { code: string; people: number; bar: number; share: string }) {
  const name = useCountryName(code);
  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,0.8fr)_2.25rem_2.5rem] items-center gap-2.5 text-[13px]">
      <Flag code={code} />
      <span className="truncate">{name}</span>
      <span className="h-1.5 rounded-full bg-muted">
        <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${bar * 100}%` }} />
      </span>
      <span className="text-end font-medium tabular-nums">{people}</span>
      <span className="text-end tabular-nums text-faint">{part}</span>
    </li>
  );
}
