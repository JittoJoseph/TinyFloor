"use client";

import { useEffect } from "react";
import { callManager } from "@/lib/CallManager";
import { decorateState } from "@/lib/decorate";
import { ROOM_CONNECTION_EVENT } from "@/lib/RoomSocket";
import { characterCreatorShown } from "@/components/character/creatorOpen";

/** A deploy drops the room before the new app is up: asked again a little after it's back. */
const CHECK_AGAIN_MS = 5 * 60_000;
/** Shown and in use, the page waits until it's been left alone this long. */
const IDLE_MS = 60_000;
/** The page reloaded for this key already: a page that comes back as old as it was doesn't try again. */
const RELOADED_FOR = "tf-reloaded-for";

/**
 * An office or the lobby left open for days keeps up with deploys that change
 * what open pages have to agree on (lib/compat.ts: the floor, its things,
 * characters' parts, how the room talks): it reloads to the new app, but only
 * when that interrupts nothing. Never during a call or a meeting, while
 * something is being typed, a dialog is open, a desk is being decorated or a
 * look changed; and only while the page is hidden, or shown but untouched for
 * a minute. It asks only when the room comes back after a drop (a deploy that
 * matters redeploys the room too) and when the page is looked at again; every
 * other deploy leaves open pages alone.
 */
export function useAppUpdates() {
  useEffect(() => {
    let due: string | null = null;
    let checking = false;
    let lastInput = Date.now();
    let again: ReturnType<typeof setTimeout> | undefined;

    const reloadIfQuiet = () => {
      if (!due || busy()) return;
      if (document.visibilityState !== "hidden" && Date.now() - lastInput < IDLE_MS) return;
      remember(due);
      window.location.reload();
    };

    const check = async () => {
      if (due || checking) return;
      checking = true;
      due = await newer();
      checking = false;
      reloadIfQuiet();
    };

    let dropped = false;
    const onConnection = (event: Event) => {
      const { state } = (event as CustomEvent<{ state: string }>).detail;
      if (state === "reconnecting") dropped = true;
      if (state !== "connected" || !dropped) return;
      dropped = false;
      void check();
      clearTimeout(again);
      again = setTimeout(() => void check(), CHECK_AGAIN_MS);
    };
    const onVisibility = () => (document.visibilityState === "visible" ? void check() : reloadIfQuiet());
    const onInput = () => (lastInput = Date.now());
    // Once there's a new app to go to, the quiet moment is looked for here; nothing is asked of the network.
    const tick = setInterval(reloadIfQuiet, 5_000);

    window.addEventListener(ROOM_CONNECTION_EVENT, onConnection);
    document.addEventListener("visibilitychange", onVisibility);
    for (const type of ["pointerdown", "pointermove", "keydown", "wheel"]) window.addEventListener(type, onInput, { passive: true });
    return () => {
      clearInterval(tick);
      clearTimeout(again);
      window.removeEventListener(ROOM_CONNECTION_EVENT, onConnection);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const type of ["pointerdown", "pointermove", "keydown", "wheel"]) window.removeEventListener(type, onInput);
    };
  }, []);
}

/** The deployed app's key, when it isn't this page's (and this page hasn't already reloaded for it); null otherwise. */
async function newer(): Promise<string | null> {
  try {
    const [{ COMPAT }, response] = await Promise.all([import("./compat"), fetch("/compat.json", { cache: "no-store" })]);
    if (!response.ok) return null;
    const { compat } = (await response.json()) as { compat?: unknown };
    if (typeof compat !== "string" || compat === COMPAT) return null;
    return reloadedFor() === compat ? null : compat;
  } catch {
    return null;
  }
}

/** Whether reloading now would cut something off. */
function busy(): boolean {
  const call = callManager.getSnapshot();
  if (call.meeting || call.peers.length || call.incoming || call.outgoing || call.invite || call.localStream || call.screenStream) return true;
  if (decorateState().desk || characterCreatorShown()) return true;
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return true;
  const active = document.activeElement;
  if ((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) && active.value.trim()) return true;
  if (active instanceof HTMLElement && active.isContentEditable && active.textContent?.trim()) return true;
  return false;
}

function remember(compat: string) {
  try {
    sessionStorage.setItem(RELOADED_FOR, compat);
  } catch {}
}

function reloadedFor(): string | null {
  try {
    return sessionStorage.getItem(RELOADED_FOR);
  } catch {
    return null;
  }
}
