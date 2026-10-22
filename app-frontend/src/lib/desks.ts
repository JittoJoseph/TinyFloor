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
  /** You can claim a desk here: a member of an office, not a guest, not in the lobby. */
  canClaim: boolean;
  /** A desk you asked to claim while you have another, waiting for you to say yes. */
  asking: number | null;
  /** The desk you just claimed, said once, briefly. */
  claimed: number | null;
}

let state: DeskState = { desks: [], seat: null, ready: false, canClaim: false, asking: null, claimed: null };
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
  if (!sender) set({ desks: [], seat: null, ready: false, asking: null, claimed: null });
}

/** Whether this floor lets you claim desks; the page around it knows who you are here. */
export const setCanClaim = (canClaim: boolean) => state.canClaim !== canClaim && set({ canClaim });

/**
 * Claiming a desk, from the desk itself or the prompt above the dock. A desk
 * is claimed, not moved to: what you made of yours stays with that desk. So
 * with one already, you're asked first, since claiming this one gives yours up.
 */
export function requestClaim(seat: number, me: string) {
  if (!state.canClaim) return;
  const mine = deskOf(state.desks, me);
  if (mine && mine.seat !== seat) return set({ asking: seat });
  confirmClaim(seat);
}

/** Asks the room to make this desk yours (any other is freed); the answer comes back as the desks. */
export function confirmClaim(seat: number) {
  send?.({ t: "desk_claim", seat });
  track("desk_claimed");
  set({ asking: null, claimed: seat });
}

export const cancelClaim = () => state.asking !== null && set({ asking: null });

export const clearClaimed = () => state.claimed !== null && set({ claimed: null });

let goHome: (() => void) | null = null;

/** The floor says how to walk you to your desk, while it's open. */
export const setGoHome = (walk: (() => void) | null) => {
  goHome = walk;
};

/** Walks you to your desk and sits you down, from anywhere on the floor. */
export const goToMyDesk = () => goHome?.();
