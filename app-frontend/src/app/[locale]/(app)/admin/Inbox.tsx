"use client";

import { useCallback, useEffect, useState } from "react";
import { AtSign, Bell, Calendar, ExternalLink, Globe, Inbox as InboxIcon, Language, Link2, Monitor, Office, UserRound } from "web-shared/components/ui/icons";
import { Face } from "web-shared/components/ui/Face";
import { ShellView } from "@/components/app/AppShell";
import { api, type AdminHelpTicket } from "web-shared/lib/api";
import { askToNotify, useNotifyPermission } from "@/lib/notify";
import { startPush } from "@/lib/push";
import { usePrefs } from "@/lib/prefs";
import { Column, Country, DetailHeader, DetailState, Pick, Properties, Property, Row, Section, Short, Tab, usePaged, When } from "./pieces";
import { CloseTicket, Messages, Reply, useTicket } from "./Thread";
import type { ViewProps } from "./views";

type Status = "open" | "closed";
/** Read again while the Inbox is on screen, so new messages turn up without a reload. */
const EVERY_MS = 20_000;

/**
 * The conversations with the team: open ones (an office has at most one) and
 * closed ones, the latest first, with what the team hasn't read, whoever
 * started them. Picked, a conversation and the team's reply (Thread.tsx);
 * beside it, on a wide screen, who started it and from where (browser,
 * language, the PostHog recording). A reply shows in their Chat and notifies
 * them. Closing it takes it out of their Chat, so it's kept in a menu and
 * asks first.
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
      columnClassName="md:w-[360px]"
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
          <Notifications />
          {list.items?.map((one) => (
            <Row
              key={one.id}
              selected={one.id === picked}
              onClick={() => pick(one.id)}
              strong={one.unread > 0}
              lead={<Face seed={one.officeId ?? one.id} size={38} square={!one.lobby} />}
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
  const unread = listed?.unread ?? 0;
  const { detail, failed, reload } = useTicket(id, listed?.updatedAt);
  // Reading it cleared its count: the list says so too.
  useEffect(() => {
    if (detail && unread > 0) void onChanged();
  }, [detail, unread, onChanged]);

  if (!detail) return <DetailState error={failed ? "Couldn't load this ticket." : undefined} />;
  const { ticket, messages } = detail;
  const isOpen = ticket.status === "open";
  const changed = async () => {
    reload();
    await onChanged();
  };

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
              {ticket.userId || ticket.lobby ? ticket.name : "Started by the team"} · <When at={ticket.createdAt} />
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
              {isOpen && <CloseTicket id={id} whose={ticket.lobby ? `${ticket.name}'s` : `${ticket.place}'s`} onClosed={() => void changed()} />}
            </>
          }
        />

        {/* Without room beside it, who wrote from where is one line under the header. */}
        <p className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2 text-[12px] text-muted-foreground empty:hidden md:px-6 xl:hidden">
          {ticket.country && <Country code={ticket.country} />}
          {ticket.email && (
            <a href={`mailto:${ticket.email}`} className="truncate hover:text-foreground">
              {ticket.email}
            </a>
          )}
          {ticket.userAgent && <span title={ticket.userAgent}>{browserOf(ticket.userAgent)}</span>}
          {ticket.screen && <span>{ticket.screen}</span>}
        </p>

        <Messages ticketId={id} messages={messages} seenBefore={detail.seenBefore} reads={detail.reads} onChanged={reload} />
        {isOpen ? (
          <Reply
            placeholder={`Reply to ${ticket.lobby ? ticket.name : `everyone in ${ticket.place}`}`}
            note="Ctrl+Enter sends. It shows in their Chat, and notifies them."
            send={async (text) => {
              await api.adminHelpReply(id, text);
              await changed();
            }}
          />
        ) : (
          <p className="shrink-0 border-t border-border px-4 py-3 text-center text-[12.5px] text-muted-foreground">Closed. A new message from either side starts a new conversation.</p>
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
        {ticket.userAgent && (
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
        )}
      </aside>
    </div>
  );
}

/**
 * Hearing when someone writes, on every device signed in here: this browser
 * subscribed for pushes (the same switch as anywhere in the app), and if it
 * hasn't been asked yet, a way to say yes.
 */
function Notifications() {
  const permission = useNotifyPermission();
  const { desktopNotifications } = usePrefs();
  useEffect(() => {
    if (permission === "granted" && desktopNotifications) void startPush();
  }, [permission, desktopNotifications]);
  if (permission !== "default" && permission !== "denied") return null;
  return (
    <li className="mx-4 my-3 flex items-center gap-3 rounded-[12px] border border-border px-3 py-2.5">
      <Bell className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
        {permission === "denied" ? "Notifications are blocked in this browser's site settings." : "Hear when someone writes, on this device."}
      </span>
      {permission === "default" && (
        <button
          type="button"
          onClick={async () => (await askToNotify()) === "granted" && void startPush()}
          className="h-7 shrink-0 cursor-pointer rounded-full bg-foreground px-3 text-[12px] font-medium text-background"
        >
          Turn on
        </button>
      )}
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
