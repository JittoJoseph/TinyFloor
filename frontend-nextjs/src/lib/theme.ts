"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

export type ThemeChoice = "system" | "light" | "dark";

const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function prefersDark() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Puts the app's classes on <html> for the current choice. */
export function applyTheme(choice: ThemeChoice = read()) {
  const root = document.documentElement.classList;
  root.add("app");
  root.toggle("dark", choice === "dark" || (choice === "system" && prefersDark()));
}

/** Leaving the app for the landing pages: they have one theme, for now. */
export function clearTheme() {
  document.documentElement.classList.remove("app", "dark");
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Private windows: the choice lasts as long as the page.
  }
  current = choice;
  applyTheme(choice);
  listeners.forEach((listener) => listener());
}

let current: ThemeChoice | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => (current ?? read()) === "system" && applyTheme("system");
  media.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystem);
  };
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    subscribe,
    () => (current ??= read()),
    () => "system",
  );
}
