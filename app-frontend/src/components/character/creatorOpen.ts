import { useSyncExternalStore } from "react";
import { did } from "@/lib/settle";
import { preloadCharacters } from "web-shared/lib/characterSheet";
import { CHARACTER_CATALOG, PRESETS } from "shared-protocol/character";

/**
 * Whether the creator is open, and the ways to open it, kept apart from the
 * creator itself: that's only fetched once it's about to open (pointed at, or
 * once the floor is in), so no page waits on it to show.
 */
let shown = false;
/** Counts asks to open and close, so a close while the creator loads isn't undone when it arrives. */
let opening = 0;
const listeners = new Set<() => void>();
const setShown = (value: boolean) => {
  shown = value;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

type CreatorModule = typeof import("./CharacterCreator");
let loaded: CreatorModule | null = null;

export const loadCharacterCreator = () =>
  import("./CharacterCreator").then((module) => {
    loaded = module;
    return module;
  });

/** The creator's code, once it's here: drawn straight away, without a lazy component's empty first frame. */
export const loadedCharacterCreator = () => loaded;

/** The creator's height, its own and the frame's while it draws, so the dialog never opens at a sliver. */
export const CREATOR_HEIGHT = "h-[min(88dvh,46rem)] sm:h-[min(40rem,calc(100dvh-3rem))]";

/** Starts loading the creator and its characters, for a creator about to open: it then opens without waiting on them. */
export const warmCharacterCreator = () => {
  void loadCharacterCreator().catch(() => {});
  preloadCharacters([...PRESETS, ...CHARACTER_CATALOG.starts]);
};

/**
 * Opens the creator, from anywhere (your card on the floor, your profile),
 * once its code is here: the dialog comes in whole, never as an empty frame
 * that then fills. Usually it's here already (warmed as the floor came in).
 */
export const openCharacterCreator = () => {
  warmCharacterCreator();
  const asked = ++opening;
  void loadCharacterCreator()
    .catch(() => {})
    .then(() => {
      if (asked === opening) setShown(true);
    });
  // Found: settling in needn't point at it again, saved or not (lib/settle).
  did("look");
};

export const closeCharacterCreator = () => {
  // A close while it was still loading: it doesn't open after all.
  opening += 1;
  setShown(false);
};

/** Whether it's open, outside React. */
export const characterCreatorShown = () => shown;

export const useCharacterCreatorShown = () =>
  useSyncExternalStore(
    subscribe,
    () => shown,
    () => false,
  );
