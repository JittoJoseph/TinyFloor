"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/*
 * "Continue with Google", with Google Identity Services' popup code flow:
 * Google's consent popup hands back a one-time code, and the API trades it for
 * the person's identity with the client secret. A popup code flow always uses
 * the redirect URI "postmessage", so there are no callback pages to register
 * for each language. Shown only when a client ID is configured.
 */

export const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT = "https://accounts.google.com/gsi/client";

type CodeClient = { requestCode: () => void };
type OAuth2 = {
  initCodeClient: (config: {
    client_id: string;
    scope: string;
    ux_mode: "popup";
    callback: (response: { code?: string; error?: string }) => void;
    error_callback?: (error: { type: string }) => void;
  }) => CodeClient;
};
/** One Tap: the account chooser Google shows in the corner, answering with a signed ID token. */
export type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: "signin" | "signup" | "use";
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
  cancel: () => void;
};
type GoogleAccounts = { oauth2: OAuth2; id: GoogleId };

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts };
  }
}

let loading: Promise<GoogleAccounts> | null = null;

/** Loads Google's script once, the first time a button or One Tap needs it. */
export function loadGoogle(): Promise<GoogleAccounts> {
  loading ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts) : reject(new Error("gsi")));
    script.onerror = () => {
      loading = null; // the next button can try again
      reject(new Error("gsi"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export const googleAvailable = Boolean(CLIENT_ID);

export function GoogleButton({
  label,
  onCode,
  onError,
  busy,
}: {
  label: string;
  /** The one-time code, once the person has picked their account and agreed. */
  onCode: (code: string) => void;
  /** Google couldn't be reached, or the popup failed. Closing it isn't an error. */
  onError: () => void;
  busy: boolean;
}) {
  const client = useRef<CodeClient | null>(null);
  const [ready, setReady] = useState(false);
  // The latest handlers, without making a new client each render.
  const handlers = useRef({ onCode, onError });
  useEffect(() => {
    handlers.current = { onCode, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogle().then(
      ({ oauth2 }) => {
        if (cancelled) return;
        client.current = oauth2.initCodeClient({
          client_id: CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: (response) => (response.code ? handlers.current.onCode(response.code) : handlers.current.onError()),
          error_callback: (error) => {
            if (error.type !== "popup_closed") handlers.current.onError();
          },
        });
        setReady(true);
      },
      () => !cancelled && handlers.current.onError(),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) return null;
  return (
    <button
      type="button"
      onClick={() => client.current?.requestCode()}
      disabled={!ready || busy}
      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-border bg-card text-[14px] font-medium text-foreground transition-[background-color,transform] hover:bg-muted active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
      {label}
    </button>
  );
}

/** Google's "G", in its own colours, as Google's guidelines ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
