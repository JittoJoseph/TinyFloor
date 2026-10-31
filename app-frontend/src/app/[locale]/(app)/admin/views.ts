import type { AdminSummary } from "@/lib/api";

export type View = "overview" | "inbox" | "people" | "offices" | "lobby";
export const VIEWS: View[] = ["overview", "inbox", "people", "offices", "lobby"];

/** Where the admin view is: a view, and what's picked in it. */
export const adminPath = (view: View, id?: string | null) => `/admin?${new URLSearchParams({ view, ...(id ? { id } : {}) })}`;

/** What every list view is given: what's picked, and the way to pick something here or anywhere else. */
export interface ViewProps {
  summary: AdminSummary;
  picked: string | null;
  pick: (id: string | null) => void;
  open: (view: View, id: string) => void;
  /** The counts again, after a change that moves them. */
  recount: () => void;
}
