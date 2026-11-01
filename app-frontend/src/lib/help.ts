"use client";

import { useSyncExternalStore } from "react";
import type { HelpNews } from "@shared/chat";
import { api, ApiError, type HelpContext, type HelpTicket, type HelpTicketView } from "@/lib/api";
import { analyticsConfigured, withPostHog } from "@/lib/analytics";

/** Read again when you come back to the tab, but not more often than this. */
const FRESH_MS = 60_000;

export { SUPPORT_CHANNEL } from "@shared/chat";

interface HelpState {
  /** The conversation is on screen, in Chat. */
  shown: boolean;
  /** The open ticket where you are, if there is one. */
  ticket: HelpTicket | null;
  /** The ticket on screen in Chat; it stays, closed, if the team closes it while you're on it. */
  view: HelpTicketView | null;
}

const EMPTY: HelpState = { shown: false, ticket: null, view: null };

/**
 * The conversation with the TinyFloor team where you are (a ticket, to the
 * API). It's in Chat, like any conversation: the rail's "?" opens it, and the
 * first message starts it. The office's chat socket says when the team has
 * written, so its count turns up at once and, with news, the app can say so;
 * it's also read now and then, in case a word was missed while the socket was
 * down.
 */
class Help {
  private state: HelpState = EMPTY;
  private listeners = new Set<() => void>();
  /** The office whose ticket this is; undefined in the demo office. */
  private office: string | undefined;
  private readAt = 0;
  /** Opens the conversation in Chat; given by the place's shell, which knows the way. */
  private toTicket: (() => void) | null = null;
  private hearers = new Set<(news: HelpNews) => void>();

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

  /** The office's chat says the ticket changed (the team wrote, or closed it): read it now, and pass on what the team said. */
  changed(news?: HelpNews) {
    void this.refresh(true);
    if (this.state.view) void this.load(this.state.view.id);
    if (news) for (const hear of this.hearers) hear(news);
  }

  /** Told when the team writes, for a notification (DesktopAlerts). */
  onNews(hear: (news: HelpNews) => void) {
    this.hearers.add(hear);
    return () => void this.hearers.delete(hear);
  }

  goToTicket(go: () => void) {
    this.toTicket = go;
  }

  /** The rail's "?" or the phone menu: the conversation, in Chat. */
  open() {
    this.toTicket?.();
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

  /** On screen, in Chat. */
  show() {
    this.set({ shown: true });
  }

  /** Off screen: a ticket that was closed meanwhile goes with it. */
  leave() {
    this.set({ shown: false, view: null });
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
