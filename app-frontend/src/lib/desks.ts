import { useSyncExternalStore } from "react";
import type { ClientMessage, Desk } from "@shared/messages";
import { track } from "@/lib/analytics";

/**
 * The office's desks (docs/product.md), in one place for the floor and the page
 * around it: whose desk is whose, as the room says, and the chair you're on
 * now. The room is the only one that decides; this only asks it and listens.
 */
interface DeskState {
  desks: Desk[];
  /** The chair you're sitting on, any chair; null when standing. */
  seat: number | null;
  /** The room has said, since this floor opened. */
  ready: boolean;
}

let state: DeskState = { desks: [], seat: null, ready: false };
const listeners = new Set<() => void>();
let send: ((message: ClientMessage) => void) | null = null;

function set(next: Partial<DeskState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const deskState = () => state;

export function subscribeDesks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDesks(): DeskState {
  return useSyncExternalStore(subscribeDesks, deskState, deskState);
}

/** The room's word on whose desk is whose. */
export const setDesks = (desks: Desk[]) => set({ desks, ready: true });

/** The floor says where you sit. */
export const setMySeat = (seat: number | null) => state.seat !== seat && set({ seat });

/** Whose desk this chair is, if anyone's. */
export const deskAt = (desks: Desk[], seat: number) => desks.find((desk) => desk.seat === seat);

/** This person's desk, if they have one. */
export const deskOf = (desks: Desk[], userId: string) => desks.find((desk) => desk.userId === userId);

/** The floor's socket, while there is one. */
export function attachDesks(sender: ((message: ClientMessage) => void) | null) {
  send = sender;
  if (!sender) set({ desks: [], seat: null, ready: false });
}

/** Asks the room to make this desk yours (any other goes); the answer comes back as the desks. */
export function claimDesk(seat: number) {
  send?.({ t: "desk_claim", seat });
  track("desk_claimed");
}
