"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { invitePath } from "./links";

/**
 * Each office's one invite link (docs/15): the same for everyone in it, good
 * for as many people as there are seats, until an admin resets it. Read once
 * per office and shared by every button that invites.
 */
const codes = new Map<string, string>();
const loading = new Set<string>();
const listeners = new Set<() => void>();

function changed() {
  listeners.forEach((listener) => listener());
}

function load(officeId: string) {
  if (codes.has(officeId) || loading.has(officeId)) return;
  loading.add(officeId);
  api.inviteLink(officeId).then(
    ({ code }) => {
      loading.delete(officeId);
      codes.set(officeId, code);
      changed();
    },
    () => loading.delete(officeId), // asked again the next time a button needs it
  );
}

/** The office's invite link as a path (/invite/…), or null until it has loaded. */
export function useInviteLink(officeId: string | undefined): string | null {
  const code = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (officeId ? (codes.get(officeId) ?? null) : null),
    () => null,
  );
  useEffect(() => {
    if (officeId) load(officeId);
  }, [officeId]);
  return code ? invitePath(code) : null;
}

/** An admin resets the link: the old one stops working at once. */
export async function resetInviteLink(officeId: string): Promise<void> {
  const { code } = await api.resetInviteLink(officeId);
  codes.set(officeId, code);
  changed();
}
