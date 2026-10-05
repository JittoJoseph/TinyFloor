"use client";

import { useSyncExternalStore } from "react";
import { api, type HelpConversation } from "./api";

/** Read again when you come back to the tab, but not more often than this. */
const FRESH_MS = 60_000;

interface HelpState {
  open: boolean;
  /** The conversation, once read; null until then. */
  conversation: HelpConversation | null;
}

const EMPTY: HelpState = { open: false, conversation: null };

/**
 * Help and feedback (docs/19), shared by the rail's button, your menu on a
 * phone and the dialog: whether it's open, and the conversation with the team
 * for the place you're in, with how many messages are new to you. It is read
 * by asking: often while the dialog is open, now and then while it isn't.
 */
class Help {
  private state: HelpState = EMPTY;
  private listeners = new Set<() => void>();
  /** The office whose conversation this is; undefined in the demo office. */
  private office: string | undefined;
  private readAt = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;

  /** Walked into a place: its conversation, from the start. */
  attach(office: string | undefined) {
    this.office = office;
    this.readAt = 0;
    this.set(EMPTY);
    void this.refresh(true);
  }

  /** Reads the conversation, unless it was read a moment ago. Open, what's new is seen at once. */
  async refresh(force = false) {
    if (!force && Date.now() - this.readAt < FRESH_MS) return;
    this.readAt = Date.now();
    const office = this.office;
    try {
      const conversation = await api.help(office);
      if (office !== this.office) return;
      this.take(conversation);
    } catch {
      // Nothing to show is fine: the dialog still sends.
    }
  }

  /** What the API said: the conversation as it is now. */
  take(conversation: HelpConversation) {
    if (this.state.open && conversation.unread) {
      api.helpRead(this.office).catch(() => undefined);
      conversation = { ...conversation, unread: 0 };
    }
    this.set({ conversation });
  }

  /** Something to the team; the conversation comes back with it. */
  async say(body: string, context: { page: string; locale: string; screen: string; replay: string | null }) {
    this.take(await api.sayToHelp({ body, ...(this.office ? { office: this.office } : {}), ...context }));
  }

  open() {
    this.set({ open: true });
    void this.refresh(true);
  }

  close() {
    this.set({ open: false });
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
