"use client";

import { useSyncExternalStore } from "react";
import type { PlayerStatus } from "@/lib/types";
import type { StatusNote } from "@shared/messages";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";

export interface FloorPerson {
  id: string;
  name: string;
  status: PlayerStatus;
  /** Their status note, while it lasts. */
  note?: StatusNote | null;
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

/** The room welcomed you and the floor is fading in: what covered it while it loaded can go. */
export const FLOOR_ARRIVED_EVENT = "floorArrived";

let requestedAt = 0;
/** The floor was asked for (it mounted); how long it takes to show is counted from here. */
export function floorRequested() {
  requestedAt = performance.now();
}
export const sinceFloorRequested = () => Math.round(performance.now() - requestedAt);

/** A teammate walked into the office while you were on the floor (docs/product.md). */
export const TEAMMATE_ARRIVED_EVENT = "teammateArrived";
/** Someone on the floor waved at you. */
export const WAVED_AT_YOU_EVENT = "wavedAtYou";
/** Asks the floor to wave at someone (see GameScene). */
export const WAVE_EVENT = "waveAt";

export function waveAt(id: string) {
  window.dispatchEvent(new CustomEvent(WAVE_EVENT, { detail: { id } }));
  track("wave_sent");
}

/** Asks the floor to walk you over to someone (see GameScene). */
export const WALK_TO_PERSON_EVENT = "walkToPerson";

/** Walk over to someone; from a view, `useWalkTo` (place.tsx) shows the floor too. */
export function walkToPerson(id: string) {
  window.dispatchEvent(new CustomEvent(WALK_TO_PERSON_EVENT, { detail: { id } }));
}

/**
 * Whether the floor is on screen rather than under a view (Chat, People,
 * Meetings, Settings). Nothing is drawn while it's covered; the room still
 * runs underneath, so you keep walking, sitting and talking.
 */
let shown = true;
const shownListeners = new Set<(shown: boolean) => void>();

export function setFloorShown(next: boolean) {
  if (next === shown) return;
  shown = next;
  shownListeners.forEach((listener) => listener(shown));
}

/** Told now and on every change; returns the way to stop listening. */
export function onFloorShown(listener: (shown: boolean) => void): () => void {
  shownListeners.add(listener);
  listener(shown);
  return () => shownListeners.delete(listener);
}

/** The floor has gone (you left, or the room let go): nobody is known to be there. */
export function clearFloor() {
  set([]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For the scene: hears whenever who's on the floor, or their status, changes. */
export const subscribeFloor = subscribe;

/** Someone's status if they're on the floor now, or null. */
export const floorStatusOf = (id: string): PlayerStatus | null => people.find((one) => one.id === id)?.status ?? null;

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

export const myStatus = (): PlayerStatus => mine;

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

/**
 * Your status note ("🍜 Lunch, back at 2"). The account keeps it, so it holds
 * across visits; the floor hears a change from your own socket (GameScene
 * listens for `noteChange`), and People reads it from the office.
 */
let myNote: StatusNote | null = null;
const noteListeners = new Set<() => void>();

function changeNote(note: StatusNote | null) {
  myNote = note;
  noteListeners.forEach((listener) => listener());
}

/** The note your account came with: shown, not sent again. */
export function adoptMyNote(note: StatusNote | null) {
  if (JSON.stringify(note) !== JSON.stringify(myNote)) changeNote(note);
}

/** Sets or clears your note: on the floor at once, then kept; put back if keeping it fails. */
export async function saveMyNote(note: StatusNote | null) {
  const before = myNote;
  changeNote(note);
  window.dispatchEvent(new CustomEvent("noteChange", { detail: { note } }));
  try {
    const { status } = await api.setStatusNote(note);
    if (JSON.stringify(status) !== JSON.stringify(note)) {
      changeNote(status);
      window.dispatchEvent(new CustomEvent("noteChange", { detail: { note: status } }));
    }
    track("status_note_set", { cleared: !status, icon: status?.icon ?? null, lasts: !!status?.until });
  } catch (error) {
    changeNote(before);
    window.dispatchEvent(new CustomEvent("noteChange", { detail: { note: before } }));
    throw error;
  }
}

export const myStatusNote = (): StatusNote | null => myNote;

const RENAME_EVENT = "floorRename";

/**
 * Your new name, told to the floor you're on without walking out and back in:
 * the demo office's, after signing up with Google from it (the API has it already).
 */
export function renameOnFloor(name: string) {
  window.dispatchEvent(new CustomEvent(RENAME_EVENT, { detail: { name } }));
}

/** For the scene: hears a new name of yours. */
export function onFloorRename(listener: (name: string) => void): () => void {
  const hear = (event: Event) => listener((event as CustomEvent<{ name: string }>).detail.name);
  window.addEventListener(RENAME_EVENT, hear);
  return () => window.removeEventListener(RENAME_EVENT, hear);
}

const LOOK_EVENT = "floorLook";

/** How you look now, told to the floor you're on (the API has it already): you change over where you are. */
export function changeLookOnFloor(character: string) {
  window.dispatchEvent(new CustomEvent(LOOK_EVENT, { detail: { character } }));
}

/** For the scene: hears a new look of yours. */
export function onFloorLook(listener: (character: string) => void): () => void {
  const hear = (event: Event) => listener((event as CustomEvent<{ character: string }>).detail.character);
  window.addEventListener(LOOK_EVENT, hear);
  return () => window.removeEventListener(LOOK_EVENT, hear);
}

export function useMyNote(): StatusNote | null {
  return useSyncExternalStore(
    (listener) => {
      noteListeners.add(listener);
      return () => noteListeners.delete(listener);
    },
    () => myNote,
    () => null,
  );
}
