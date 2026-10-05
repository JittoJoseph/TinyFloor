"use client";

import { useSyncExternalStore } from "react";
import { api, ApiError, type HelpContext, type HelpTicket, type HelpTicketView } from "./api";
import { analyticsConfigured, withPostHog } from "./analytics";

/** Read again when you come back to the tab, but not more often than this. */
const FRESH_MS = 60_000;

/** A ticket's address in Chat: `/chat/help-<id>`, beside channels and direct messages. */
export const TICKET_PREFIX = "help-";
export const ticketChannel = (id: string) => `${TICKET_PREFIX}${id}`;
export const ticketOf = (channel: string | undefined) => (channel?.startsWith(TICKET_PREFIX) ? channel.slice(TICKET_PREFIX.length) : null);

interface HelpState {
  /** The rail's box for a new issue is open. */
  composing: boolean;
  /** The tickets where you are, once read; null until then. */
  tickets: HelpTicket[] | null;
  /** New messages across them: added to Chat's count on the rail. */
  unread: number;
  /** The ticket on screen in Chat. */
  view: HelpTicketView | null;
}

const EMPTY: HelpState = { composing: false, tickets: null, unread: 0, view: null };

/**
 * Help and feedback (docs/19): issues raised with the TinyFloor team. The
 * rail opens a box to raise one; each becomes a ticket in Chat, below the
 * direct messages, until the team closes it. Everything is read by asking:
 * often while a ticket is on screen, now and then otherwise.
 */
class Help {
  private state: HelpState = EMPTY;
  private listeners = new Set<() => void>();
  /** The office whose tickets these are; undefined in the demo office. */
  private office: string | undefined;
  private readAt = 0;
  /** The ticket on screen: never unread, whatever a list read a moment earlier says. */
  private viewing: string | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;

  /** Walked into a place: its tickets, from the start. */
  attach(office: string | undefined) {
    this.office = office;
    this.readAt = 0;
    this.set(EMPTY);
    void this.refresh(true);
  }

  /** Reads the tickets, unless they were read a moment ago. */
  async refresh(force = false) {
    if (!force && Date.now() - this.readAt < FRESH_MS) return;
    this.readAt = Date.now();
    const office = this.office;
    try {
      const { tickets } = await api.helpTickets(office);
      if (office === this.office) this.list(tickets);
    } catch {
      // Nothing to show is fine: raising an issue still works.
    }
  }

  compose(open: boolean) {
    this.set({ composing: open });
  }

  /** A new issue; its ticket's id, to open it in Chat. */
  async raise(body: string): Promise<string> {
    const { id, tickets } = await api.openTicket({ body, ...(this.office ? { office: this.office } : {}), ...(await context()) });
    this.list(tickets);
    return id;
  }

  /** The ticket on screen, read again: what's new in it is seen now. False when it isn't there for you. */
  async load(id: string): Promise<boolean> {
    this.viewing = id;
    const before = this.state.view?.ticket.id === id ? this.state.view.messages.at(-1)?.id : undefined;
    try {
      const view = await api.helpTicket(id);
      if (this.viewing !== id) return true;
      this.set({ view });
      if (view.messages.at(-1)?.id !== before && !view.messages.at(-1)?.mine) api.readTicket(id).catch(() => undefined);
      return true;
    } catch (error) {
      // Gone, or not ours, says the view; a dropped connection just waits for the next look.
      return !(error instanceof ApiError && error.status === 404);
    }
  }

  /** Off screen: the next ticket starts empty rather than showing this one. */
  leave() {
    this.viewing = null;
    this.set({ view: null });
  }

  async say(id: string, body: string) {
    try {
      this.set({ view: await api.sayInTicket(id, { body, ...(await context()) }) });
      void this.refresh(true);
    } catch (error) {
      // Closed while you were writing: show it closed.
      if (error instanceof ApiError && error.status === 409) void this.load(id);
      throw error;
    }
  }

  private list(tickets: HelpTicket[]) {
    const shown = tickets.map((one) => {
      if (one.id !== this.viewing || !one.unread) return one;
      // On screen but counted: it came in since the last look, so it's read now.
      api.readTicket(one.id).catch(() => undefined);
      return { ...one, unread: 0 };
    });
    this.set({ tickets: shown, unread: shown.reduce((sum, one) => sum + one.unread, 0) });
  }

  private set(next: Partial<HelpState>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
}

export const help = new Help();

export function useHelp(): HelpState {
  return useSyncExternalStore(help.subscribe, help.getSnapshot, help.getServerSnapshot);
}

/** Where a message was written from, so the team can look into it without asking. */
async function context(): Promise<HelpContext> {
  return {
    page: window.location.pathname,
    locale: document.documentElement.lang,
    screen: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    replay: await replayLink(),
  };
}

/** This moment in PostHog's recording, if it's recording, so the team can watch what happened. */
function replayLink(): Promise<string | null> {
  if (!analyticsConfigured) return Promise.resolve(null);
  return new Promise((resolve) => {
    const late = setTimeout(() => resolve(null), 1000);
    withPostHog((posthog) => {
      clearTimeout(late);
      try {
        resolve(posthog.get_session_replay_url({ withTimestamp: true, timestampLookBack: 60 }) || null);
      } catch {
        resolve(null);
      }
    });
  });
}
