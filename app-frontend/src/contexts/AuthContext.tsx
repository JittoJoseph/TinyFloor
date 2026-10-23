"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { analyticsConfigured, withPostHog } from "@/lib/analytics";
import { api, type ProfileChanges, type SessionUser } from "@/lib/api";
import { readIdentity } from "@/lib/identity";
import { browserZone } from "@/lib/timeZone";
import { setMusicOwner } from "@/lib/music";
import { adoptMyNote } from "@/lib/floor";
import { handTicket } from "@/lib/handedTicket";
import { posthogLog } from "@/lib/posthog-log";
import { recallSession, rememberSession } from "@/lib/session-hint";
import { rememberAccount } from "@/lib/accountHint";

interface AuthContextType {
  user: SessionUser | null;
  /** Until the session is known, and while a new account takes on the name this browser already had. */
  isLoading: boolean;
  /** Signed in, as an account or a guest. */
  isAuthenticated: boolean;
  isGuest: boolean;
  /** Signed in with an account (not a guest). */
  hasAccount: boolean;
  /** Signs in with the code emailed to the address, making the account the first time. */
  signInWithCode: (email: string, code: string) => Promise<{ user: SessionUser; created: boolean }>;
  /** `method` says which way in, for PostHog: the button ("google") or One Tap ("google_one_tap"). */
  signInWithGoogle: (from: { code: string } | { credential: string }, method?: string) => Promise<{ user: SessionUser; created: boolean }>;
  continueAsGuest: (details: { name: string; character: string; turnstileToken: string }) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  updateProfile: (changes: ProfileChanges) => Promise<SessionUser>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  // Your status note comes with your account; the floor and your menu read it from there.
  useEffect(() => adoptMyNote(user && !user.guest ? (user.status ?? null) : null), [user]);
  const [isLoading, setIsLoading] = useState(true);
  const [introduceFailed, setIntroduceFailed] = useState(false);
  const identifiedUserId = useRef<string | null>(null);

  useLayoutEffect(recallSession, []);
  // What you play shows on your card; yours is refreshed the moment it changes.
  useEffect(() => setMusicOwner(user?.id ?? null), [user?.id]);
  useEffect(() => {
    if (isLoading) return;
    rememberSession(!!user);
    // An account's, not a guest's: the site's pages keep One Tap away from it (components/auth/GoogleOneTap).
    rememberAccount(!!user && !user.guest);
  }, [isLoading, user]);

  // Offline or the API is down: treated as signed out, and pages that need a
  // session say so when their own requests fail.
  const refresh = useCallback(
    () =>
      api.session().then(
        ({ user: current }) => {
          setUser(current);
          setIsLoading(false);
        },
        () => {
          setUser(null);
          setIsLoading(false);
        },
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    api.session().then(
      ({ user: current }) => {
        if (cancelled) return;
        setUser(current);
        setIsLoading(false);
      },
      () => {
        if (cancelled) return;
        setUser(null);
        setIsLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep PostHog's persisted browser identity in sync with the authenticated
  // session. This runs after initial session restoration as well as sign-in.
  useEffect(() => {
    if (!analyticsConfigured) return;

    if (!user) {
      if (identifiedUserId.current) {
        withPostHog((posthog) => posthog.reset());
        identifiedUserId.current = null;
      }
      return;
    }

    if (identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) withPostHog((posthog) => posthog.reset());

    const traits = {
      ...(user.email ? { email: user.email } : {}),
      name: user.displayName,
      guest: user.guest,
    };
    withPostHog((posthog) => posthog.identify(user.id, traits));
    identifiedUserId.current = user.id;
  }, [user]);

  // A new account in a browser that has walked in before (as a guest, say) is
  // who it was then: that name and character are its introduction, so the
  // first door doesn't ask again. They can change either on their account.
  // Until then it counts as loading, so the first door isn't shown for a moment and taken away.
  const introducing = !!user && !user.guest && user.introduced === false;
  const known = useMemo(() => (introducing ? readIdentity() : null), [introducing]);
  const autoIntroducing = !!known?.name.trim() && !introduceFailed;
  useEffect(() => {
    if (!known || !known.name.trim()) return;
    let cancelled = false;
    api.updateMe({ displayName: known.name.trim(), character: known.character, introduced: true }).then(
      ({ user: next }) => !cancelled && setUser(next),
      () => !cancelled && setIntroduceFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [known]);

  // Until someone picks a zone, theirs is this browser's: said once when it
  // differs from the one kept, so their local time is right for everyone.
  const zoneSent = useRef<string | null>(null);
  useEffect(() => {
    if (!user || user.timeZoneAuto === false) return;
    const zone = browserZone();
    const key = `${user.id} ${zone}`;
    if (!zone || zone === user.timeZone || zoneSent.current === key) return;
    zoneSent.current = key;
    api.updateMe({ detectedZone: zone }).then(({ user: next }) => setUser(next), () => {});
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading: isLoading || autoIntroducing,
      isAuthenticated: !!user,
      isGuest: user?.guest ?? false,
      hasAccount: !!user && !user.guest,
      signInWithCode: async (email, code) => {
        const { user: next, created } = await api.verifyCode({ email, code });
        setUser(next);
        // The same code makes an account the first time, so a new one counts as a sign-up.
        withPostHog((posthog) => posthog.capture(created ? "account_signed_up" : "account_signed_in", { sign_in_method: "email" }));
        if (!created) posthogLog.info("Account sign-in completed");
        return { user: next, created };
      },
      signInWithGoogle: async (from, method = "google") => {
        const { user: next, created } = await api.signInWithGoogle(from);
        setUser(next);
        // Most accounts are made this way, so a new one counts as a sign-up, not a sign-in.
        withPostHog((posthog) => posthog.capture(created ? "account_signed_up" : "account_signed_in", { sign_in_method: method }));
        return { user: next, created };
      },
      continueAsGuest: async (details) => {
        const { user: next, lobby } = await api.continueAsGuest(details);
        // The demo office's floor, which they're walking onto, takes the ticket that came with them.
        if (lobby) handTicket(lobby);
        setUser(next);
        return next;
      },
      signOut: async () => {
        try {
          await api.signOut();
        } finally {
          withPostHog((posthog) => posthog.reset());
          identifiedUserId.current = null;
          setUser(null);
        }
      },
      updateProfile: async (changes) => {
        const { user: next } = await api.updateMe(changes);
        setUser(next);
        return next;
      },
      refresh,
    }),
    [user, isLoading, autoIntroducing, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
