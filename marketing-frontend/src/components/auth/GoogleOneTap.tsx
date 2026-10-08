"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { appHref } from "@/lib/site";
import { api } from "@/lib/api";
import { hasAccountHint, rememberAccount } from "@/lib/accountHint";
import { CLIENT_ID, loadGoogle } from "@/components/auth/GoogleButton";

/** How long the page is left to settle before Google's script is fetched: it never competes with the first paint. */
const SETTLE_MS = 2500;

/**
 * Google One Tap on the site's pages (docs/15): Google's own account chooser
 * in the corner (a sheet at the bottom on a phone), one tap from an account.
 *
 * It costs our worker nothing until someone taps. Whether to show it comes
 * from this browser alone (has it signed in to an account before?), not from
 * asking the API, and the chooser itself is Google's script talking to Google.
 * Only a chosen account reaches the API, once, to sign in. Google decides
 * whether to show it at all, and stays quiet for a while once it's closed.
 */
export function GoogleOneTap() {
  const locale = useLocale();

  useEffect(() => {
    const clientId = CLIENT_ID;
    if (!clientId || hasAccountHint()) return;
    let cancelled = false;
    let cancel: (() => void) | null = null;

    const start = () =>
      loadGoogle().then(
        (google) => {
          if (cancelled) return;
          google.id.initialize({
            client_id: clientId,
            callback: ({ credential }) => {
              if (!credential) return;
              api.signInWithGoogle({ credential }).then(
                () => {
                  rememberAccount(true);
                  // Signed in on the app's cookie too (.tinyfloor.com): on to your office there.
                  window.location.assign(appHref(locale, "/"));
                },
                // The button on the sign-in page still works; One Tap simply didn't this time.
                () => {},
              );
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            context: "signin",
            itp_support: true,
            use_fedcm_for_prompt: true,
          });
          google.id.prompt();
          cancel = () => google.id.cancel();
        },
        () => {},
      );

    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 3000 });
      else start();
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancel?.();
    };
  }, [locale]);

  return null;
}
