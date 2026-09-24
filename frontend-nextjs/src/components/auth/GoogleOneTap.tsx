"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CLIENT_ID, loadGoogle } from "./GoogleButton";

/** Where the chooser would be in the way: on a floor, at a door, or somewhere only an account reaches. */
const QUIET = /\/(lobby|office|join|invite|admin|dashboard|account|map-render|og-render)(\/|$)/;
/** Pages that move on by themselves once there is an account. */
const CARRY_ON = /\/(auth|create)(\/|$)/;

/** What to do with the next token: set by whichever render is current, since Google is initialised only once. */
const handler: { current: (credential: string) => void } = { current: () => {} };
let initialized = false;

/**
 * Google One Tap: for someone signed out, Google's own account chooser in the
 * corner of the page (a sheet at the bottom on a phone), one tap from signed
 * in. Google decides whether to show it, and stops for a while once it has
 * been closed. Signing in this way from anywhere but the sign-in or new-office
 * pages goes on to your offices.
 */
export function GoogleOneTap() {
  const { isLoading, hasAccount, signInWithGoogle } = useAuth();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const quiet = QUIET.test(pathname);

  useEffect(() => {
    handler.current = (credential) => {
      signInWithGoogle({ credential }).then(
        () => {
          if (!CARRY_ON.test(pathname)) router.push("/dashboard");
        },
        // Google's own button and the sign-in form still work; One Tap simply didn't.
        () => {},
      );
    };
  });

  useEffect(() => {
    const clientId = CLIENT_ID;
    if (!clientId || isLoading || hasAccount || quiet) return;
    let cancelled = false;
    let google: Awaited<ReturnType<typeof loadGoogle>> | null = null;
    loadGoogle().then(
      (accounts) => {
        if (cancelled) return;
        google = accounts;
        if (!initialized) {
          initialized = true;
          accounts.id.initialize({
            client_id: clientId,
            callback: ({ credential }) => credential && handler.current(credential),
            auto_select: false,
            cancel_on_tap_outside: false,
            context: "signin",
            itp_support: true,
            use_fedcm_for_prompt: true,
          });
        }
        accounts.id.prompt();
      },
      () => {},
    );
    return () => {
      cancelled = true;
      google?.id.cancel();
    };
  }, [isLoading, hasAccount, quiet]);

  return null;
}
