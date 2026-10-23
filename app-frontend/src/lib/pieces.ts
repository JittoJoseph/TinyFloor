import { useSyncExternalStore } from "react";
import type { PieceChange, PieceChanges } from "@shared/office";

/**
 * What people have made of their desks in this office (docs/customization.md),
 * as the room says: one change per piece, by its key. The floor draws from
 * it, decorating reads and adds to it. A change you make shows at once and
 * the room confirms it; if the room says no, it sends the office's pieces as
 * they are and those replace whatever was guessed.
 */
let changes: PieceChanges = {};
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const pieceChanges = () => changes;

export function subscribePieces(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePieceChanges(): PieceChanges {
  return useSyncExternalStore(subscribePieces, pieceChanges, pieceChanges);
}

/** All of them, as the room has them: on arriving, and when many change at once. */
export function setPieceChanges(next: PieceChanges) {
  changes = next;
  notify();
}

/** One piece changed (null: back as the floor has it). */
export function applyPieceChange(key: string, change: PieceChange | null) {
  const next = { ...changes };
  if (change) next[key] = change;
  else delete next[key];
  changes = next;
  notify();
}
