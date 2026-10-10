"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, MoreHorizontal, Pencil, RotateCcw, Search, Trash2 } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type AdminMember, type AdminOffice, type AdminPage, type AdminPerson, type AdminSummary, type LobbyChatPage, type PlanId } from "@/lib/api";
import { usePlans } from "@/lib/billing";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { AppTopBar } from "@/components/app/AppTopBar";
import { Face } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";
import { Help } from "./Help";
import { DialogButton, When } from "./pieces";

/*
 * The admin view, for the team: how many people there are and how many came
 * back, where they come from, how many offices pay and how many meeting
 * hours are used; who everyone is, and every office with its members. A few
 * things can be done by hand: answer what people say through Help and
 * feedback, rename or delete an account, rename or close an office, give
 * an office a plan without payment, and change or take down a message in the
 * lobby's chat. The API answers only the admin accounts;
 * everyone else gets a plain "nothing here". In English: it's a tool for the
 * team, not a page.
 */

type Tab = "overview" | "help" | "people" | "guests" | "offices" | "lobby";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "help", label: "Help" },
  { key: "people", label: "People" },
  { key: "guests", label: "Guests" },
  { key: "offices", label: "Offices" },
  { key: "lobby", label: "Lobby chat" },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [denied, setDenied] = useState(false);
  // Refresh: the counts, and the tab on screen read again (its search, page and open office kept).
  const [round, setRound] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    setRound((was) => was + 1);
    await api.adminSummary().then(setSummary, () => undefined);
    setRefreshing(false);
  };
  // The Help tab knows what's unread, and the count beside its name follows.
  const helpUnread = useCallback(
    (count: number) => setSummary((now) => now && { ...now, counts: { ...now.counts, helpUnread: count } }),
    [],
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/admin" })}`);
      return;
    }
    api.adminSummary().then(setSummary, (error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) setDenied(true);
    });
  }, [isLoading, user, router]);

  return (
    <div className="min-h-dvh w-full bg-background font-(family-name:--font-app) text-foreground">
      <AppTopBar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        {denied ? (
          <p className="py-24 text-center text-[14px] text-muted-foreground">There&apos;s nothing here.</p>
        ) : !summary ? (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader variant="dots" size={20} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <h1 className="me-auto text-[24px] font-semibold tracking-tight">Admin</h1>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh"
                title="Refresh"
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default"
              >
                <RotateCcw className={cn("size-4", refreshing && "animate-spin [animation-direction:reverse]")} />
              </button>
              <div role="tablist" className="flex h-9 gap-0.5 overflow-x-auto rounded-full bg-muted p-1 [scrollbar-width:none]">
                {TABS.map((one) => (
                  <button
                    key={one.key}
                    role="tab"
                    type="button"
                    aria-selected={tab === one.key}
                    onClick={() => setTab(one.key)}
                    className={cn(
                      "h-7 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors",
                      tab === one.key ? "bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)]" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {one.label}
                    {one.key === "help" && summary.counts.helpUnread > 0 && (
                      <span className="ms-1.5 rounded-full bg-foreground px-1.5 text-[11px] font-semibold tabular-nums text-background">
                        {summary.counts.helpUnread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              {tab === "overview" && <Overview summary={summary} />}
              {tab === "help" && <Help round={round} onUnread={helpUnread} />}
              {tab === "people" && <People key="people" guests={false} round={round} />}
              {tab === "guests" && <People key="guests" guests round={round} />}
              {tab === "offices" && <Offices round={round} />}
              {tab === "lobby" && <LobbyChat round={round} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */

function Overview({ summary }: { summary: AdminSummary }) {
  const { counts, countries, signups, signupDays } = summary;
  const tiles: Array<{ label: string; value: number; note?: string }> = [
    { label: "Accounts", value: counts.accounts, note: `${counts.withGoogle} with Google` },
    { label: "Active today", value: counts.activeDay },
    { label: "Active this week", value: counts.activeWeek },
    { label: "New this week", value: counts.newWeek, note: `${counts.newMonth} this month` },
    { label: "Offices", value: counts.offices },
    { label: "Guests", value: counts.guests, note: "Kept for a week" },
  ];
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[12.5px] text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight">{tile.value.toLocaleString()}</p>
            {tile.note && <p className="mt-0.5 text-[12px] text-muted-foreground">{tile.note}</p>}
          </div>
        ))}
      </div>
      <Business summary={summary} />
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Signups days={signups} dates={signupDays} />
        <Countries countries={countries} />
      </div>
    </div>
  );
}

const PLAN_NAMES: Record<string, string> = { free: "Free", plus: "Plus", pro: "Pro" };
const planName = (plan: string) => PLAN_NAMES[plan] ?? plan;
const hours = (seconds: number) => (seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: seconds < 36_000 ? 1 : 0 });

/**
 * Just enough about plans to act on: how many offices pay, on which plan,
 * how many have a plan given by hand, and this month's meeting hours.
 * Revenue, failed payments and cancellations are in Creem's own dashboard.
 */
function Business({ summary }: { summary: AdminSummary }) {
  const { plans, meetingSeconds } = summary;
  const paying = Object.values(plans.paid).reduce((sum, count) => sum + count, 0);
  const tiles = [
    { label: "Paying offices", value: paying.toLocaleString(), note: `Plus ${plans.paid.plus ?? 0} · Pro ${plans.paid.pro ?? 0}` },
    { label: "Given plans", value: plans.given.toLocaleString(), note: "Paid plan, no payment" },
    { label: "Meeting hours", value: hours(meetingSeconds), note: "All offices, this month" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[12.5px] text-muted-foreground">{tile.label}</p>
          <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight">{tile.value}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{tile.note}</p>
        </div>
      ))}
    </div>
  );
}

/** Sign-ups a day over the last 30 days: one bar a day, the day and count on hover. */
function Signups({ days, dates }: { days: number[]; dates: string[] }) {
  const locale = useLocale();
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(1, ...days);
  const total = days.reduce((sum, day) => sum + day, 0);
  // Each bar is a calendar day where you are (the server counted them that way), written as that date.
  const label = (index: number) =>
    new Date(`${dates[index]}T12:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold">Sign-ups, last 30 days</h2>
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {hover === null ? `${total} in total` : `${label(hover)}: ${days[hover]}`}
        </p>
      </div>
      <div className="mt-5 flex h-36 items-end gap-[2px]" onMouseLeave={() => setHover(null)} role="img" aria-label={`${total} sign-ups in the last 30 days`}>
        {days.map((count, index) => (
          <div
            key={index}
            className="flex h-full flex-1 cursor-default items-end"
            onMouseEnter={() => setHover(index)}
            onFocus={() => setHover(index)}
            title={`${label(index)}: ${count}`}
          >
            <div
              className={cn("w-full rounded-t-[4px] transition-colors", hover === index ? "bg-brand" : "bg-brand/70")}
              style={{ height: count ? `${Math.max(4, (count / top) * 100)}%` : "2px", opacity: count ? 1 : 0.35 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
        <span>{label(0)}</span>
        <span>{label(29)}</span>
      </div>
    </section>
  );
}

function Countries({ countries }: { countries: AdminSummary["countries"] }) {
  const top = Math.max(1, ...countries.map((one) => one.people));
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-[14px] font-semibold">Where people come from</h2>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">By the country of their last sign-in, accounts and guests.</p>
      {countries.length === 0 ? (
        <p className="mt-6 text-[13px] text-muted-foreground">No countries yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {countries.map((one) => (
            <li key={one.country} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[13px]">
              <Country code={one.country} />
              <span className="h-2 rounded-full bg-muted">
                <span className="block h-full rounded-full bg-brand/70" style={{ width: `${(one.people / top) * 100}%` }} />
              </span>
              <span className="tabular-nums text-muted-foreground">{one.people}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- People ---------- */

function People({ guests, round }: { guests: boolean; round: number }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [people, setPeople] = useState<AdminPerson[] | null>(null);
  const [paging, setPaging] = useState<AdminPage | null>(null);
  const [busy, setBusy] = useState(false);

  // The search runs once typing pauses, from its first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const found = await api.adminPeople({ q: search, guests, page });
      setPeople(found.users);
      setPaging(found);
    } finally {
      setBusy(false);
    }
  }, [search, guests, page]);

  useEffect(() => {
    // The page asked for, whenever the search or the page changes, or on Refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, round]);

  return (
    <section>
      <label className="relative block max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={guests ? "Search by name" : "Search by name or email"}
          className="h-10 w-full rounded-full border border-border bg-card pe-4 ps-9 text-[14px] outline-none focus:border-border-strong"
        />
      </label>

      {people === null ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader variant="dots" size={18} />
        </div>
      ) : people.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-muted-foreground">Nobody matches.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {/* A table on a wide screen, a list of cards on a phone. */}
          <div className={cn("hidden gap-4 border-b border-border px-4 py-2.5 text-[12px] font-medium text-muted-foreground md:grid", PERSON_COLUMNS)}>
            <span>Person</span>
            <span>Country</span>
            <span>Joined</span>
            <span>Last around</span>
            <span>{guests ? "" : "Offices"}</span>
            <span />
          </div>
          <ul>
            {people.map((person) => (
              <li
                key={person.id}
                className={cn("grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-0 md:items-center md:gap-4", PERSON_COLUMNS)}
              >
                <span className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1 [--face-ring:var(--ui-card)]">
                  <Face seed={person.id} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[14px] font-medium">
                      {person.displayName}
                      {!!person.google && <Badge>Google</Badge>}
                    </span>
                    {person.email && <span className="block truncate text-[12.5px] text-muted-foreground">{person.email}</span>}
                  </span>
                </span>
                <Cell label="Country">{person.country ? <Country code={person.country} /> : <span className="text-muted-foreground">Unknown</span>}</Cell>
                <Cell label="Joined">
                  <When at={person.createdAt} />
                </Cell>
                <Cell label="Last around">
                  <When at={person.lastActiveAt} />
                </Cell>
                <Cell label={guests ? "" : "Offices"}>{guests ? null : <span className="tabular-nums">{person.offices}</span>}</Cell>
                <span className="col-span-2 flex justify-end md:col-span-1">
                  {!guests && <PersonActions person={person} onChanged={() => load()} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paging && <Pager paging={paging} busy={busy} onPage={setPage} />}
    </section>
  );
}

const PERSON_COLUMNS = "md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_2rem]";

/** Rename an account, or delete it. Deleting explains what happens to the offices it owns. */
function PersonActions({ person, onChanged }: { person: AdminPerson; onChanged: () => void }) {
  const [asking, setAsking] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(person.displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setAsking(null);
    setError(null);
  };
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      close();
      onChanged();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Menu
        align="end"
        width={200}
        trigger={
          <button
            type="button"
            aria-label={`More for ${person.displayName}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        }
      >
        <MenuItem icon={<Pencil />} onSelect={() => setAsking("rename")}>
          Rename
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger icon={<Trash2 />} onSelect={() => setAsking("delete")}>
          Delete account
        </MenuItem>
      </Menu>

      <Dialog
        open={asking === "rename"}
        onClose={close}
        title="Rename"
        description={person.email ?? undefined}
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton solid disabled={busy || !name.trim()} onClick={() => run(() => api.adminRenamePerson(person.id, name))}>
              Save
            </DialogButton>
          </>
        }
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={30}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-border-strong"
        />
        {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
      </Dialog>

      <Dialog
        open={asking === "delete"}
        onClose={close}
        title={`Delete ${person.displayName}?`}
        description="Their sign-in, sessions and memberships go now. Offices they own pass to their longest-standing admin or member; an office with nobody else in it closes. An office on a paid plan that still renews has to be cancelled first. This can't be undone."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton danger disabled={busy} onClick={() => run(() => api.adminDeletePerson(person.id))}>
              Delete account
            </DialogButton>
          </>
        }
      >
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
    </>
  );
}


/** A value with its label shown beside it on a phone, where there are no column headings. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return <span className="hidden md:block" />;
  return (
    <>
      <span className="text-[12px] text-muted-foreground md:hidden">{label}</span>
      <span className="min-w-0 truncate text-[13px] md:text-[13.5px]">{children}</span>
    </>
  );
}

/* ---------- Offices ---------- */

function Offices({ round }: { round: number }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [offices, setOffices] = useState<AdminOffice[] | null>(null);
  const [paging, setPaging] = useState<AdminPage | null>(null);
  const [busy, setBusy] = useState(false);

  // The search runs once typing pauses, from its first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const found = await api.adminOffices({ q: search, page });
      setOffices(found.offices);
      setPaging(found);
    } finally {
      setBusy(false);
    }
  }, [search, page]);

  useEffect(() => {
    // The page asked for, whenever the search or the page changes, or on Refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, round]);

  return (
    <section>
      <label className="relative block max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by office name"
          className="h-10 w-full rounded-full border border-border bg-card pe-4 ps-9 text-[14px] outline-none focus:border-border-strong"
        />
      </label>

      {offices === null ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader variant="dots" size={18} />
        </div>
      ) : offices.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-muted-foreground">{search ? "No office matches." : "No offices yet."}</p>
      ) : (
        <div className={cn("mt-4 overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]", busy && "opacity-60")}>
          {/* A table on a wide screen, a list of cards on a phone. */}
          <div className={cn("hidden gap-4 border-b border-border px-4 py-2.5 text-[12px] font-medium text-muted-foreground md:grid", OFFICE_COLUMNS)}>
            <span>Office</span>
            <span>Seats</span>
            <span>Meeting hours</span>
            <span>On the floor</span>
            <span>Last active</span>
            <span />
          </div>
          <ul>
            {offices.map((office) => (
              <OfficeRow key={office.id} office={office} round={round} onChanged={load} />
            ))}
          </ul>
        </div>
      )}
      {paging && <Pager paging={paging} busy={busy} onPage={setPage} />}
    </section>
  );
}

/** Which rows of how many, and the way to the pages either side. */
function Pager({ paging, busy, onPage }: { paging: AdminPage; busy: boolean; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(paging.total / paging.pageSize));
  if (paging.total <= paging.pageSize) return null;
  const from = paging.page * paging.pageSize + 1;
  const to = Math.min(paging.total, from + paging.pageSize - 1);
  const go = (page: number) => {
    onPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const button =
    "h-9 cursor-pointer rounded-full bg-muted px-4 text-[13px] font-medium transition-colors hover:bg-foreground/[0.08] disabled:cursor-default disabled:opacity-40";
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-[12.5px] tabular-nums text-muted-foreground">
        {from.toLocaleString()}–{to.toLocaleString()} of {paging.total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={button} disabled={busy || paging.page === 0} onClick={() => go(paging.page - 1)}>
          Previous
        </button>
        <span className="text-[12.5px] tabular-nums text-muted-foreground">
          {paging.page + 1} / {pages}
        </span>
        <button type="button" className={button} disabled={busy || paging.page + 1 >= pages} onClick={() => go(paging.page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

const OFFICE_COLUMNS = "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_1.75rem]";
const MEMBER_COLUMNS = "md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]";

/** One office: its row, and, opened, its people (read then) and the way to manage it. */
function OfficeRow({ office, round, onChanged }: { office: AdminOffice; round: number; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const allowance = usePlans()?.plans.find((plan) => plan.id === office.plan)?.meetingHours;
  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        data-office-toggle
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "grid w-full cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-4 py-3 text-start transition-colors hover:bg-foreground/[0.025] md:items-center md:gap-4",
          OFFICE_COLUMNS,
          open && "bg-foreground/[0.025]",
        )}
      >
        <span className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
          <Face seed={office.id} size={32} square />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{office.name}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              {planName(office.plan)}
              <PlanState office={office} />
            </span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform md:hidden", open && "rotate-180")} />
        </span>
        <Cell label="Seats">
          <Seats used={office.members} seats={office.seats} />
        </Cell>
        <Cell label="Meeting hours">
          <span className="tabular-nums">
            {hours(office.meetingSeconds)}
            {allowance !== undefined && <span className="text-muted-foreground"> / {allowance} h</span>}
          </span>
        </Cell>
        <Cell label="On the floor">
          {office.here > 0 ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums text-ok">
              <span className="size-1.5 rounded-full bg-ok" />
              {office.here}
            </span>
          ) : (
            <span className="text-muted-foreground">Nobody</span>
          )}
        </Cell>
        <Cell label="Last active">
          {office.here > 0 ? <Now /> : office.lastActiveAt ? <When at={office.lastActiveAt} /> : <span className="text-muted-foreground">Never</span>}
        </Cell>
        <span className="hidden justify-end md:flex">
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && <OfficePeople office={office} round={round} onChanged={onChanged} />}
    </li>
  );
}

/**
 * An office opened: its people, read now and not with the list, with the
 * rows' own shape standing in while they come; and, tucked in a menu, the
 * things that change it.
 */
function OfficePeople({ office, round, onChanged }: { office: AdminOffice; round: number; onChanged: () => void }) {
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.adminOfficeMembers(office.id).then(
      (found) => !cancelled && setMembers(found.members),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [office.id, round]);

  return (
    <div className="border-t border-border bg-foreground/[0.015] px-4 pb-3 pt-1 md:ps-[60px]">
      <div className="flex items-center justify-between gap-3 py-2">
        <p className="text-[12px] text-muted-foreground">
          Made <When at={office.createdAt} />
          {office.billing ? " · Paid through Creem" : office.plan !== "free" ? " · Plan given without payment" : ""}
        </p>
        <OfficeManage office={office} onChanged={onChanged} />
      </div>
      {/* The same inset as the rows below (their padding and border), so each heading sits over its column. */}
      <div className={cn("hidden gap-4 px-[13px] py-2 text-[11.5px] font-medium text-muted-foreground md:grid", MEMBER_COLUMNS)}>
        <span>Member</span>
        <span>Role</span>
        <span>Country</span>
        <span>Joined</span>
        <span>Last around</span>
      </div>
      {failed ? (
        <p className="rounded-xl border border-border bg-card px-3 py-4 text-center text-[12.5px] text-muted-foreground">Couldn&apos;t read its people.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {members === null
            ? Array.from({ length: Math.min(Math.max(office.members, 1), 4) }, (_, index) => <MemberSkeleton key={index} />)
            : members.map((member) => (
                <li key={member.id} className={cn("grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2.5 md:items-center md:gap-4", MEMBER_COLUMNS)}>
                  <span className="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1">
                    <Face seed={member.id} size={26} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium">{member.displayName}</span>
                      {member.email && <span className="block truncate text-[12px] text-muted-foreground">{member.email}</span>}
                    </span>
                  </span>
                  <Cell label="Role">
                    <Badge>{member.owner ? "owner" : member.role}</Badge>
                  </Cell>
                  <Cell label="Country">{member.country ? <Country code={member.country} /> : <span className="text-muted-foreground">Unknown</span>}</Cell>
                  <Cell label="Joined">
                    <When at={member.joinedAt} />
                  </Cell>
                  <Cell label="Last around">{member.here ? <Now label="On the floor" /> : <When at={member.lastActiveAt} />}</Cell>
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

/** Someone on a floor right now, said in green rather than as a time. */
function Now({ label = "Now" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ok">
      <span className="size-1.5 rounded-full bg-ok" />
      {label}
    </span>
  );
}

/** A member row's shape while the office's people are read. */
function MemberSkeleton() {
  const bone = "block animate-pulse rounded-full bg-foreground/[0.07]";
  return (
    <li aria-hidden className={cn("grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 px-3 py-3 md:items-center md:gap-4", MEMBER_COLUMNS)}>
      <span className="col-span-2 flex items-center gap-2.5 md:col-span-1">
        <span className="size-[26px] shrink-0 animate-pulse rounded-full bg-foreground/[0.07]" />
        <span className="flex-1 space-y-1.5">
          <span className={cn(bone, "h-3 w-28")} />
          <span className={cn(bone, "h-2.5 w-40")} />
        </span>
      </span>
      <span className={cn(bone, "hidden h-4 w-14 md:block")} />
      <span className={cn(bone, "hidden h-3 w-20 md:block")} />
      <span className={cn(bone, "hidden h-3 w-16 md:block")} />
      <span className={cn(bone, "hidden h-3 w-16 md:block")} />
    </li>
  );
}

/** How the office has its plan: paid through Creem (and whether that's in trouble), or given by hand. */
function PlanState({ office }: { office: AdminOffice }) {
  if (office.billing === "past_due") return <Badge>card failed</Badge>;
  if (office.billing && office.cancelAt) return <Badge>cancelling</Badge>;
  if (office.billing) return <Badge>paid</Badge>;
  if (office.plan !== "free") return <Badge>given</Badge>;
  return null;
}

/**
 * The things that change an office, kept out of the way on purpose: behind a
 * menu, and the two that matter (a plan without payment, closing it) only
 * once the office's name has been typed out. A plan can't be given while the
 * office pays through Creem, and a plan that still renews has to be
 * cancelled before the office can close.
 */
function OfficeManage({ office, onChanged }: { office: AdminOffice; onChanged: () => void }) {
  const [asking, setAsking] = useState<"rename" | "plan" | "close" | null>(null);
  const [name, setName] = useState(office.name);
  const [plan, setPlan] = useState<PlanId>(office.plan as PlanId);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paid = !!office.billing;
  const confirmed = typed.trim() === office.name;

  const ask = (what: "rename" | "plan" | "close") => {
    setName(office.name);
    setPlan(office.plan as PlanId);
    setTyped("");
    setError(null);
    setAsking(what);
  };
  const close = () => setAsking(null);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      close();
      onChanged();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const typeToConfirm = (
    <label className="mt-4 block">
      <span className="text-[12.5px] text-muted-foreground">
        Type <span className="font-semibold text-foreground">{office.name}</span> to confirm
      </span>
      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-border-strong"
      />
    </label>
  );

  return (
    <>
      <Menu
        align="end"
        width={220}
        trigger={
          <button
            type="button"
            aria-label={`Manage ${office.name}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        }
      >
        <MenuItem icon={<Pencil />} onSelect={() => ask("rename")}>
          Rename
        </MenuItem>
        <MenuItem disabled={paid} onSelect={() => ask("plan")} hint={paid ? "Pays through Creem" : undefined}>
          Change plan without payment
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger icon={<Trash2 />} onSelect={() => ask("close")}>
          Close office
        </MenuItem>
      </Menu>

      <Dialog
        open={asking === "rename"}
        onClose={close}
        title="Rename office"
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton solid disabled={busy || !name.trim() || name.trim() === office.name} onClick={() => run(() => api.adminUpdateOffice(office.id, { name }))}>
              Save
            </DialogButton>
          </>
        }
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={48}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-border-strong"
        />
        {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
      </Dialog>

      <Dialog
        open={asking === "plan"}
        onClose={close}
        title="Change plan without payment"
        description="The office gets the plan's seats and meeting hours at once, and nobody is charged. Use it for friends, partners and support cases."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton solid disabled={busy || !confirmed || plan === office.plan} onClick={() => run(() => api.adminUpdateOffice(office.id, { plan }))}>
              Change plan
            </DialogButton>
          </>
        }
      >
        <div role="radiogroup" aria-label="Plan" className="flex h-10 items-center rounded-full bg-muted p-1">
          {(["free", "plus", "pro"] as PlanId[]).map((one) => (
            <button
              key={one}
              type="button"
              role="radio"
              aria-checked={plan === one}
              onClick={() => setPlan(one)}
              className={cn(
                "h-8 flex-1 cursor-pointer rounded-full text-[13px] font-medium transition-colors",
                plan === one ? "bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {planName(one)}
              {office.plan === one && <span className="text-muted-foreground"> · now</span>}
            </button>
          ))}
        </div>
        {typeToConfirm}
        {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
      </Dialog>

      <Dialog
        open={asking === "close"}
        onClose={close}
        title={`Close ${office.name}?`}
        description="Its floor, chat, members and invite link go now, for everyone in it. A plan that still renews has to be cancelled first; one already cancelled ends straight away. This can't be undone."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton danger disabled={busy || !confirmed} onClick={() => run(() => api.adminDeleteOffice(office.id))}>
              Close office
            </DialogButton>
          </>
        }
      >
        {typeToConfirm}
        {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
    </>
  );
}

/** Seats taken out of the office's seats, with a small meter that warms up as it fills. */
function Seats({ used, seats }: { used: number; seats: number }) {
  const share = seats > 0 ? Math.min(1, used / seats) : 0;
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="tabular-nums">
        {used}
        <span className="text-muted-foreground"> / {seats}</span>
      </span>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full rounded-full", share >= 1 ? "bg-brand" : "bg-foreground/60")} style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  );
}

/* ---------- Lobby chat ---------- */

type LobbyMessage = LobbyChatPage["messages"][number];

/** The lobby's channels as they are now. Any message can be changed or taken down, and people see it at once. */
function LobbyChat({ round }: { round: number }) {
  const [channel, setChannel] = useState("general");
  const [page, setPage] = useState<LobbyChatPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (open: string, before?: number) => {
    setBusy(true);
    setError("");
    try {
      const next = await api.adminLobbyChat(open, before);
      // Older messages go above the ones already shown.
      setPage((current) => (before && current ? { ...next, messages: [...next.messages, ...current.messages] } : next));
    } catch {
      setError("Couldn't load the lobby's chat.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // Each channel's newest page, when it's picked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(channel);
  }, [load, channel, round]);

  const change = (seq: number, next: LobbyMessage | null) =>
    setPage(
      (current) =>
        current && {
          ...current,
          channels: next ? current.channels : current.channels.map((one) => (one.id === current.channel ? { ...one, messages: one.messages - 1 } : one)),
          messages: next ? current.messages.map((one) => (one.seq === seq ? next : one)) : current.messages.filter((one) => one.seq !== seq),
        },
    );

  return (
    <section>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {(page?.channels ?? [{ id: channel, messages: 0, lastAt: null }]).map((one) => (
          <button
            key={one.id}
            type="button"
            onClick={() => setChannel(one.id)}
            className={cn(
              "flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              one.id === channel ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-border-strong",
            )}
          >
            #{one.id}
            <span className={cn("tabular-nums", one.id === channel ? "text-background/60" : "text-muted-foreground")}>{one.messages}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        {page === null ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader variant="dots" size={18} />
          </div>
        ) : page.messages.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-muted-foreground">Nothing in #{page.channel} this week.</p>
        ) : (
          <>
            {page.more && (
              <div className="flex justify-center border-b border-border py-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => load(channel, page.messages[0]?.seq)}
                  className="h-8 cursor-pointer rounded-full bg-muted px-4 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-50"
                >
                  {busy ? "Loading" : "Show older"}
                </button>
              </div>
            )}
            <ol className="divide-y divide-border">
              {page.messages.map((message) => (
                <ModeratedMessage key={message.seq} message={message} onChange={(next) => change(message.seq, next)} />
              ))}
            </ol>
          </>
        )}
      </div>
      {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
    </section>
  );
}

function ModeratedMessage({ message, onChange }: { message: LobbyMessage; onChange: (next: LobbyMessage | null) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (err) {
      // Already gone: its author unsent it, or its week ran out.
      if (err instanceof ApiError && err.status === 404) onChange(null);
      else setError("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const body = (editing ?? "").trim();
      if (body && body !== message.body) {
        await api.adminEditLobbyMessage(message.seq, body);
        onChange({ ...message, body, edited: Date.now() });
      }
      setEditing(null);
    });

  const takeDown = () =>
    run(async () => {
      await api.adminDeleteLobbyMessage(message.seq);
      onChange(null);
    });

  return (
    <li className="group flex gap-3 px-4 py-3 [--face-ring:var(--ui-card)]">
      <Face seed={message.author} size={30} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
          <span className="font-semibold text-foreground">{message.authorName}</span>
          <span className="text-muted-foreground">
            <When at={message.at} />
          </span>
          {message.edited && <span className="text-faint">(edited)</span>}
        </p>
        {editing !== null ? (
          <form
            className="mt-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <textarea
              autoFocus
              value={editing}
              rows={Math.min(6, Math.max(2, editing.split("\n").length))}
              onChange={(event) => setEditing(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setEditing(null)}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[16px] outline-none focus:border-foreground/35 sm:text-[13.5px]"
            />
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="submit"
                disabled={busy}
                className="h-8 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-8 cursor-pointer rounded-full px-3.5 text-[12.5px] text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-foreground/90">
            {message.body}
          </p>
        )}
        {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
      </div>
      {editing === null && (
        <div className="flex shrink-0 items-start gap-1 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit"
            title="Edit"
            onClick={() => setEditing(message.body)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          {confirming ? (
            <button
              type="button"
              autoFocus
              disabled={busy}
              onBlur={() => setConfirming(false)}
              onClick={takeDown}
              className="h-8 cursor-pointer rounded-lg bg-destructive px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
            >
              Take down
            </button>
          ) : (
            <button
              type="button"
              aria-label="Take down"
              title="Take down"
              onClick={() => setConfirming(true)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/* ---------- Small pieces ---------- */

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{children}</span>;
}

/** A country as its letters and name, in the page's language. (Flag emoji don't draw on Windows.) */
function Country({ code }: { code: string }) {
  const locale = useLocale();
  const name = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
    } catch {
      return code;
    }
  }, [code, locale]);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden className="rounded-[5px] bg-muted px-1 py-px text-[10.5px] font-semibold tabular-nums text-muted-foreground">
        {code}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
