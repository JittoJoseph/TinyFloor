"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type SessionUser } from "@/lib/api";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  /** Signed in, as an account or a guest. */
  isAuthenticated: boolean;
  isGuest: boolean;
  /** Signed in with an account (not a guest). */
  hasAccount: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signInWithGoogle: (code: string) => Promise<SessionUser>;
  signUp: (details: {
    email: string;
    password: string;
    displayName: string;
    character: string;
    turnstileToken: string;
  }) => Promise<SessionUser>;
  continueAsGuest: (details: { name: string; character: string; turnstileToken: string }) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  updateProfile: (changes: { displayName?: string; character?: string }) => Promise<SessionUser>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        return next;
      },
      signInWithGoogle: async (code) => {
        const { user: next } = await api.signInWithGoogle(code);
        setUser(next);
        return next;
      },
      signUp: async (details) => {
        const { user: next } = await api.signUp(details);
        setUser(next);
        return next;
      },
      continueAsGuest: async (details) => {
        const { user: next } = await api.continueAsGuest(details);
        setUser(next);
        return next;
      },
      signOut: async () => {
        try {
          await api.signOut();
        } finally {
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
