"use client";

import { useSyncExternalStore } from "react";
import { api, type Reports } from "./api";

/** Looked at again when you come back to the tab, but not more than once a minute. */
const FRESH_MS = 60_000;

interface HelpState {
  open: boolean;
  /** Your reports, once read; null until then. */
  data: Reports | null;
}

const EMPTY: HelpState = { open: false, data: null };

/**
 * Help and feedback (docs/19), shared by the rail's button, your menu on a
 * phone and the dialog itself: whether it's open, and your reports with how
 * many have a reply you haven't seen.
 */
class Help {
  private state: HelpState = EMPTY;
  private listeners = new Set<() => void>();
  private readAt = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;

  /** Reads your reports, unless they were read a moment ago. */
  async refresh(force = false) {
    if (!force && Date.now() - this.readAt < FRESH_MS) return;
    this.readAt = Date.now();
    try {
      this.take(await api.reports());
    } catch {
      // Nothing to show is fine: the dialog still sends.
    }
  }

  /** What the API said after a change: the list as it is now. */
  take(data: Reports) {
    this.set({ data });
  }

  /**
   * Opened: what was news is seen now. It stays marked while the dialog is
   * open, so a reply can be found, and is let go of when it closes.
   */
  open() {
    this.set({ open: true });
    void this.refresh(true).then(() => {
      if (!this.state.data?.unseen) return;
      this.set({ data: { ...this.state.data, unseen: 0 } });
      api.reportsSeen().catch(() => undefined);
    });
  }

  close() {
    const data = this.state.data;
    this.set({
      open: false,
      // A closed report, now seen closed, goes; the rest stay, nothing new on them.
      data: data && {
        unseen: 0,
        reports: data.reports.filter((one) => one.status === "open").map((one) => ({ ...one, news: false })),
      },
    });
  }

  /** Signed out or gone elsewhere: nothing of yours stays behind. */
  forget() {
    this.readAt = 0;
    this.set(EMPTY);
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
