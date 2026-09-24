"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import { api, type SessionUser } from "@/lib/api";
import { readIdentity } from "@/lib/identity";
import { posthogLog } from "@/lib/posthog-log";

const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  /** Signed in, as an account or a guest. */
  isAuthenticated: boolean;
  isGuest: boolean;
  /** Signed in with an account (not a guest). */
  hasAccount: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signInWithGoogle: (from: { code: string } | { credential: string }) => Promise<SessionUser>;
  signUp: (details: { email: string; password: string; turnstileToken: string }) => Promise<SessionUser>;
  continueAsGuest: (details: { name: string; character: string; turnstileToken: string }) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  updateProfile: (changes: { displayName?: string; character?: string; link?: string; introduced?: boolean }) => Promise<SessionUser>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const identifiedUserId = useRef<string | null>(null);

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
    if (!posthogConfigured) return;

    if (!user) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      return;
    }

    if (identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) posthog.reset();

    posthog.identify(user.id, {
      ...(user.email ? { email: user.email } : {}),
      name: user.displayName,
      guest: user.guest,
    });
    identifiedUserId.current = user.id;
  }, [user]);

  // A new account in a browser that has walked in before (as a guest, say) is
  // who it was then: that name and character are its introduction, so the
  // first door doesn't ask again. They can change either on their account.
  const introducing = !!user && !user.guest && user.introduced === false;
  useEffect(() => {
    if (!introducing) return;
    const known = readIdentity();
    if (!known.name.trim()) return;
    let cancelled = false;
    api.updateMe({ displayName: known.name.trim(), character: known.character, introduced: true }).then(
      ({ user: next }) => !cancelled && setUser(next),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [introducing]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isGuest: user?.guest ?? false,
      hasAccount: !!user && !user.guest,
      signIn: async (email, password) => {
        const { user: next } = await api.signIn({ email, password });
        setUser(next);
        if (posthogConfigured) posthog.capture("account_signed_in", { sign_in_method: "password" });
        posthogLog.info("Account sign-in completed");
        return next;
      },
      signInWithGoogle: async (from) => {
        const { user: next } = await api.signInWithGoogle(from);
        setUser(next);
        if (posthogConfigured) posthog.capture("account_signed_in", { sign_in_method: "google" });
        return next;
      },
      signUp: async (details) => {
        const { user: next } = await api.signUp(details);
        setUser(next);
        if (posthogConfigured) posthog.capture("account_signed_up");
        return next;
      },
      continueAsGuest: async (details) => {
        const { user: next } = await api.continueAsGuest(details);
        setUser(next);
        if (posthogConfigured) posthog.capture("guest_session_started");
        return next;
      },
      signOut: async () => {
        try {
          await api.signOut();
        } finally {
          if (posthogConfigured) posthog.reset();
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
    [user, isLoading, refresh],
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
