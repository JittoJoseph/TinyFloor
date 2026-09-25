"use client";

import { useSyncExternalStore } from "react";
import type { PlayerStatus } from "./types";

export interface FloorPerson {
  id: string;
  name: string;
  status: PlayerStatus;
}

/**
 * Who is on the floor right now, from the floor socket we already hold. Chat
 * and People read presence from here, so showing who is around costs nothing:
 * no second socket, no presence messages of its own.
 */
let people: FloorPerson[] = [];
const listeners = new Set<() => void>();

function set(next: FloorPerson[]) {
  people = next;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("playerListUpdated", (event) =>
    set((event as CustomEvent<FloorPerson[]>).detail.map((one) => ({ ...one }))),
  );
}

/** Asks the floor to walk you over to someone (see GameScene). */
export const WALK_TO_PERSON_EVENT = "walkToPerson";

/**
 * Walk over to someone. The views cover the floor, so the caller shows the
 * floor first; the walk itself waits a frame for the map to be visible.
 */
export function walkToPerson(id: string) {
  requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(WALK_TO_PERSON_EVENT, { detail: { id } })));
}

/** The floor has gone (you left, or the room let go): nobody is known to be there. */
export function clearFloor() {
  set([]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: FloorPerson[] = [];

export function useFloor(): FloorPerson[] {
  return useSyncExternalStore(subscribe, () => people, () => EMPTY);
}

/** Presence by person, for putting a dot on a face. */
export function useFloorStatus(): Map<string, PlayerStatus> {
  const everyone = useFloor();
  return statusCache(everyone);
}

let cachedFor: FloorPerson[] | null = null;
let cached = new Map<string, PlayerStatus>();
function statusCache(everyone: FloorPerson[]) {
  if (cachedFor !== everyone) {
    cachedFor = everyone;
    cached = new Map(everyone.map((one) => [one.id, one.status]));
  }
  return cached;
}

/**
 * Your own status. The floor sends it (GameScene listens for `statusChange`);
 * this only remembers it so your menu and your face can show it.
 */
let mine: PlayerStatus = "available";
const mineListeners = new Set<() => void>();

export function setMyStatus(status: PlayerStatus) {
  if (status === mine) return;
  mine = status;
  window.dispatchEvent(new CustomEvent("statusChange", { detail: { status } }));
  mineListeners.forEach((listener) => listener());
}

/** What you had set before a call made you "in a call", to go back to after it. */
let beforeCall: PlayerStatus | null = null;

/**
 * A call starting or ending: everyone sees "in a call" while it lasts, and
 * whatever you had before once it's over. Your own choices wait until then.
 */
export function setInCall(inCall: boolean) {
  if (inCall) {
    if (mine !== "in_call") beforeCall = mine;
    setMyStatus("in_call");
  } else if (mine === "in_call") {
    setMyStatus(beforeCall ?? "available");
    beforeCall = null;
  }
}

export function useMyStatus(): PlayerStatus {
  return useSyncExternalStore(
    (listener) => {
      mineListeners.add(listener);
      return () => mineListeners.delete(listener);
    },
    () => mine,
    () => "available" as PlayerStatus,
  );
}
