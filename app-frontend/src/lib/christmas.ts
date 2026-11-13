"use client";

import { useSyncExternalStore } from "react";
import { lookFrom, lookString, parseLook } from "shared-protocol/character";

/**
 * Christmas on the floor: snow falling (unless you turn it off, Settings), and
 * a pile of presents just outside the building with a Christmas hat in it for
 * whoever walks over. The hat is an ordinary hat of the creator's (hat 20), so
 * once it's on, everyone sees it and it stays until you take it off.
 */

/** The hat in the presents: the creator's hat 20, a Santa hat. */
export const CHRISTMAS_HAT = "20-1";

/** The season: December, and on to Twelfth Night. NEXT_PUBLIC_SEASON=christmas shows it any time (for trying it out). */
export function isChristmas(now = new Date()): boolean {
  if (process.env.NEXT_PUBLIC_SEASON === "christmas") return true;
  const month = now.getMonth();
  return month === 11 || (month === 0 && now.getDate() <= 6);
}

/** Whether this character has the Christmas hat on. */
export const wearsChristmasHat = (character: string): boolean => parseLook(character)?.hat === CHRISTMAS_HAT;

/** The same character in the Christmas hat: a preset becomes the look nearest it, with the hat on. */
export const withChristmasHat = (character: string): string => lookString({ ...lookFrom(character), hat: CHRISTMAS_HAT });

/**
 * Your visit to the presents: a number for each time you walk up to them,
 * nothing while you're away. The scene says, the prompt over the dock
 * listens; "Not now" puts the offer away for this visit only.
 */
let visit = 0;
let visits = 0;
const listeners = new Set<() => void>();

export function setByPresents(near: boolean) {
  if (near === visit > 0) return;
  visit = near ? ++visits : 0;
  listeners.forEach((listener) => listener());
}

export function useByPresents(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => visit,
    () => 0,
  );
}
