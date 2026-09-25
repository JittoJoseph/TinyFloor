"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, Pencil, Search, Trash2 } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type AdminOffice, type AdminPerson, type AdminSummary, type LobbyChatPage } from "@/lib/api";
import { AppTopBar } from "@/components/app/AppTopBar";
import { Face } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";

/*
 * The admin view, for the team: how many people there are and how many came
 * back, where they come from, who they are, and every office with its members,
 * all read only; and the lobby's chat, where a message can be changed or taken
 * down. The API answers only the admin accounts; everyone else gets a
 * plain "nothing here". In English: it's a tool for the team, not a page.
 */

type Tab = "overview" | "people" | "guests" | "offices" | "lobby";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
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
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-[24px] font-semibold tracking-tight">Admin</h1>
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
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              {tab === "overview" && <Overview summary={summary} />}
              {tab === "people" && <People key="people" guests={false} />}
              {tab === "guests" && <People key="guests" guests />}
              {tab === "offices" && <Offices />}
              {tab === "lobby" && <LobbyChat />}
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
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Signups days={signups} dates={signupDays} />
        <Countries countries={countries} />
      </div>
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

function People({ guests }: { guests: boolean }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<AdminPerson[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  // The search runs once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (before?: number) => {
      setBusy(true);
      try {
        const page = await api.adminPeople({ q: search, guests, before });
        setPeople((current) => (before ? [...(current ?? []), ...page.users] : page.users));
        setMore(page.more);
      } finally {
        setBusy(false);
      }
    },
    [search, guests],
  );

  useEffect(() => {
    // Reset the list to the first page of the new search.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 border-b border-border px-4 py-2.5 text-[12px] font-medium text-muted-foreground md:grid">
            <span>Person</span>
            <span>Country</span>
            <span>Joined</span>
            <span>Last around</span>
            <span>{guests ? "" : "Offices"}</span>
          </div>
          <ul>
            {people.map((person) => (
              <li
                key={person.id}
                className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] md:items-center md:gap-4"
              >
                <span className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1 [--face-ring:var(--ui-card)]">
                  <Face seed={person.id} size={32} />
                  <span className="min-w-0">
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
              </li>
            ))}
          </ul>
        </div>
      )}

      {more && people && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => load(people.at(-1)?.createdAt)}
            className="h-10 cursor-pointer rounded-full bg-muted px-5 text-[13.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-50"
          >
            {busy ? "Loading" : "Show more"}
          </button>
        </div>
      )}
    </section>
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

function Offices() {
  const [offices, setOffices] = useState<AdminOffice[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (before?: number) => {
    setBusy(true);
    try {
      const page = await api.adminOffices(before);
      setOffices((current) => (before ? [...(current ?? []), ...page.offices] : page.offices));
      setMore(page.more);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // The first page, once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (offices === null) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader variant="dots" size={18} />
      </div>
    );
  }
  if (offices.length === 0) return <p className="py-16 text-center text-[13px] text-muted-foreground">No offices yet.</p>;

  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]">
        {/* A table on a wide screen, a list of cards on a phone. */}
        <div className={cn("hidden gap-4 border-b border-border px-4 py-2.5 text-[12px] font-medium text-muted-foreground md:grid", OFFICE_COLUMNS)}>
          <span>Office</span>
          <span>Owner</span>
          <span>Owner&apos;s country</span>
          <span>Seats</span>
          <span>On the floor</span>
          <span>Made</span>
          <span />
        </div>
        <ul>
          {offices.map((office) => (
            <OfficeRow key={office.id} office={office} />
          ))}
        </ul>
      </div>
      {more && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => load(offices.at(-1)?.createdAt)}
            className="h-10 cursor-pointer rounded-full bg-muted px-5 text-[13.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-50"
          >
            {busy ? "Loading" : "Show more"}
          </button>
        </div>
      )}
    </section>
  );
}

const OFFICE_COLUMNS =
  "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_1.75rem]";
const MEMBER_COLUMNS = "md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]";

/** One office: its row, and its members beneath it when opened. */
function OfficeRow({ office }: { office: AdminOffice }) {
  const [open, setOpen] = useState(false);
  const used = office.members.length;
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
          <Face seed={office.name.toLowerCase()} size={32} square />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{office.name}</span>
            <span className="block text-[12px] text-muted-foreground">{office.plan.charAt(0).toUpperCase() + office.plan.slice(1)} plan</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform md:hidden", open && "rotate-180")} />
        </span>
        <Cell label="Owner">
          {office.ownerId ? (
            <span className="flex min-w-0 items-center gap-2">
              <Face seed={office.ownerId} size={22} />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px]">{office.ownerName}</span>
                {office.ownerEmail && <span className="block truncate text-[12px] text-muted-foreground">{office.ownerEmail}</span>}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Gone</span>
          )}
        </Cell>
        <Cell label="Owner's country">
          {office.ownerCountry ? <Country code={office.ownerCountry} /> : <span className="text-muted-foreground">Unknown</span>}
        </Cell>
        <Cell label="Seats">
          <Seats used={used} seats={office.seats} />
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
        <Cell label="Made">
          <When at={office.createdAt} />
        </Cell>
        <span className="hidden justify-end md:flex">
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t border-border bg-foreground/[0.015] px-4 pb-3 pt-1 md:ps-[60px]">
          {/* The same inset as the rows below (their padding and border), so each heading sits over its column. */}
          <div className={cn("hidden gap-4 px-[13px] py-2 text-[11.5px] font-medium text-muted-foreground md:grid", MEMBER_COLUMNS)}>
            <span>Member</span>
            <span>Role</span>
            <span>Country</span>
            <span>Joined</span>
            <span>Last around</span>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {office.members.map((member) => (
              <li key={member.id} className={cn("grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2.5 md:items-center md:gap-4", MEMBER_COLUMNS)}>
                <span className="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1">
                  <Face seed={member.id} size={26} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium">{member.displayName}</span>
                    {member.email && <span className="block truncate text-[12px] text-muted-foreground">{member.email}</span>}
                  </span>
                </span>
                <Cell label="Role">
                  <Badge>{member.role}</Badge>
                </Cell>
                <Cell label="Country">{member.country ? <Country code={member.country} /> : <span className="text-muted-foreground">Unknown</span>}</Cell>
                <Cell label="Joined">
                  <When at={member.joinedAt} />
                </Cell>
                <Cell label="Last around">
                  <When at={member.lastActiveAt} />
                </Cell>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
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
function LobbyChat() {
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
  }, [load, channel]);

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

/** The time the view was opened, so "how long ago" holds still while it's read. */
function useOpenedAt() {
  return useState(() => Date.now())[0];
}

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

/** How long ago, in words, with the exact time on hover. */
function When({ at }: { at: number }) {
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
  return <time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString(locale)}>{text}</time>;
}
