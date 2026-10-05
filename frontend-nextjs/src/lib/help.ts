"use client";

import { useSyncExternalStore } from "react";
import { api, ApiError, type HelpContext, type HelpTicket, type HelpTicketView } from "./api";
import { analyticsConfigured, withPostHog } from "./analytics";

/** Read again when you come back to the tab, but not more often than this. */
const FRESH_MS = 60_000;

/** The ticket's place in Chat, `/chat/~support`. A channel's name can't hold "~", so it's never one. */
export const SUPPORT_CHANNEL = "~support";

interface HelpState {
  /** The rail's box for telling the team something is open. */
  composing: boolean;
  /** The open ticket where you are, if there is one. */
  ticket: HelpTicket | null;
  /** The ticket on screen in Chat; it stays, closed, if the team closes it while you're on it. */
  view: HelpTicketView | null;
}

const EMPTY: HelpState = { composing: false, ticket: null, view: null };

/**
 * Help and feedback (docs/19): the ticket with the TinyFloor team where you
 * are. With none open, the rail opens a box to start one; with one open, it
 * opens the ticket in Chat. Read by asking: often while the ticket is on
 * screen, now and then otherwise.
 */
class Help {
  private state: HelpState = EMPTY;
  private listeners = new Set<() => void>();
  /** The office whose ticket this is; undefined in the demo office. */
  private office: string | undefined;
  private readAt = 0;
  /** Opens the ticket in Chat; given by the place's shell, which knows the way. */
  private toTicket: (() => void) | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;

  /** Walked into a place: its ticket, from the start. */
  attach(office: string | undefined) {
    this.office = office;
    this.readAt = 0;
    this.set(EMPTY);
    void this.refresh(true);
  }

  /** Is a ticket open here, and is anything in it new? Skipped if asked a moment ago. */
  async refresh(force = false) {
    if (!force && Date.now() - this.readAt < FRESH_MS) return;
    this.readAt = Date.now();
    const office = this.office;
    try {
      const { ticket } = await api.helpOpen(office);
      if (office !== this.office) return;
      // The one on screen is read as it's shown, whatever this says.
      this.set({ ticket: ticket && ticket.id === this.state.view?.id ? { ...ticket, unread: 0 } : ticket });
    } catch {
      // Nothing to show is fine: writing to the team still works.
    }
  }

  compose(open: boolean) {
    this.set({ composing: open });
  }

  goToTicket(go: () => void) {
    this.toTicket = go;
  }

  /** The rail's "?" or the phone menu: the open ticket in Chat, or the box to start one. */
  open() {
    if (!this.state.ticket || !this.toTicket) return this.compose(!this.state.composing);
    this.compose(false);
    this.toTicket();
  }

  /** Something for the team: added to the open ticket, or the start of one (which notes where it came from). */
  async say(body: string) {
    const { id } = await api.sayToHelp({ body, ...(this.office ? { office: this.office } : {}), ...(this.state.ticket ? {} : await context()) });
    this.set({ ticket: { id, unread: 0 } });
    if (this.state.view) await this.load(id);
  }

  /** The ticket on screen, read again (which reads it). False when it isn't there for you. */
  async load(id: string): Promise<boolean> {
    try {
      const view = await api.helpTicket(id);
      this.set({ view, ticket: this.state.ticket?.id === id ? { ...this.state.ticket, unread: 0 } : this.state.ticket });
      return true;
    } catch (error) {
      // A dropped connection just waits for the next look.
      return !(error instanceof ApiError && error.status === 404);
    }
  }

  /** Off screen: a ticket that was closed meanwhile goes with it. */
  leave() {
    this.set({ view: null });
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

/** Where it was written from, so the team can look into it without asking. */
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
