"use client";

import { useCallback, useEffect, useState } from "react";
import { AtSign, Calendar, ExternalLink, Globe, Inbox as InboxIcon, Language, Link2, Monitor, MoreHorizontal, Office, UserRound, X } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face } from "@/components/ui/Face";
import { Logo } from "@/components/app/Logo";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { ShellView } from "@/components/app/AppShell";
import { api, type AdminHelpDetail, type AdminHelpTicket } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Column, Country, DetailHeader, DetailState, DialogButton, Pick, Properties, Property, Row, Section, Short, Tab, usePaged, useRun, When } from "./pieces";
import type { ViewProps } from "./views";

type Status = "open" | "closed";
/** Read again while the Inbox is on screen, so new messages turn up without a reload. */
const EVERY_MS = 20_000;

/**
 * Help and feedback, as the team sees it: open tickets (an office has at most
 * one) and closed ones, the latest first, with what the team hasn't read.
 * Picked, a ticket is its conversation and a reply; beside it, on a wide
 * screen, who opened it and from where (browser, language, the PostHog
 * recording). A reply shows in their Chat as unread. Closing it takes it out
 * of their Chat, so it's kept in a menu and asks first.
 */
export function Inbox({ picked, pick, open, onUnread }: ViewProps & { onUnread: (count: number) => void }) {
  const [status, setStatus] = useState<Status>("open");
  const read = useCallback((page: number) => api.adminHelp({ status, page }).then(({ tickets, ...paging }) => ({ ...paging, items: tickets })), [status]);
  const list = usePaged(read, EVERY_MS);

  // The rail's count follows what the open list says is unread.
  useEffect(() => {
    if (status === "open" && list.items) onUnread(list.items.reduce((sum, one) => sum + one.unread, 0));
  }, [status, list.items, onUnread]);

  const ticket = list.items?.find((one) => one.id === picked);
  return (
    <ShellView
      showDetail={!!picked}
      columnClassName="md:w-[340px]"
      column={
        <Column
          title="Inbox"
          tabs={
            <>
              {(["open", "closed"] as const).map((one) => (
                <Tab key={one} active={status === one} onClick={() => setStatus(one)} count={status === one && list.items ? list.total : undefined}>
                  {one === "open" ? "Open" : "Closed"}
                </Tab>
              ))}
            </>
          }
          loading={list.items === null}
          empty={list.error ? "Couldn't load the tickets." : list.items?.length === 0 && (status === "open" ? "Nothing open. All caught up." : "No closed tickets yet.")}
          more={list.more}
        >
          {list.items?.map((one) => (
            <Row
              key={one.id}
              selected={one.id === picked}
              onClick={() => pick(one.id)}
              strong={one.unread > 0}
              lead={<Face seed={one.officeId ?? one.id} size={36} square={!one.lobby} />}
              title={<span className="truncate">{one.place}</span>}
              sub={one.last || `Opened by ${one.name}`}
              aside={<Short at={one.updatedAt} />}
              below={
                one.unread > 0 ? (
                  <span className="min-w-[20px] rounded-full bg-foreground px-1.5 text-center text-[11px] font-semibold leading-5 text-background tabular-nums">{one.unread}</span>
                ) : undefined
              }
            />
          ))}
        </Column>
      }
    >
      {picked ? (
        <Ticket
          key={picked}
          id={picked}
          listed={ticket}
          onBack={() => pick(null)}
          openPerson={(id) => open("people", id)}
          openOffice={(id) => open("offices", id)}
          onChanged={list.reload}
        />
      ) : (
        <Pick icon={<InboxIcon />} title="Pick a ticket" note="The conversation, and who wrote from where, show here." />
      )}
    </ShellView>
  );
}

/**
 * One ticket: the conversation and a reply, and who opened it from where.
 * Opening it reads it; it's read again when the list says something changed.
 */
function Ticket({
  id,
  listed,
  onBack,
  openPerson,
  openOffice,
  onChanged,
}: {
  id: string;
  listed: AdminHelpTicket | undefined;
  onBack: () => void;
  openPerson: (id: string) => void;
  openOffice: (id: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<AdminHelpDetail | null>(null);
  const [failed, setFailed] = useState(false);
  // What was new when it was opened stays marked while it's open.
  const [fresh] = useState(listed?.unread ?? 0);
  const [reply, setReply] = useState("");
  const [closing, setClosing] = useState(false);
  const { busy, error, run } = useRun();
  const unread = listed?.unread ?? 0;
  const updatedAt = listed?.updatedAt;

  useEffect(() => {
    let live = true;
    api.adminHelpTicket(id).then(
      (next) => {
        if (!live) return;
        setDetail(next);
        // Reading it cleared its count: the list says so too.
        if (unread > 0) void onChanged();
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, unread, updatedAt, onChanged]);

  if (!detail) return <DetailState error={failed ? "Couldn't load this ticket." : undefined} />;
  const { ticket, messages } = detail;
  const isOpen = ticket.status === "open";
  const text = reply.trim();
  const send = async () => {
    if (!text || !(await run(() => api.adminHelpReply(id, text)))) return;
    setReply("");
    await onChanged();
  };
  const theirs = new Set(fresh > 0 ? messages.filter((one) => !one.team).slice(-fresh).map((one) => one.id) : []);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <DetailHeader
          onBack={onBack}
          lead={<Face seed={ticket.officeId ?? ticket.id} size={40} square={!ticket.lobby} />}
          title={
            <>
              {ticket.place}
              {!ticket.officeId && !ticket.lobby && <span className="ms-2 text-[12.5px] font-normal text-faint">(closed office)</span>}
            </>
          }
          sub={
            <>
              {ticket.name} · <When at={ticket.createdAt} />
              {!isOpen && ticket.closedAt && (
                <>
                  {" · closed "}
                  <When at={ticket.closedAt} />
                </>
              )}
            </>
          }
          actions={
            <>
              {ticket.replay && (
                <a
                  href={ticket.replay}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-[12.5px] font-medium transition-colors hover:bg-foreground/[0.08]"
                >
                  Recording
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              {isOpen && (
                <Menu align="end" width={180} trigger={<IconButton label="More" size="sm" tone="soft" icon={<MoreHorizontal />} />}>
                  <MenuItem danger icon={<X />} onSelect={() => setClosing(true)}>
                    Close ticket
                  </MenuItem>
                </Menu>
              )}
            </>
          }
        />

        {/* Without room beside it, who wrote from where is one line under the header. */}
        <p className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2 text-[12px] text-muted-foreground md:px-6 xl:hidden">
          <Country code={ticket.country} />
          {ticket.email && (
            <a href={`mailto:${ticket.email}`} className="truncate hover:text-foreground">
              {ticket.email}
            </a>
          )}
          {ticket.userAgent && <span title={ticket.userAgent}>{browserOf(ticket.userAgent)}</span>}
          {ticket.screen && <span>{ticket.screen}</span>}
        </p>

        <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-6">
          {messages.map((message) => (
            <li key={message.id} className={cn("flex items-end gap-2.5", message.team && "flex-row-reverse")}>
              {message.team ? <Logo size={28} className="shrink-0" /> : <Face seed={message.author ?? message.name} size={28} />}
              <div className={cn("flex max-w-[min(34rem,85%)] flex-col", message.team && "items-end")}>
                <p className="mb-1 flex items-baseline gap-2 px-1 text-[11.5px] text-faint">
                  <span className="font-medium text-muted-foreground">{message.name}</span>
                  <When at={message.at} />
                  {theirs.has(message.id) && <span className="font-semibold text-foreground">New</span>}
                </p>
                <p
                  dir="auto"
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.5]",
                    message.team ? "rounded-ee-md bg-foreground text-background" : "rounded-es-md bg-muted text-foreground",
                  )}
                >
                  {message.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {isOpen ? (
          <form
            className="shrink-0 border-t border-border p-3 md:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="rounded-2xl border border-border bg-background focus-within:border-border-strong">
              <textarea
                value={reply}
                rows={Math.min(8, Math.max(2, reply.split("\n").length))}
                onChange={(event) => setReply(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={`Reply to ${ticket.lobby ? ticket.name : `everyone in ${ticket.place}`}`}
                className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[16px] outline-none placeholder:text-faint sm:text-[13.5px]"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-1">
                <span className="text-[11.5px] text-faint">{error ?? "Ctrl+Enter sends. It shows in their Chat."}</span>
                <button type="submit" disabled={busy || !text} className="h-8 cursor-pointer rounded-full bg-foreground px-4 text-[12.5px] font-medium text-background disabled:opacity-40">
                  Reply
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="shrink-0 border-t border-border px-4 py-3 text-center text-[12.5px] text-muted-foreground">Closed. A new message from them opens a new ticket.</p>
        )}
      </div>

      {/* Who and from where: beside the conversation when there's room for it. */}
      <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-s border-border bg-background px-4 py-5 [--label:6rem] xl:block">
        <Section title="Opened by">
          <Properties>
            <Property icon={<UserRound />} label="Name">
              {ticket.userId ? (
                <button type="button" onClick={() => openPerson(ticket.userId!)} className="cursor-pointer truncate font-medium hover:underline">
                  {ticket.name}
                </button>
              ) : (
                ticket.name
              )}
            </Property>
            {ticket.email && (
              <Property icon={<AtSign />} label="Email">
                <a href={`mailto:${ticket.email}`} className="truncate hover:underline">
                  {ticket.email}
                </a>
              </Property>
            )}
            <Property icon={<Office />} label="From">
              {ticket.officeId ? (
                <button type="button" onClick={() => openOffice(ticket.officeId!)} className="cursor-pointer truncate font-medium hover:underline">
                  {ticket.place}
                </button>
              ) : (
                ticket.place
              )}
            </Property>
            <Property icon={<Globe />} label="Country">
              <Country code={ticket.country} />
            </Property>
          </Properties>
        </Section>
        <Section title="Their screen">
          <Properties>
            <Property icon={<Monitor />} label="Browser">
              <span className="truncate" title={ticket.userAgent ?? undefined}>
                {ticket.userAgent ? browserOf(ticket.userAgent) : "Unknown"}
              </span>
            </Property>
            {ticket.screen && (
              <Property icon={<Monitor />} label="Screen">
                {ticket.screen}
              </Property>
            )}
            {ticket.locale && (
              <Property icon={<Language />} label="Language">
                {ticket.locale}
              </Property>
            )}
            {ticket.page && (
              <Property icon={<Link2 />} label="Page">
                <span className="truncate" title={ticket.page}>
                  {ticket.page}
                </span>
              </Property>
            )}
            <Property icon={<Calendar />} label="Opened">
              <When at={ticket.createdAt} />
            </Property>
          </Properties>
        </Section>
      </aside>

      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close this ticket?"
        description={`It leaves ${ticket.lobby ? `${ticket.name}'s` : `${ticket.place}'s`} Chat, and the next message from there opens a new one. You can still read it under Closed.`}
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={() => setClosing(false)}>Cancel</DialogButton>
            <DialogButton
              danger
              disabled={busy}
              onClick={async () => {
                if (!(await run(() => api.adminHelpClose(id)))) return;
                setClosing(false);
                await onChanged();
                setDetail((now) => now && { ...now, ticket: { ...now.ticket, status: "closed", closedAt: Date.now() } });
              }}
            >
              Close ticket
            </DialogButton>
          </>
        }
      />
    </div>
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
