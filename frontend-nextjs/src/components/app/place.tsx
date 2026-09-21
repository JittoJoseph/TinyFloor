"use client";

import { createContext, useContext } from "react";

/**
 * Where you are: an office, or the public lobby. Chat, People and Settings are
 * the same screens in both, so they read what they need from here rather than
 * from an office. The lobby shows everything an office has; what only an
 * office can do asks for one instead (see `officesOnly`).
 */
export interface PlacePerson {
  id: string;
  displayName: string;
  email?: string | null;
  role?: "admin" | "member";
  joinedAt?: number;
}

/** What an office adds, named so the lobby can say which one you reached for. */
export type OfficeFeature = "channels" | "directMessages" | "attachments" | "invites";

export interface Place {
  /** A visit is someone in on a guest link: the floor and their own settings, nothing else. */
  kind: "office" | "lobby" | "visit";
  /** The office's id, or "lobby". */
  id: string;
  name: string;
  /** Your part here. A lobby visitor is a guest, signed in or not. */
  role: "admin" | "member" | "guest";
  /** An office's members; in the lobby, whoever is on its floor right now. */
  people: PlacePerson[];
  plan?: string;
  owner?: string;
  paths: {
    floor: string;
    chat: (channel?: string) => string;
    people: string;
    settings: string;
    /** The lobby's page about getting an office of your own. */
    yourOffice?: string;
  };
  /** The link worth sharing to bring someone here. */
  sharePath: string;
  /** In the lobby: explain that this needs an office, and offer to make one. */
  officesOnly: (feature: OfficeFeature) => void;
}

const Context = createContext<Place | null>(null);

export const PlaceProvider = Context.Provider;

export function usePlace(): Place {
  const value = useContext(Context);
  if (!value) throw new Error("usePlace outside a shell");
  return value;
}
