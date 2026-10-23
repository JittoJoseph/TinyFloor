import { useSyncExternalStore } from "react";
import { preloadCharacters } from "@/lib/characterSheet";
import { CHARACTER_CATALOG, PRESETS } from "@shared/character";

/**
 * Whether the creator is open, and the ways to open it, kept apart from the
 * creator itself: that's only fetched once it's about to open (pointed at, or
 * once the floor is in), so no page waits on it to show.
 */
let shown = false;
const listeners = new Set<() => void>();
const setShown = (value: boolean) => {
  shown = value;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const loadCharacterCreator = () => import("./CharacterCreator");

/** Starts loading the creator and its characters, for a creator about to open: it then opens without waiting on them. */
export const warmCharacterCreator = () => {
  void loadCharacterCreator().catch(() => {});
  preloadCharacters([...PRESETS, ...CHARACTER_CATALOG.starts]);
};

/** Opens the creator, from anywhere (your card on the floor, your profile). */
export const openCharacterCreator = () => {
  warmCharacterCreator();
  setShown(true);
};

export const closeCharacterCreator = () => setShown(false);

/** Whether it's open, outside React. */
export const characterCreatorShown = () => shown;

export const useCharacterCreatorShown = () =>
  useSyncExternalStore(
    subscribe,
    () => shown,
    () => false,
  );
