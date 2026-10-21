"use client";

import { useEffect, useState } from "react";
import { api, type PersonProfile } from "@/lib/api";

/** How long a profile is trusted before a card asks again: what someone is listening to changes. */
const FRESH_MS = 60_000;

/** Profiles already looked up, so opening someone twice in a minute doesn't ask twice. */
const profiles = new Map<string, { at: number; profile: Promise<PersonProfile | null> }>();

function profileOf(id: string): Promise<PersonProfile | null> {
  const known = profiles.get(id);
  if (known && Date.now() - known.at < FRESH_MS) return known.profile;
  const profile = api.person(id).then(({ person }) => person, () => null);
  profiles.set(id, { at: Date.now(), profile });
  return profile;
}

/** Forgets someone's profile, so the next card shows what changed (yours, after you edit it). */
export function forgetPerson(id: string) {
  profiles.delete(id);
}

/** Someone's profile for a card, or null until it has come (or for a guest, or when it can't). */
export function usePerson(id: string | null): PersonProfile | null {
  const [found, setFound] = useState<{ id: string; profile: PersonProfile | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    profileOf(id).then((profile) => !cancelled && setFound({ id, profile }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return found && found.id === id ? found.profile : null;
}
