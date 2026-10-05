"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { api, type AdminHelpDetail, type AdminHelpTicket, type AdminPage } from "@/lib/api";
import { Face } from "@/components/ui/Face";
import { Logo } from "@/components/app/Logo";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";
import { When } from "./when";

type Status = "open" | "closed";
/** Read again while the tab is open, so new messages turn up without a reload. */
const EVERY_MS = 20_000;

/**
 * Help and feedback (docs/19), as the team sees it: open tickets (an
 * office has at most one) and closed ones, unread counts on each, and one
 * ticket at a time beside the list. Where it was opened from (page, browser,
 * the PostHog recording) is said once, at the top. A reply shows in their
 * Chat as unread; closing it takes it out of their Chat.
 */
export function Help({ onUnread }: { onUnread: (count: number) => void }) {
  const [status, setStatus] = useState<Status>("open");
  const [page, setPage] = useState(0);
  const [list, setList] = useState<(AdminPage & { tickets: AdminHelpTicket[] }) | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await api.adminHelp({ status, page });
      setList(next);
      if (status === "open") onUnread(next.tickets.reduce((sum, one) => sum + one.unread, 0));
      setError("");
    } catch {
      setError("Couldn't load the tickets.");
    }
  }, [status, page, onUnread]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), EVERY_MS);
    return () => clearInterval(timer);
  }, [load]);

  const show = (next: Status) => {
    setStatus(next);
    setPage(0);
    setPicked(null);
    setList(null);
  };
  const ticket = list?.tickets.find((one) => one.id === picked) ?? null;
  const pages = list ? Math.ceil(list.total / list.pageSize) : 0;

  return (
    <section>
      <div className="flex gap-1.5">
        {(["open", "closed"] as const).map((one) => (
          <button
            key={one}
            type="button"
            onClick={() => show(one)}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium capitalize transition-colors",
              one === status ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-border-strong",
            )}
          >
            {one}
            {one === status && list && <span className="tabular-nums text-background/60">{list.total}</span>}
          </button>
        ))}
      </div>

      {list === null ? (
        <div className="mt-4 flex justify-center rounded-2xl border border-border bg-card py-16 text-muted-foreground">
          {error ? <p className="text-[13px] text-destructive">{error}</p> : <Loader variant="dots" size={18} />}
        </div>
      ) : list.tickets.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          {status === "open" ? "No open tickets." : "No closed tickets yet."}
        </p>
      ) : (
        <div className="mt-4 grid items-start gap-3 md:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]">
            <ol>
              {list.tickets.map((one) => (
                <li key={one.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setPicked(one.id)}
                    className={cn("flex w-full cursor-pointer gap-3 px-3.5 py-3 text-start transition-colors", one.id === picked ? "bg-muted" : "hover:bg-muted/60")}
                  >
                    <Face seed={one.officeId ?? one.id} size={30} square={!one.lobby} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={cn("truncate text-[13.5px]", one.unread ? "font-semibold" : "font-medium")}>{one.place}</span>
                        <span className="ms-auto shrink-0 text-[11.5px] text-faint">
                          <When at={one.updatedAt} />
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">{one.last}</span>
                        {one.unread > 0 && (
                          <span className="min-w-[20px] shrink-0 rounded-full bg-foreground px-1.5 text-center text-[11px] font-semibold leading-5 text-background tabular-nums">
                            {one.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[12.5px]">
                <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40">
                  Newer
                </button>
                <span className="tabular-nums text-faint">
                  {page + 1} of {pages}
                </span>
                <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40">
                  Older
                </button>
              </div>
            )}
          </div>

          {ticket ? (
            <Ticket key={ticket.id} id={ticket.id} unread={ticket.unread} updatedAt={ticket.updatedAt} onChanged={load} />
          ) : (
            <p className="hidden rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground md:block">Pick a ticket.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** One ticket: who opened it and from where, said once; the conversation; a reply; closing it. Opening it reads it. */
function Ticket({ id, unread, updatedAt, onChanged }: { id: string; unread: number; updatedAt: number; onChanged: () => Promise<void> }) {
  const [detail, setDetail] = useState<AdminHelpDetail | null>(null);
  // What was new when it was opened stays marked while it's open.
  const [fresh] = useState(unread);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Read again when the list says something changed; reading it clears its count there.
  useEffect(() => {
    let live = true;
    api
      .adminHelpTicket(id)
      .then((next) => {
        if (!live) return;
        setDetail(next);
        if (unread > 0) void onChanged();
      })
      .catch(() => live && setError("Couldn't load this ticket."));
    return () => {
      live = false;
    };
  }, [id, unread, updatedAt, onChanged]);

  if (!detail) {
    return (
      <div className="flex justify-center rounded-2xl border border-border bg-card py-16 text-muted-foreground">
        {error ? <p className="text-[13px] text-destructive">{error}</p> : <Loader variant="dots" size={18} />}
      </div>
    );
  }

  const { ticket, messages } = detail;
  const open = ticket.status === "open";
  const text = reply.trim();
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
  const send = (close: boolean) =>
    run(async () => {
      if (text) await api.adminHelpReply(id, text);
      if (close) await api.adminHelpClose(id);
    });
  const theirs = messages.filter((one) => !one.team).slice(-fresh).map((one) => one.id);
  const where = [ticket.userAgent && browserOf(ticket.userAgent), ticket.screen, ticket.locale, ticket.country].filter(Boolean).join(" · ");

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]">
      <header className="border-b border-border px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">
              {ticket.place}
              {!ticket.officeId && !ticket.lobby && <span className="ms-2 text-[12.5px] font-normal text-faint">(office closed)</span>}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              Opened by {ticket.name}
              {ticket.email && (
                <>
                  {" · "}
                  <a href={`mailto:${ticket.email}`} className="hover:text-foreground">
                    {ticket.email}
                  </a>
                </>
              )}
              {" · "}
              <When at={ticket.createdAt} />
              {ticket.closedAt && (
                <>
                  {" · closed "}
                  <When at={ticket.closedAt} />
                </>
              )}
            </p>
          </div>
          {ticket.replay && (
            <a
              href={ticket.replay}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-medium hover:bg-muted"
            >
              PostHog
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        {(where || ticket.page) && (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-faint">
            {where && <span title={ticket.userAgent ?? undefined}>{where}</span>}
            {ticket.page && <code className="break-all">{ticket.page}</code>}
          </p>
        )}
      </header>

      <ol className="space-y-3.5 px-4 py-4">
        {messages.map((message) => (
          <li key={message.id} className="flex gap-3">
            {message.team ? <Logo size={30} className="shrink-0" /> : <Face seed={message.author ?? message.name} size={30} />}
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 text-[12px] text-muted-foreground">
                <span className="text-[13px] font-semibold text-foreground">{message.name}</span>
                <When at={message.at} />
                {fresh > 0 && theirs.includes(message.id) && <span className="font-semibold text-foreground">New</span>}
              </p>
              <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.5] text-foreground/90">
                {message.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {open && (
        <form
          className="border-t border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(false);
          }}
        >
          <textarea
            value={reply}
            rows={Math.min(8, Math.max(2, reply.split("\n").length))}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send(false);
              }
            }}
            placeholder={`Reply to ${ticket.lobby ? ticket.name : `everyone in ${ticket.place}`}. Ctrl+Enter sends.`}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[16px] outline-none focus:border-foreground/35 sm:text-[13.5px]"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button type="submit" disabled={busy || !text} className="h-8 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background disabled:opacity-40">
              Reply
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void send(true)}
              className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
            >
              {text ? "Reply and close" : "Close ticket"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
        </form>
      )}
    </article>
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
