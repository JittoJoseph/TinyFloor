"use client";

import React, { useCallback, useEffect, useEffectEvent, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * The latest token, and a way to wait for one: the check usually finishes before
 * anyone submits, but a quick submit waits up to a few seconds for it.
 */
export function useTurnstileToken() {
  const resetWidget = useRef<(() => void) | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<((token: string | null) => void) | null>(null);

  const onToken = useCallback((next: string | null) => {
    token.current = next;
    if (next && waiting.current) {
      waiting.current(next);
      waiting.current = null;
    }
  }, []);

  const waitForToken = useCallback(
    () =>
      token.current
        ? Promise.resolve(token.current)
        : new Promise<string | null>((resolve) => {
            waiting.current = resolve;
            setTimeout(() => {
              if (waiting.current === resolve) {
                waiting.current = null;
                resolve(null);
              }
            }, 8000);
          }),
    [],
  );

  /** Tokens work once, so after using one, get the next. */
  const reset = useCallback(() => {
    token.current = null;
    resetWidget.current?.();
  }, []);

  const register = useCallback((resetFn: (() => void) | null) => {
    resetWidget.current = resetFn;
  }, []);

  return { onToken, waitForToken, reset, register };
}

export type TurnstileController = ReturnType<typeof useTurnstileToken>;

let scriptLoading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/**
 * Cloudflare's bot check. In managed mode most people never see it; it only
 * shows a checkbox when Cloudflare isn't sure. The token arrives through onToken.
 */
export function Turnstile({
  controller,
  action,
  className,
}: {
  controller: TurnstileController;
  action?: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const emitToken = useEffectEvent((token: string | null) => controller.onToken(token));
  const { register } = controller;

  useEffect(() => {
    register(() => {
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    });
    return () => register(null);
  }, [register]);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widget.current = turnstile.render(container.current, {
          sitekey: SITE_KEY,
          action,
          appearance: "interaction-only",
          theme: "light",
          callback: (token: string) => emitToken(token),
          "expired-callback": () => emitToken(null),
          "error-callback": () => emitToken(null),
        });
      })
      .catch(() => emitToken(null));

    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [action]);

  return <div ref={container} className={className} />;
}
