"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowLeft, Globe, Search } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Loader } from "@/components/motion/loader";
import { ApiError, type AdminPage, type AdminStanding } from "@/lib/api";
import { cn } from "@/lib/utils";

/*
 * What every part of the admin view is made of: times and countries said the
 * same way everywhere, the column of a list with its search and its rows, a
 * page of details with its header and its properties, and the two hooks that
 * load a list a page at a time and run a change.
 */

// ---------- words ----------

const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro" };
export const planName = (plan: string) => PLAN_NAMES[plan] ?? plan;

/** Seconds as hours, with a decimal while it's under ten. */
export const hours = (seconds: number) => (seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: seconds < 36_000 ? 1 : 0 });

/** The time the view was opened, so "how long ago" holds still while it's read. */
function useOpenedAt() {
  return useState(() => Date.now())[0];
}

/** How long ago, in words, with the exact time on hover. */
export function When({ at }: { at: number }) {
  const locale = useLocale();
  const now = useOpenedAt();
  const seconds = Math.round((at - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const [unit, size] = units.find(([, span]) => Math.abs(seconds) >= span) ?? ["second", 1];
  const text = Math.abs(seconds) < 60 ? "just now" : new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
  return (
    <time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString(locale)}>
      {text}
    </time>
  );
}

/** A time in a list's margin: "now", "5m", "3h", "2d" this week, a date before that. */
export function Short({ at }: { at: number }) {
  const locale = useLocale();
  const now = useOpenedAt();
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  const text =
    minutes < 1
      ? "now"
      : minutes < 60
        ? `${minutes}m`
        : minutes < 1440
          ? `${Math.floor(minutes / 60)}h`
          : minutes < 10_080
            ? `${Math.floor(minutes / 1440)}d`
            : new Date(at).toLocaleDateString(locale, { day: "numeric", month: "short", ...(now - at > 31_536_000_000 ? { year: "2-digit" } : {}) });
  return (
    <time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString(locale)} className="tabular-nums">
      {text}
    </time>
  );
}

// ---------- countries ----------

/** A country's name in the page's language, from its ISO code. */
export function useCountryName(code: string | null) {
  const locale = useLocale();
  return useMemo(() => {
    if (!code) return null;
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
    } catch {
      return code;
    }
  }, [code, locale]);
}

/**
 * A country's flag, drawn from flagcdn's SVGs (flag emoji don't draw on
 * Windows); its letters, if the picture doesn't come.
 */
export function Flag({ code, className }: { code: string; className?: string }) {
  const name = useCountryName(code);
  const [failed, setFailed] = useState(false);
  if (failed || !/^[A-Za-z]{2}$/.test(code)) {
    return (
      <span title={name ?? code} className={cn("inline-flex h-[14px] items-center rounded-[3px] bg-muted px-1 text-[9.5px] font-semibold text-muted-foreground", className)}>
        {code.toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt={name ?? code}
      title={name ?? code}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("h-[14px] w-5 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_var(--ui-border)]", className)}
    />
  );
}

/** A flag and the country's name; "Unknown" without one. */
export function Country({ code }: { code: string | null }) {
  const name = useCountryName(code);
  if (!code) return <span className="text-muted-foreground">Unknown</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Flag code={code} />
      <span className="truncate">{name}</span>
    </span>
  );
}

// ---------- marks ----------

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  ok: "bg-ok/12 text-ok",
  warn: "bg-warn/15 text-[color-mix(in_oklab,var(--ui-warn)_75%,var(--ui-foreground))]",
  danger: "bg-destructive/10 text-destructive",
  outline: "text-foreground shadow-[inset_0_0_0_1px_var(--ui-border-strong)]",
};

/** A short mark: a plan, a role; `small` for a tag beside a name. */
export function Badge({ tone = "neutral", small, children }: { tone?: keyof typeof TONES; small?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center font-medium tabular-nums",
        small ? "h-[18px] rounded-[5px] px-1.5 text-[10.5px]" : "h-[22px] rounded-md px-2 text-[11.5px]",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** An office's plan as it has it (AdminStanding): with days left on a trial, and how a paid one stands. */
export function PlanBadge({
  office,
}: {
  office: { plan: string; standing: AdminStanding; trialEndsAt?: number | null; billing?: string | null; cancelAt?: number | null };
}) {
  const now = useOpenedAt();
  switch (office.standing) {
    case "free":
      return <Badge>Free</Badge>;
    case "trial": {
      // Rounded as When says it on the office's page; the last hours still a day.
      const left = (office.trialEndsAt ?? 0) - now;
      return <Badge tone="warn">{left > 0 ? `Trial · ${Math.max(1, Math.round(left / 86_400_000))}d` : "Trial ended"}</Badge>;
    }
    case "given":
      return <Badge tone="outline">Given {planName(office.plan)}</Badge>;
    default:
      if (office.billing === "past_due") return <Badge tone="danger">{planName(office.plan)} · card failed</Badge>;
      if (office.cancelAt) return <Badge tone="warn">{planName(office.plan)} · ending</Badge>;
      return <Badge tone="ok">{planName(office.plan)}</Badge>;
  }
}

/**
 * A row's second line led by a flag: the flag in a place of its own (a faint
 * globe when the country isn't known), so what follows starts at the same
 * point on every row.
 */
export function Flagged({ country, children }: { country: string | null; children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex w-5 shrink-0 justify-center">
        {country ? <Flag code={country} /> : <Globe aria-label="Country not known" className="size-3.5 text-faint" />}
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
}

/** A place in a row that keeps its width whatever goes in it, its content to the right: a badge, a time. */
export function Slot({ width, children }: { width: string; children?: React.ReactNode }) {
  return <span className={cn("flex shrink-0 items-center justify-end", width)}>{children}</span>;
}

/** Someone, or some people, on a floor right now: in green. */
export function Live({ children = "Now" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ok">
      <span className="size-1.5 rounded-full bg-ok" />
      {children}
    </span>
  );
}

// ---------- the column of a list ----------

/**
 * A list's column: its name and count, a search when it has one, its tabs,
 * then its rows, more of them as it scrolls to the end.
 */
export function Column({
  title,
  count,
  actions,
  search,
  tabs,
  children,
  loading,
  empty,
  more,
}: {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  tabs?: React.ReactNode;
  children: React.ReactNode;
  /** Nothing to show yet. */
  loading: boolean;
  /** Said when the list is empty. */
  empty: string | false;
  /** There's more to load, and how. */
  more?: { busy: boolean; load: () => void } | false;
}) {
  const end = useRef<HTMLDivElement>(null);
  const load = more ? more.load : null;
  const busy = more ? more.busy : false;
  // The next page arrives as the end of the list comes into view.
  useEffect(() => {
    const target = end.current;
    if (!target || !load) return;
    const watch = new IntersectionObserver(([entry]) => entry.isIntersecting && !busy && load(), { rootMargin: "200px" });
    watch.observe(target);
    return () => watch.disconnect();
  }, [load, busy]);
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 ps-4 pe-2">
        <h1 className="text-[16px] font-semibold tracking-tight">{title}</h1>
        {count !== undefined && <span className="text-[13px] tabular-nums text-faint">{count.toLocaleString()}</span>}
        <span className="ms-auto flex items-center">{actions}</span>
      </header>
      {search && (
        <label className="relative mx-4 mb-2.5 block shrink-0">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder}
            className="h-9 w-full rounded-[10px] bg-muted pe-3 ps-9 text-[16px] outline-none placeholder:text-faint focus:bg-card focus:shadow-[0_0_0_1px_var(--ui-border-strong)] sm:text-[13.5px]"
          />
        </label>
      )}
      {tabs && <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">{tabs}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader variant="dots" size={18} />
          </div>
        ) : empty ? (
          <p className="px-4 py-16 text-center text-[13px] text-muted-foreground">{empty}</p>
        ) : (
          <>
            <ul className="flex flex-col">{children}</ul>
            {more && (
              <div ref={end} className="flex justify-center py-3 text-muted-foreground">
                {busy && <Loader variant="dots" size={14} />}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** A tab over a list: its name, and how many it holds when that's known. */
export function Tab({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && <span className={cn("tabular-nums", active ? "text-background/60" : "text-faint")}>{count.toLocaleString()}</span>}
    </button>
  );
}

/**
 * A row of a list, edge to edge between hairlines: a face, then two lines,
 * each with its margin on the right: the name beside a time, the line under
 * it beside a badge. A time stays beside the name when there's nothing under it.
 */
export function Row({
  selected,
  onClick,
  lead,
  title,
  sub,
  aside,
  below,
  strong,
}: {
  selected: boolean;
  onClick: () => void;
  lead: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  aside?: React.ReactNode;
  below?: React.ReactNode;
  /** Unread: the title in bold. */
  strong?: boolean;
}) {
  return (
    <li className="border-b border-border">
      <button
        type="button"
        onClick={onClick}
        aria-current={selected || undefined}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-start transition-colors",
          selected ? "bg-muted [--face-ring:var(--ui-muted)]" : "hover:bg-foreground/[0.025]",
        )}
      >
        <span className="shrink-0">{lead}</span>
        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className={cn("flex h-5 min-w-0 items-center gap-1.5 text-[14px]", strong ? "font-semibold" : "font-medium")}>{title}</span>
          <span className="flex items-center justify-end text-[12px] text-faint">{aside}</span>
          {(sub || below) && (
            <>
              <span className="truncate text-[12.5px] text-muted-foreground">{sub}</span>
              <span className="flex min-h-[22px] items-center justify-end text-[12px] text-faint">{below}</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

// ---------- a page of details ----------

/** Nothing picked yet: what picking something shows. */
export function Pick({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)] [&_svg]:size-[22px]">
        {icon}
      </span>
      <p className="mt-4 text-[15px] font-semibold">{title}</p>
      <p className="mt-1 max-w-64 text-[13px] text-muted-foreground">{note}</p>
    </div>
  );
}

/** The top of a page of details: the way back on a phone, a face, a name and a line, and its actions. */
export function DetailHeader({
  onBack,
  lead,
  title,
  sub,
  actions,
}: {
  onBack: () => void;
  lead?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-[76px] shrink-0 items-center gap-3 border-b border-border px-3 py-3 md:px-6">
      <IconButton label="Back" size="sm" className="md:hidden" onClick={onBack} icon={<ArrowLeft className="rtl:rotate-180" />} />
      {lead}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[17px] font-semibold tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}

/** A page of details while it's read, or if it can't be. */
export function DetailState({ error }: { error?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      {error ? <p className="text-[13px] text-destructive">{error}</p> : <Loader variant="dots" size={18} />}
    </div>
  );
}

/** A titled part of a page of details. */
export function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[12.5px] font-semibold text-muted-foreground">{title}</h3>
        {aside && <span className="text-[12px] text-faint">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Facts in rows: an icon and a name on the left, the value on the right. */
export function Properties({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-border rounded-xl border border-border">{children}</dl>;
}

export function Property({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-3.5 py-2 text-[13px]">
      {/* The names' column: as wide as a page needs, narrower beside a conversation (--label). */}
      <dt className="flex w-[var(--label,8rem)] shrink-0 items-center gap-2.5 text-muted-foreground [&_svg]:size-4 [&_svg]:text-faint">
        {icon}
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center justify-end gap-2 text-end">{children}</dd>
    </div>
  );
}

/** Numbers side by side, each with its name under it: a page's figures at a glance. */
export function Figures({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 divide-border overflow-hidden rounded-xl border border-border sm:grid-cols-4 sm:divide-x [&>*]:border-border max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(odd)]:border-e">{children}</div>;
}

export function Figure({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <p className="truncate text-[12px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[20px] font-semibold tabular-nums tracking-tight">{value}</p>
      {note && <p className="mt-0.5 truncate text-[11.5px] text-faint">{note}</p>}
    </div>
  );
}

// ---------- dialogs ----------

/** A dialog's button: quiet, solid for the main action, or red for one that can't be undone. */
export function DialogButton({
  children,
  onClick,
  disabled,
  solid,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  solid?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-10 cursor-pointer rounded-full px-4 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "bg-destructive text-white hover:bg-destructive/90" : solid ? "bg-foreground text-background hover:bg-foreground/85" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** A text field in a dialog. */
export function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[16px] outline-none focus:border-border-strong sm:text-[14px]" />;
}

// ---------- hooks ----------

/** A change to make: whether it's under way, what went wrong, and running it. */
export function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : "That didn't go through. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, clear: () => setError(null) };
}

/** What's typed into a search, once typing pauses. */
export function useSearch(): [string, string, (value: string) => void] {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), 250);
    return () => clearTimeout(timer);
  }, [typed]);
  return [typed, search, setTyped];
}

/**
 * A list read a page at a time: the first page whenever what it's asked for
 * changes, the next on `more`, and every page shown read again on `reload`
 * (and every `every` ms while the tab is on screen), so nothing already shown
 * goes missing. What's shown belongs to the question it answers: ask another
 * and the list is empty (loading) until its answer comes.
 */
export function usePaged<T>(read: (page: number) => Promise<AdminPage & { items: T[] }>, every?: number) {
  type Shown = { read: typeof read; items: T[]; paging: AdminPage; pages: number };
  const [shown, setShown] = useState<Shown | null>(null);
  const [failed, setFailed] = useState<typeof read | null>(null);
  const [busy, setBusy] = useState(false);
  // The latest question asked: an answer to an older one is dropped.
  const asked = useRef(0);

  /** Pages from `from` up to `to`, after the items already kept. */
  const fetch = useCallback(
    async (from: number, to: number, keep: T[]) => {
      const ask = ++asked.current;
      try {
        const found = await Promise.all(Array.from({ length: to - from }, (_, page) => read(from + page)));
        if (ask !== asked.current) return;
        setShown({ read, items: [...keep, ...found.flatMap((one) => one.items)], paging: found.at(-1)!, pages: to });
        setFailed(null);
      } catch {
        if (ask === asked.current) setFailed(() => read);
      }
    },
    [read],
  );

  useEffect(() => {
    // State is set when the answer comes, not here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetch(0, 1, []);
  }, [fetch]);

  const current = shown?.read === read ? shown : null;
  const pages = current?.pages ?? 1;
  const reload = useCallback(() => fetch(0, pages, []), [fetch, pages]);
  useEffect(() => {
    if (!every) return;
    const timer = setInterval(() => document.visibilityState === "visible" && void reload(), every);
    return () => clearInterval(timer);
  }, [reload, every]);

  const hasMore = !!current && pages * current.paging.pageSize < current.paging.total;
  return {
    items: current?.items ?? null,
    total: current?.paging.total ?? 0,
    error: failed === read,
    more: hasMore
      ? {
          busy,
          load: async () => {
            setBusy(true);
            await fetch(pages, pages + 1, current.items);
            setBusy(false);
          },
        }
      : (false as const),
    reload,
  };
}
