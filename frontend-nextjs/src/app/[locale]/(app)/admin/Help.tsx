"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { api, type AdminHelpMessage, type AdminHelpPlace, type AdminHelpTicket } from "@/lib/api";
import { Face } from "@/components/ui/Face";
import { Logo } from "@/components/app/Logo";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";
import { When } from "./when";

/** Read again while the tab is open, so new messages turn up without a reload. */
const EVERY_MS = 20_000;

/**
 * Help and feedback (docs/19), as the team sees it: an inbox. Every office
 * (and demo office visitor) with tickets, unread first; opening one shows
 * its tickets, each a conversation with where every message came from, a
 * reply, and closing it. A reply shows in their Chat as something new.
 */
export function Help({ onUnread }: { onUnread: (count: number) => void }) {
  const [places, setPlaces] = useState<AdminHelpPlace[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPlaces = useCallback(async () => {
    try {
      const { places: next } = await api.adminHelp();
      setPlaces(next);
      onUnread(next.reduce((sum, one) => sum + one.unread, 0));
      setError("");
    } catch {
      setError("Couldn't load Help and feedback.");
    }
  }, [onUnread]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlaces();
    const timer = setInterval(() => document.visibilityState === "visible" && void loadPlaces(), EVERY_MS);
    return () => clearInterval(timer);
  }, [loadPlaces]);

  const place = places?.find((one) => one.key === picked) ?? null;

  if (places === null) {
    return (
      <div className="flex justify-center rounded-2xl border border-border bg-card py-16 text-muted-foreground">
        {error ? <p className="text-[13px] text-destructive">{error}</p> : <Loader variant="dots" size={18} />}
      </div>
    );
  }
  if (places.length === 0) {
    return <p className="rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">Nobody has raised anything yet.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-[18rem_minmax(0,1fr)]">
      <ol className="h-fit overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)] md:sticky md:top-4">
        {places.map((one) => (
          <li key={one.key} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setPicked(one.key)}
              className={cn("flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-start transition-colors", one.key === picked ? "bg-muted" : "hover:bg-muted/60")}
            >
              <Face seed={one.officeId ?? one.key} size={30} square={!one.lobby} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[13.5px]", one.unread ? "font-semibold" : "font-medium")}>
                  {one.lobby ? (one.visitor ?? "Visitor") : one.place}
                </span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  {one.lobby ? "Demo office · " : !one.officeId ? "Office closed · " : ""}
                  {one.open ? `${one.open} open` : "All closed"} · <When at={one.lastAt} />
                </span>
              </span>
              {one.unread > 0 && (
                <span className="min-w-[20px] rounded-full bg-foreground px-1.5 text-center text-[11px] font-semibold leading-5 text-background tabular-nums">
                  {one.unread}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>

      {place ? (
        <Place key={place.key} place={place} onChanged={loadPlaces} />
      ) : (
        <p className="hidden rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground md:block">
          Pick an office to see its tickets.
        </p>
      )}
    </div>
  );
}

/** One place's tickets, open first. Opening it counts as reading everything in it. */
function Place({ place, onChanged }: { place: AdminHelpPlace; onChanged: () => Promise<void> }) {
  const [tickets, setTickets] = useState<AdminHelpTicket[] | null>(null);

  const load = useCallback(async () => {
    const { tickets: next } = await api.adminHelpPlace(place.key);
    setTickets(next);
    if (next.some((one) => one.unread > 0)) {
      await api.adminHelpRead(place.key);
      await onChanged();
    }
  }, [place.key, onChanged]);

  // Read again when something new comes in (the list notices first).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => undefined);
  }, [load, place.lastAt]);

  if (!tickets) {
    return (
      <div className="flex justify-center rounded-2xl border border-border bg-card py-16 text-muted-foreground">
        <Loader variant="dots" size={18} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Ticket key={ticket.id} ticket={ticket} onChanged={() => load().then(onChanged)} />
      ))}
    </div>
  );
}

function Ticket({ ticket, onChanged }: { ticket: AdminHelpTicket; onChanged: () => Promise<void> }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(ticket.status === "open");
  const text = reply.trim();
  const closed = ticket.status === "closed";

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await work();
      setReply("");
      await onChanged();
    } catch {
      setError("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const answer = (close: boolean) =>
    run(async () => {
      if (text) await api.adminHelpReply(ticket.id, text);
      if (close) await api.adminHelpStatus(ticket.id, "closed");
    });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]">
      <button
        type="button"
        onClick={() => setShown((was) => !was)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-start hover:bg-muted/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{ticket.title}</span>
          <span className="block text-[12px] text-muted-foreground">
            Opened <When at={ticket.createdAt} /> · {ticket.messages.length} {ticket.messages.length === 1 ? "message" : "messages"}
          </span>
        </span>
        {ticket.unread > 0 && <span className="text-[11.5px] font-semibold text-foreground">{ticket.unread} new</span>}
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", closed ? "bg-muted text-muted-foreground" : "bg-foreground/[0.07] text-foreground")}>
          {closed ? "Closed" : "Open"}
        </span>
      </button>

      {shown && (
        <div className="space-y-3 border-t border-border p-4">
          <ol className="space-y-3">
            {ticket.messages.map((message) => (
              <Message key={message.id} message={message} fresh={!message.team && message.id > ticket.seenId} />
            ))}
          </ol>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void answer(false);
            }}
          >
            <textarea
              value={reply}
              rows={Math.min(8, Math.max(2, reply.split("\n").length))}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void answer(false);
                }
              }}
              placeholder={closed ? "Reply. They see it once, then it leaves their Chat." : "Reply. They see it in their Chat. Ctrl+Enter sends."}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[16px] outline-none focus:border-foreground/35 sm:text-[13.5px]"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="submit" disabled={busy || !text} className="h-8 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background disabled:opacity-40">
                Reply
              </button>
              {closed ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => api.adminHelpStatus(ticket.id, "open"))}
                  className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
                >
                  Reopen
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void answer(true)}
                  className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
                >
                  {text ? "Reply and close" : "Close issue"}
                </button>
              )}
            </div>
            {error && <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
          </form>
        </div>
      )}
    </article>
  );
}

/** One message, as in Chat: who, when, what; under theirs, where it was written from. */
function Message({ message, fresh }: { message: AdminHelpMessage; fresh: boolean }) {
  const context = [message.userAgent && browserOf(message.userAgent), message.screen, message.locale, message.country].filter(Boolean);
  return (
    <li className="flex gap-3">
      {message.team ? <Logo size={30} className="shrink-0" /> : <Face seed={message.userId ?? message.name} size={30} />}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-muted-foreground">
          <span className="text-[13px] font-semibold text-foreground">{message.name}</span>
          {message.email && (
            <a href={`mailto:${message.email}`} className="hover:text-foreground">
              {message.email}
            </a>
          )}
          <When at={message.at} />
          {fresh && <span className="font-semibold text-foreground">New</span>}
        </p>
        <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.5] text-foreground/90">
          {message.body}
        </p>
        {!message.team && (context.length > 0 || message.page || message.replay) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-faint">
            {context.length > 0 && <span title={message.userAgent ?? undefined}>{context.join(" · ")}</span>}
            {message.page && <code className="break-all">{message.page}</code>}
            {message.replay && (
              <a href={message.replay} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
                Recording
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

/** "Chrome on Windows" from a user agent; the whole string is on hover. */
function browserOf(agent: string): string {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\/|Opera/.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "A browser";
  const system = /Windows/.test(agent)
    ? "Windows"
    : /iPhone|iPad/.test(agent)
      ? "iOS"
      : /Android/.test(agent)
        ? "Android"
        : /Mac OS X/.test(agent)
          ? "macOS"
          : /CrOS/.test(agent)
            ? "ChromeOS"
            : /Linux/.test(agent)
              ? "Linux"
              : null;
  return system ? `${browser} on ${system}` : browser;
}
